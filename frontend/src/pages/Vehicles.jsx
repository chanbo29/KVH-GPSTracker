import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Save,
  Car, Activity, WifiOff, Clock,
  Gauge, Battery, Wifi, Cpu, User,
  CheckCircle, AlertCircle, Wrench,
} from 'lucide-react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import {
  LoadingStyles, Spinner, LoadingBar, Skel, SkeletonRows, SavingOverlay,
} from '../components/Loading.jsx'
import { useConfirm, useToast } from '../components/ui/UIProvider.jsx'

const B = '#1B6BB5', G = '#059669', R = '#DC2626', A = '#D97706', NAVY = '#0F172A'
const BORDER   = '1px solid #E2E8F0'
const TYPES    = ['Sedan','SUV','Truck','Van','Motorcycle','Bus','Other']
const PROTOCOLS= ['GT06','TK103','H02','GT02','Other']
const BLANK    = { name:'', type:'Sedan', plate:'', driver:'', imei:'', sim_number:'', protocol:'GT06' }

/* ── Status helpers ─────────────────────────────────────── */
const sColor = s => s==='moving'?G:s==='stopped'?A:'#94A3B8'
const sBg    = s => s==='moving'?'#D1FAE5':s==='stopped'?'#FEF3C7':'#F1F5F9'
const sBorder= s => s==='moving'?'#A7F3D0':s==='stopped'?'#FDE68A':'#E2E8F0'

/* ── Stat card (clickable filter) ─────────────────────── */
const StatCard = ({ label, value, icon:Icon, color, bg, active, onClick }) => (
  <div onClick={onClick}
    style={{ background: active?color:'white', borderRadius:14, padding:'18px 20px', border: active?`2px solid ${color}`:BORDER, display:'flex', alignItems:'center', gap:14, cursor:onClick?'pointer':'default', transition:'all .2s', boxShadow: active?`0 4px 16px ${color}33`:'0 1px 3px rgba(0,0,0,.04)' }}
    onMouseEnter={e=>{ if(onClick&&!active) e.currentTarget.style.borderColor=color }}
    onMouseLeave={e=>{ if(onClick&&!active) e.currentTarget.style.borderColor='#E2E8F0' }}>
    <div style={{ width:44, height:44, borderRadius:12, background:active?'rgba(255,255,255,.22)':bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon size={20} color={active?'white':color}/>
    </div>
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:active?'rgba(255,255,255,.7)':'#94A3B8', textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:active?'white':NAVY }}>{value}</div>
    </div>
  </div>
)

/* ── Mini stat pill ─────────────────────────────────────── */
const MiniStat = ({ icon:Icon, value, color }) => (
  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px 3px 3px', borderRadius:20, background:'white', border:`1px solid ${color}2A` }}>
    <div style={{ width:16, height:16, borderRadius:'50%', background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon size={9} color={color}/>
    </div>
    <span style={{ fontSize:11, fontWeight:700, color }}>{value}</span>
  </div>
)

/* ── Form field pieces — module scope, NOT inside the component,   ── */
/* ── so they don't get recreated (and lose input focus) on re-render ── */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#64748B', marginBottom:7, textTransform:'uppercase', letterSpacing:.4 }}>{label}</label>
      {children}
    </div>
  )
}
function FInput({ value, onChange, placeholder, type='text', mono }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E2E8F0', borderRadius:11, fontSize:14, color:NAVY, outline:'none', boxSizing:'border-box', background:'#FAFAFA', transition:'border .15s', fontFamily:mono?'monospace':'inherit' }}
      onFocus={e=>{e.target.style.borderColor=B;e.target.style.background='#EFF6FF'}}
      onBlur={e =>{e.target.style.borderColor='#E2E8F0';e.target.style.background='#FAFAFA'}}/>
  )
}
function FSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E2E8F0', borderRadius:11, fontSize:14, color:NAVY, outline:'none', background:'#FAFAFA', boxSizing:'border-box' }}>
      {children}
    </select>
  )
}

/* ── Searchable driver picker — type to filter by name or phone ── */
function DriverPicker({ drivers, value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const selected = drivers.find(d => d.name === value)

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase()
    return !q || d.name?.toLowerCase().includes(q) || d.phone?.includes(q)
  })

  useEffect(() => {
    const onClickOutside = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => { if (open) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8,
          padding:'12px 14px', border:'1.5px solid #E2E8F0', borderRadius:11, background:'#FAFAFA',
          cursor:'pointer', fontSize:14, color: value ? NAVY : '#94A3B8', textAlign:'left', boxSizing:'border-box',
        }}
      >
        <User size={14} color="#94A3B8" style={{ flexShrink:0 }}/>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {value || 'Unassigned'}
        </span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'white', border:'1.5px solid #E2E8F0', borderRadius:10, boxShadow:'0 12px 32px rgba(0,0,0,.14)', zIndex:50, overflow:'hidden' }}>
          <div style={{ padding:8, borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:8, background:'#F8FAFC' }}>
            <Search size={13} color="#94A3B8" style={{ flexShrink:0 }}/>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search driver name or phone…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'none', color:NAVY }}
            />
          </div>
          <div style={{ maxHeight:200, overflowY:'auto' }}>
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'none', background: value===''?'#EFF6FF':'white', cursor:'pointer', textAlign:'left', color:'#94A3B8', fontSize:13 }}
              onMouseEnter={e => { if (value!=='') e.currentTarget.style.background = '#F8FAFC' }}
              onMouseLeave={e => { if (value!=='') e.currentTarget.style.background = 'white' }}
            >
              Unassigned
            </button>
            {filtered.length === 0 ? (
              <div style={{ padding:'14px', color:'#94A3B8', fontSize:13, textAlign:'center' }}>No drivers match "{search}"</div>
            ) : filtered.map(d => (
              <button
                key={d.driver_id}
                onClick={() => { onChange(d.name); setOpen(false) }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'none', background: d.name===value?'#EFF6FF':'white', cursor:'pointer', textAlign:'left' }}
                onMouseEnter={e => { if (d.name!==value) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (d.name!==value) e.currentTarget.style.background = 'white' }}
              >
                <div style={{ width:26, height:26, borderRadius:'50%', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <User size={12} color={B}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                  {d.phone && <div style={{ fontSize:11, color:'#94A3B8' }}>{d.phone}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function Vehicles({ onNavigate }) {
  const { data:vehicles, setData:setVehicles, loading } = useApi(api.vehicles.list)
  const { data:drivers  } = useApi(api.drivers.list)
  const { data:devices  } = useApi(api.devices.list)
  const { data:maintLogs } = useApi(api.maintenance.list)
  const confirm = useConfirm()
  const toast   = useToast()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [gpsFilter, setGpsFilter] = useState('all')       // all | has | none
  const [maintFilter, setMaintFilter] = useState('all')   // all | needs
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(BLANK)
  const [editId, setEditId] = useState(null)   // lookup value for the update URL: the vehicle's ORIGINAL imei, or its vehicle_id when it has no imei yet
  const [editVehicleId, setEditVehicleId] = useState(null)   // the vehicle's permanent vehicle_id — used to match it back up in local state after saving
  const [saving, setSaving] = useState(false)

  const fld  = (k,v) => setForm(f=>({...f,[k]:v}))
  const fmtSIM = raw => {
    const d = raw.replace(/\D/g,'').slice(0,9)
    if(d.length>6) return d.slice(0,3)+'-'+d.slice(3,6)+'-'+d.slice(6)
    if(d.length>3) return d.slice(0,3)+'-'+d.slice(3)
    return d
  }

  /* ── Stats ─────────────────────────────────────────── */
  const stats = useMemo(()=>({
    total:   vehicles.length,
    moving:  vehicles.filter(v=>v.status==='moving').length,
    stopped: vehicles.filter(v=>v.status==='stopped').length,
    offline: vehicles.filter(v=>v.status==='offline').length,
  }),[vehicles])

  /* ── Filtered ───────────────────────────────────────── */
  /* ── Does this vehicle have a scheduled or overdue maintenance record? ── */
  const needsMaintenance = vehicleId => maintLogs.some(l =>
    String(l.vehicle_id) === String(vehicleId) && (l.status === 'overdue' || l.status === 'scheduled')
  )

  const filtered = useMemo(()=>vehicles.filter(v=>{
    const q = search.toLowerCase()
    const mS = !q || v.name?.toLowerCase().includes(q) || v.plate?.toLowerCase().includes(q) || v.owner?.toLowerCase().includes(q) || v.type?.toLowerCase().includes(q)
    const mF = filter==='all' || v.status===filter
    const mG = gpsFilter==='all' || (gpsFilter==='has' ? !!v.imei : !v.imei)
    const mM = maintFilter==='all' || needsMaintenance(v.vehicle_id)
    return mS && mF && mG && mM
  }),[vehicles,search,filter,gpsFilter,maintFilter,maintLogs])

  /* ── IMEIs already linked to another vehicle (excludes the one being edited) ── */
  const usedImeis = useMemo(() => new Set(
    vehicles
      .filter(v => v.imei && v.imei !== editId)   // editId holds the CURRENT vehicle's own original imei while editing
      .map(v => v.imei)
  ), [vehicles, editId])

  /* ── Modals ─────────────────────────────────────────── */
  const openAdd  = ()  => { setForm(BLANK); setEditId(null); setEditVehicleId(null); setModal('add') }
  const openEdit = v   => {
    const dev = devices.find(d=>d.imei===v.imei)
    setForm({ name:v.name||'', type:v.type||'Sedan', plate:v.plate||'', driver:v.owner||'', imei:v.imei||'', sim_number:dev?.sim_number||'', protocol:dev?.protocol||'GT06' })
    // Backend looks vehicles up by IMEI, not vehicle_id — but a vehicle with no
    // device attached has no IMEI to look up by, so fall back to its vehicle_id.
    setEditId(v.imei || v.vehicle_id)
    setEditVehicleId(v.vehicle_id)
    setModal('edit')
  }
  const close = () => { setModal(null); setForm(BLANK); setEditId(null); setEditVehicleId(null) }

  /* ── Save ───────────────────────────────────────────── */
  const save = async () => {
    if (!form.name.trim() || !form.plate.trim()) { toast('Name and plate are required', 'warning'); return }
    setSaving(true)
    try {
      if (modal==='add') {
        const r = await api.vehicles.create({ ...form, name:form.name.trim(), plate:form.plate.trim(), owner:form.driver, status:'offline', speed:0, battery:100, signal:5, lat:0, lng:0 })
        setVehicles(p=>[r,...p])
        toast('Vehicle added', 'success')
      } else {
        // editId is the vehicle's ORIGINAL imei (fixed at openEdit) — used only to address the URL.
        // form.imei may hold a newly-selected device's IMEI if the user changed the assignment;
        // that new value is sent in the body, same as before.
        await api.vehicles.update(editId, { name:form.name.trim(), type:form.type, plate:form.plate.trim(), owner:form.driver, imei:form.imei })
        if (form.imei) {
          const dev = devices.find(d=>d.imei===form.imei)
          if (dev) await api.devices.update(dev.device_id, { sim_number:form.sim_number, protocol:form.protocol })
        }
        setVehicles(p=>p.map(v=>v.vehicle_id===editVehicleId?{...v,...form,owner:form.driver}:v))
        toast('Changes saved', 'success')
      }
      close()
    } catch(e) { toast(e.message || 'Something went wrong', 'error') }
    finally { setSaving(false) }
  }

  const del = async vehicle => {
    const ok = await confirm('This vehicle will be permanently removed. This cannot be undone.', {
      title: 'Delete vehicle?', danger: true, confirmLabel: 'Delete',
    })
    if (!ok) return
    // Normally looked up by IMEI, but a vehicle with no device attached has no
    // IMEI to look up by, so fall back to its numeric vehicle_id (backend accepts both).
    const lookupId = vehicle.imei || vehicle.vehicle_id
    try {
      await api.vehicles.delete(lookupId)
      setVehicles(p=>p.filter(v=>v.vehicle_id!==vehicle.vehicle_id))
      toast('Vehicle deleted', 'success')
    }
    catch(e) { toast(e.message || 'Failed to delete vehicle', 'error') }
  }

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <LoadingStyles/>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:NAVY, letterSpacing:-.3 }}>Vehicles</h1>
            {loading && <Spinner size={20}/>}
          </div>
          <p style={{ margin:'4px 0 0', color:'#94A3B8', fontSize:14 }}>{loading?'Loading…':`${stats.total} vehicles registered`}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {onNavigate && (
            <button onClick={() => onNavigate('maintenance')}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'white', color:'#D97706', border:'1.5px solid #FDE68A', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              <Wrench size={16}/> Log Maintenance
            </button>
          )}
          <button onClick={openAdd}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 22px', background:`linear-gradient(135deg,#0F3460,${B})`, color:'white', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 16px ${B}44` }}>
            <Plus size={16}/> Add Vehicle
          </button>
        </div>
      </div>
      <LoadingBar show={loading}/>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {loading ? [0,1,2,3].map(i=>(
          <div key={i} style={{ background:'white', borderRadius:14, padding:'18px 20px', border:BORDER, display:'flex', gap:14 }}>
            <Skel w={44} h={44} r={12}/><div style={{ flex:1 }}><Skel h={11} r={5} style={{ marginBottom:8 }}/><Skel w="40%" h={24} r={6}/></div>
          </div>
        )) : (<>
          <StatCard label="All Vehicles" value={stats.total}   icon={Car}      color={B}       bg="#EFF6FF" active={filter==='all'}     onClick={()=>setFilter('all')}/>
          <StatCard label="Moving"       value={stats.moving}  icon={Activity} color={G}       bg="#D1FAE5" active={filter==='moving'}  onClick={()=>setFilter('moving')}/>
          <StatCard label="Stopped"      value={stats.stopped} icon={Clock}    color={A}       bg="#FEF3C7" active={filter==='stopped'} onClick={()=>setFilter('stopped')}/>
          <StatCard label="Offline"      value={stats.offline} icon={WifiOff}  color="#94A3B8" bg="#F1F5F9" active={filter==='offline'} onClick={()=>setFilter('offline')}/>
        </>)}
      </div>

      {/* ── Table card ─────────────────────────────────── */}
      <div style={{ background:'white', borderRadius:16, border:BORDER, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>

        {/* Toolbar */}
        <div style={{ padding:'16px 20px', borderBottom:BORDER, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:10, padding:'9px 14px', border:BORDER }}>
            <Search size={14} color="#94A3B8"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, plate, driver, type…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:NAVY, background:'none' }}/>
            {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex' }}><X size={13}/></button>}
          </div>
          {/* Status pills */}
          <div style={{ display:'flex', gap:4, background:'#F8FAFC', borderRadius:10, padding:3, border:BORDER, flexShrink:0 }}>
            {[['all','All'],['moving','Moving'],['stopped','Stopped'],['offline','Offline']].map(([id,l])=>(
              <button key={id} onClick={()=>setFilter(id)}
                style={{ padding:'6px 13px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:filter===id?700:400, background:filter===id?NAVY:'transparent', color:filter===id?'white':'#64748B', transition:'all .15s', whiteSpace:'nowrap' }}>
                {l}
              </button>
            ))}
          </div>

          {/* GPS filter */}
          <select value={gpsFilter} onChange={e=>setGpsFilter(e.target.value)}
            style={{ padding:'8px 12px', border:BORDER, borderRadius:9, fontSize:12, color:NAVY, outline:'none', background:'white', flexShrink:0 }}>
            <option value="all">Any GPS status</option>
            <option value="has">Has GPS device</option>
            <option value="none">No GPS device</option>
          </select>

          {/* Maintenance filter */}
          <select value={maintFilter} onChange={e=>setMaintFilter(e.target.value)}
            style={{ padding:'8px 12px', border:BORDER, borderRadius:9, fontSize:12, color:NAVY, outline:'none', background:'white', flexShrink:0 }}>
            <option value="all">Any maintenance status</option>
            <option value="needs">Needs maintenance</option>
          </select>

          <div style={{ color:'#94A3B8', fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} result{filtered.length!==1?'s':''}</div>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Vehicle','Plate / Type','Driver','Status','Live Data','Actions'].map(h=>(
                  <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748B', letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows n={6} cols={['22%','16%','16%','13%','20%','13%']}/> : (
                filtered.map((v,i)=>(
                  <tr key={v.vehicle_id}
                    style={{ borderBottom:i<filtered.length-1?'1px solid #F8FAFC':'none', borderLeft:'3px solid transparent', transition:'background .12s, border-color .12s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#FAFBFD'; e.currentTarget.style.borderLeftColor=B }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderLeftColor='transparent' }}>

                    {/* Vehicle */}
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:11, background:sBg(v.status), border:`1px solid ${sBorder(v.status)}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Car size={19} color={sColor(v.status)}/>
                        </div>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontWeight:700, color:NAVY, fontSize:14 }}>{v.name}</span>
                            {needsMaintenance(v.vehicle_id) && (
                              <span title="Needs maintenance" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:5, background:'#FFFBEB', border:'1px solid #FDE68A' }}>
                                <Wrench size={10} color="#D97706"/>
                              </span>
                            )}
                          </div>
                          <div style={{ color:'#94A3B8', fontSize:11, marginTop:1, fontFamily:'monospace' }}>{v.imei?'IMEI ···'+v.imei.slice(-4):'No device'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plate / Type */}
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>{v.plate}</div>
                      <div style={{ color:'#94A3B8', fontSize:12, marginTop:2 }}>{v.type||'—'}</div>
                    </td>

                    {/* Driver */}
                    <td style={{ padding:'14px 20px' }}>
                      {v.owner && v.owner!=='Unassigned' ? (
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px', background:'#EFF6FF', color:B, borderRadius:20, fontSize:12, fontWeight:600, border:'1px solid #BFDBFE' }}>
                          <User size={11}/>{v.owner}
                        </div>
                      ) : <span style={{ color:'#CBD5E1', fontSize:13 }}>Unassigned</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding:'14px 20px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:700, background:sBg(v.status), color:sColor(v.status), border:`1px solid ${sBorder(v.status)}` }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:sColor(v.status), display:'inline-block' }}/>
                        {v.status.charAt(0).toUpperCase()+v.status.slice(1)}
                      </span>
                    </td>

                    {/* Live data */}
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <MiniStat icon={Gauge}   value={`${Math.round(v.speed||0)} km/h`} color={v.speed>0?G:'#94A3B8'}/>
                        <MiniStat icon={Battery} value={`${v.battery||0}%`}               color={v.battery<20?R:G}/>
                        <MiniStat icon={Wifi}    value={`${v.signal||0}/5`}                color={B}/>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>openEdit(v)}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', background:'#EFF6FF', border:'none', borderRadius:8, cursor:'pointer', color:B, fontSize:12, fontWeight:600 }}>
                          <Edit size={12}/> Edit
                        </button>
                        {/* del() looks up by imei, falling back to vehicle_id for vehicles with no device attached */}
                        <button onClick={()=>del(v)}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', background:'#FEF2F2', border:'none', borderRadius:8, cursor:'pointer', color:R, fontSize:12, fontWeight:600 }}>
                          <Trash2 size={12}/> Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Empty */}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:'52px 20px' }}>
            <div style={{ width:60, height:60, borderRadius:18, background:'#EFF6FF', border:`1px solid #BFDBFE`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Car size={28} color={B}/>
            </div>
            <div style={{ color:NAVY, fontWeight:700, fontSize:16, marginBottom:6 }}>{search?'No results found':'No vehicles yet'}</div>
            <div style={{ color:'#94A3B8', fontSize:13 }}>{search?`No match for "${search}"`:'Add your first vehicle to get started'}</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'kvh-fade .15s ease-out' }}
          onClick={e=>{ if(e.target===e.currentTarget) close() }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:540, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', maxHeight:'90vh', animation:'kvh-pop .18s cubic-bezier(.2,.9,.3,1.2)' }}>
            <SavingOverlay show={saving}/>
            <div style={{ height:4, background:`linear-gradient(90deg,#0F3460,${B})` }}/>

            <div style={{ padding:'22px 26px 18px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:19, color:NAVY }}>{modal==='add'?'Add New Vehicle':'Edit Vehicle'}</div>
                <div style={{ color:'#94A3B8', fontSize:13, marginTop:3 }}>{modal==='add'?'Fill in the vehicle details':'Update vehicle information'}</div>
              </div>
              <button onClick={close} style={{ width:34, height:34, borderRadius:9, background:'#F8FAFC', border:BORDER, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={15} color="#64748B"/>
              </button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 26px', flex:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <Field label="Vehicle Name *"><FInput value={form.name} onChange={v=>fld('name',v)} placeholder="e.g. KVH-001 Ford"/></Field>
                </div>
                <Field label="Number Plate *"><FInput value={form.plate} onChange={v=>fld('plate',v)} placeholder="e.g. ភ-1234"/></Field>
                <Field label="Vehicle Type">
                  <FSelect value={form.type} onChange={v=>fld('type',v)}>{TYPES.map(t=><option key={t}>{t}</option>)}</FSelect>
                </Field>
                {modal==='edit' && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <Field label="Assign Driver">
                      <DriverPicker drivers={drivers} value={form.driver} onChange={v=>fld('driver',v)}/>
                    </Field>
                  </div>
                )}
              </div>

              {modal==='add' && (
                <div style={{ background:'#F8FAFC', borderRadius:11, padding:'14px', border:BORDER, display:'flex', gap:10, alignItems:'flex-start' }}>
                  <User size={15} color="#94A3B8" style={{ marginTop:1, flexShrink:0 }}/>
                  <div style={{ color:'#64748B', fontSize:12.5 }}>
                    Just the essentials for now — driver assignment and GPS device linking are available once you edit this vehicle.
                  </div>
                </div>
              )}

              {/* GPS device section — only shown when editing, since a device can't be assigned before the vehicle exists */}
              {modal==='edit' && (
              <div style={{ background:'#F8FAFC', borderRadius:12, padding:'16px 16px 16px 18px', border:BORDER, borderLeft:`3px solid ${B}`, marginTop:4 }}>
                <div style={{ color:NAVY, fontWeight:700, fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                  <Cpu size={14} color={B}/> GPS Device
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <Field label="IMEI (select device)">
                      <FSelect value={form.imei} onChange={v=>{
                        fld('imei',v)
                        const dev=devices.find(d=>d.imei===v)
                        if(dev){ fld('sim_number',dev.sim_number||''); fld('protocol',dev.protocol||'GT06') }
                      }}>
                        <option value="">No device</option>
                        {devices.filter(d => !usedImeis.has(d.imei)).map(d=><option key={d.imei} value={d.imei}>{d.imei} {d.model?`(${d.model})`:''}</option>)}
                      </FSelect>
                    </Field>
                  </div>
                  <Field label="SIM Number"><FInput value={form.sim_number} onChange={v=>fld('sim_number',fmtSIM(v))} placeholder="070-758-528" type="tel"/></Field>
                  <Field label="Protocol">
                    <FSelect value={form.protocol} onChange={v=>fld('protocol',v)}>{PROTOCOLS.map(p=><option key={p}>{p}</option>)}</FSelect>
                  </Field>
                </div>
              </div>
              )}
            </div>

            <div style={{ padding:'16px 26px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={close} style={{ padding:'10px 20px', background:'#F8FAFC', border:BORDER, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', color:'#64748B' }}>Cancel</button>
              <button onClick={save} disabled={saving||!form.name.trim()||!form.plate.trim()}
                style={{ padding:'10px 24px', background:(!form.name.trim()||!form.plate.trim())?'#E2E8F0':`linear-gradient(135deg,#0F3460,${B})`, color:(!form.name.trim()||!form.plate.trim())?'#94A3B8':'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:(!form.name.trim()||!form.plate.trim())?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8 }}>
                {saving?<><Spinner size={14} color="white"/>Saving…</>:<><Save size={14}/>{modal==='add'?'Add Vehicle':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes kvh-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes kvh-pop  { from { opacity:0; transform:scale(.96) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>
    </div>
  )
}
