import { useState, useEffect, useMemo } from 'react'
import { Hexagon, Plus, Trash2, X, Save, Car } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../api/client.js'
import { LoadingStyles, Spinner, LoadingBar, SkeletonRows, SavingOverlay } from '../components/Loading.jsx'
import { useConfirm, useToast } from '../components/ui/UIProvider.jsx'

const B='#1B6BB5', G='#059669', R='#DC2626'
const BLANK={name:'',type:'Circle',radius:500,enabled:true,lat:'',lng:''}
const POLL_MS = 12000   // how often vehicle positions refresh, to keep "inside" status current

/* ── Geometry helpers ─────────────────────────────────────────── */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R_EARTH = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Ray-casting point-in-polygon — used for both Polygon and Rectangle types
function pointInPolygon(lat, lng, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const { lat: yi, lng: xi } = points[i]
    const { lat: yj, lng: xj } = points[j]
    const intersects = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function isVehicleInside(vehicle, geofence) {
  const lat = Number(vehicle.lat), lng = Number(vehicle.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false

  if (geofence.type === 'Circle') {
    if (!geofence.center) return false
    return haversineMeters(lat, lng, geofence.center.lat, geofence.center.lng) <= Number(geofence.radius || 0)
  }
  // Polygon / Rectangle
  const pts = Array.isArray(geofence.coordinates) ? geofence.coordinates : []
  if (pts.length < 3) return false
  return pointInPolygon(lat, lng, pts)
}

export default function Geofences() {
  const { data:geofences, setData:setGeofences, loading } = useApi(api.geofences.list)
  const { data:vehicles, reload:reloadVehicles } = useApi(api.vehicles.list)
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const confirm = useConfirm()
  const toast   = useToast()

  // Keep vehicle positions current without a full-page loading flicker
  useEffect(() => {
    const t = setInterval(() => reloadVehicles(true), POLL_MS)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  const filtered = geofences.filter(g=>!search||g.name?.toLowerCase().includes(search.toLowerCase()))
  const fld=(k,v)=>setForm(f=>({...f,[k]:v}))

  // Which vehicles are currently inside each geofence — recomputed whenever either list changes
  const insideByGeofence = useMemo(() => {
    const map = {}
    for (const g of geofences) {
      map[g.geofence_id] = vehicles.filter(v => isVehicleInside(v, g))
    }
    return map
  }, [geofences, vehicles])

  const save=async()=>{
    if(!form.name){ toast('Geofence name is required', 'warning'); return }
    setSaving(true)
    try{
      // Backend stores center_lat/center_lng (read back as a `center` object) — not flat lat/lng.
      const { lat, lng, ...rest } = form
      const payload = {
        ...rest,
        center: (lat !== '' && lng !== '') ? { lat: Number(lat), lng: Number(lng) } : undefined,
      }
      const r=await api.geofences.create(payload)
      setGeofences(p=>[...p,r])
      setModal(false)
      setForm(BLANK)
      toast('Geofence added', 'success')
    }catch(e){ toast(e.message || 'Something went wrong', 'error') }
    finally{ setSaving(false) }
  }

  const del=async id=>{
    const ok = await confirm('This geofence will be permanently removed. This cannot be undone.', {
      title: 'Delete geofence?', danger: true, confirmLabel: 'Delete',
    })
    if(!ok) return
    try{
      await api.geofences.delete(id)
      setGeofences(p=>p.filter(g=>g.geofence_id!==id))
      toast('Geofence deleted', 'success')
    }catch(e){ toast(e.message || 'Failed to delete geofence', 'error') }
  }

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24, fontWeight:800, color:'#0F172A' }}>Geofences</div>
            {loading && <Spinner size={20}/>}
          </div>
          <div style={{ color:'#64748B', fontSize:14, marginTop:4 }}>{geofences.length} geofences configured</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search geofences..."
            style={{ padding:'9px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', width:220 }}/>
          <button type="button" onClick={()=>setModal(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:B, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
            <Plus size={16}/> Add Geofence
          </button>
        </div>
      </div>
      <LoadingBar show={loading}/>

      <div style={{ background:'white', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['Name','Type','Radius','Coordinates','Vehicles Inside','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748B', letterSpacing:.5, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows n={4} cols={['20%','12%','10%','20%','18%','10%','10%']}/>
            ) : filtered.map(g=>{
              const inside = insideByGeofence[g.geofence_id] || []
              return (
              <tr key={g.geofence_id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}><Hexagon size={17} color={B}/></div>
                    <span style={{ fontWeight:700, color:'#0F172A' }}>{g.name}</span>
                  </div>
                </td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13 }}>{g.type}</td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13 }}>{g.radius}m</td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:12, fontFamily:'monospace' }}>
                  {g.center?.lat!=null && g.center?.lng!=null ? `${Number(g.center.lat).toFixed(4)}, ${Number(g.center.lng).toFixed(4)}` : '—'}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  {!g.enabled ? (
                    <span style={{ color:'#CBD5E1', fontSize:12 }}>Geofence disabled</span>
                  ) : inside.length === 0 ? (
                    <span style={{ color:'#94A3B8', fontSize:12 }}>None</span>
                  ) : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#ECFDF5', color:G, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                        <Car size={11}/> {inside.length}
                      </span>
                      {inside.slice(0,2).map(v => (
                        <span key={v.imei || v.vehicle_id} style={{ fontSize:11.5, color:'#0F172A', fontWeight:600 }}>{v.name}</span>
                      ))}
                      {inside.length > 2 && (
                        <span style={{ fontSize:11, color:'#94A3B8' }}>+{inside.length - 2} more</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{ background:g.enabled?'#ECFDF5':'#FEF2F2', color:g.enabled?G:R, fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>{g.enabled?'Active':'Disabled'}</span>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <button type="button" onClick={()=>del(g.geofence_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:R, fontSize:12, fontWeight:600 }}>
                    <Trash2 size={13}/> Delete
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {!loading && filtered.length===0 && <div style={{ textAlign:'center', padding:52, color:'#94A3B8' }}>No geofences found</div>}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:18, width:460, position:'relative' }}>
            <SavingOverlay show={saving}/>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:800, fontSize:18, color:'#0F172A' }}>Add Geofence</div>
              <button type="button" onClick={()=>setModal(false)} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Geofence Name *</label>
                <input value={form.name} onChange={e=>fld('name',e.target.value)} placeholder="e.g. Phnom Penh HQ"
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Type</label>
                  <select value={form.type} onChange={e=>fld('type',e.target.value)}
                    style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', background:'white' }}>
                    {['Circle','Polygon','Rectangle'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Radius (meters)</label>
                  <input type="number" value={form.radius} onChange={e=>fld('radius',Number(e.target.value))} min={50} max={50000}
                    style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Latitude','lat','11.5564'],['Longitude','lng','104.9282']].map(([l,k,p])=>(
                  <div key={k}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>{l}</label>
                    <input type="number" step="0.0001" value={form[k]} onChange={e=>fld(k,e.target.value)} placeholder={p}
                      style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                ))}
              </div>
              {form.type !== 'Circle' && (
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'11px 14px', color:'#92400E', fontSize:12 }}>
                  Polygon/Rectangle shapes need multiple corner points, which this simple form doesn't collect yet — "vehicles inside" won't detect anything for this geofence until it has real coordinates.
                </div>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={form.enabled} onChange={e=>fld('enabled',e.target.checked)} style={{ width:16, height:16 }}/>
                <span style={{ fontSize:14, color:'#0F172A', fontWeight:500 }}>Enable geofence alert</span>
              </label>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #E2E8F0', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setModal(false)} style={{ padding:'10px 20px', background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', color:'#64748B' }}>Cancel</button>
              <button type="button" onClick={save} disabled={saving||!form.name}
                style={{ padding:'10px 24px', background:B, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, opacity:!form.name?.6:1 }}>
                {saving?<><Spinner size={16} color="white"/>Saving...</>:<><Save size={15}/>Add Geofence</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}