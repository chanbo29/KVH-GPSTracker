import { useState, useMemo } from 'react'
import {
  Plus, Search, Phone, Trash2, Edit,
  User, Users, CheckCircle, XCircle,
  Car, X, Save, MoreVertical, MapPin,
  Info, Cpu, Wifi,
} from 'lucide-react'
import { C }       from '../constants/colors.js'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import {
  LoadingStyles, Spinner, LoadingBar, Skel, SavingOverlay,
} from '../components/Loading.jsx'
import { useConfirm, useToast } from '../components/ui/UIProvider.jsx'

/* Brand accent — matches the sidebar's console amber, used only for primary actions
   (Add Driver CTA, modal Save/Edit buttons) so it stays distinct from status colors. */
const AMBER = '#F2A93B', AMBER_DARK = '#1A1306', AMBER_TINT = '#FEF3E2'

/* ── Avatar with initials ─────────────────────────────────── */
const AVATAR_COLORS = [
  ['#1B6BB5','#EFF6FF'],['#059669','#ECFDF5'],['#D97706','#FFFBEB'],
  ['#7C3AED','#F5F3FF'],['#DC2626','#FEF2F2'],['#0891B2','#ECFEFF'],
]
function Avatar({ name, size=48 }) {
  const idx    = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length
  const [c,bg] = AVATAR_COLORS[idx]
  const initials = name
    ? name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
    : '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, border:`2px solid ${c}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800, fontSize:size*0.33, color:c, letterSpacing:.5 }}>
      {initials}
    </div>
  )
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, icon:Icon, color, bg }) {
  return (
    <div style={{ background:C.card, borderRadius:14, padding:'18px 20px', border:('1px solid '+C.border), display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ width:44, height:44, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <div style={{ color:C.faint, fontSize:11, fontWeight:600, marginBottom:3, textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
        <div style={{ color:C.navy, fontWeight:800, fontSize:24, lineHeight:1 }}>{value}</div>
      </div>
    </div>
  )
}

/* ── Small info row with icon chip ───────────────────────── */
function InfoRow({ icon:Icon, iconColor, iconBg, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={13} color={iconColor}/>
      </div>
      {children}
    </div>
  )
}

/* ── Driver card ──────────────────────────────────────────── */
function DriverCard({ driver, vehicle, onView, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false)
  const active = driver.status === 'active'
  return (
    <div style={{ background:C.card, borderRadius:16, border:('1px solid '+C.border), overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)', transition:'box-shadow .2s, transform .2s' }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.09)'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform='translateY(0)' }}>

      <div style={{ height:3, background: active ? C.green : C.border }}/>

      <div style={{ padding:'18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <Avatar name={driver.name} size={46}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <div style={{ color:C.navy, fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{driver.name}</div>
              <span style={{
                display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0,
                background: active ? C.greenL : C.bg,
                color:       active ? C.green  : C.faint,
              }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background: active ? C.green : C.faint }}/>
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
            <button onClick={()=>onView(driver)} title="View full info"
              style={{ width:29, height:29, borderRadius:8, border:'none', background:C.accentL, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.accent }}>
              <Info size={14}/>
            </button>
            <div style={{ position:'relative' }}>
              <button onClick={()=>setMenu(p=>!p)}
                style={{ width:29, height:29, borderRadius:8, border:'none', background:C.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.faint }}>
                <MoreVertical size={15}/>
              </button>
              {menu && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:10 }} onClick={()=>setMenu(false)}/>
                  <div style={{ position:'absolute', right:0, top:34, background:C.card, border:('1px solid '+C.border), borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:20, minWidth:140, overflow:'hidden' }}>
                    <button onClick={()=>{setMenu(false);onEdit(driver)}}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'11px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:C.navy, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <Edit size={13} color={C.accent}/> Edit Driver
                    </button>
                    <div style={{ height:1, background:C.border }}/>
                    <button onClick={()=>{setMenu(false);onDelete(driver.driver_id)}}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'11px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:C.red, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.redL}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <Trash2 size={13} color={C.red}/> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          <InfoRow icon={Phone} iconColor={C.green} iconBg={C.greenL}>
            {driver.phone ? (
              <a href={`tel:${driver.phone}`} style={{ color:C.navy, fontWeight:600, fontSize:13, textDecoration:'none' }}>
                {driver.phone}
              </a>
            ) : (
              <span style={{ color:C.faint, fontSize:13 }}>No phone number</span>
            )}
          </InfoRow>

          <InfoRow icon={Car} iconColor={C.accent} iconBg={C.accentL}>
            <span style={{ color: vehicle ? C.navy : C.faint, fontSize:13, fontWeight: vehicle ? 600 : 400 }}>
              {vehicle ? `${vehicle.name} — ${vehicle.plate}` : 'No vehicle assigned'}
            </span>
          </InfoRow>
        </div>

        {driver.phone && (
          <a href={`tel:${driver.phone}`}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px', background:C.greenL, color:C.green, borderRadius:10, textDecoration:'none', fontSize:12.5, fontWeight:700, border:'1px solid '+C.green+'55' }}>
            <Phone size={13}/> Call Driver
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Skeleton driver card ─────────────────────────────────── */
function DriverSkel() {
  return (
    <div style={{ background:C.card, borderRadius:16, border:('1px solid '+C.border), overflow:'hidden' }}>
      <div className="kvh-pulse" style={{ height:3, background:C.border }}/>
      <div style={{ padding:'18px' }}>
        <div style={{ display:'flex', gap:12, marginBottom:18 }}>
          <Skel w={46} h={46} r={23}/>
          <div style={{ flex:1 }}><Skel h={15} r={6} style={{ marginBottom:8 }}/><Skel w="40%" h={18} r={20}/></div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          <div style={{ display:'flex', gap:10 }}><Skel w={28} h={28} r={8}/><Skel h={13} r={5} style={{ flex:1 }}/></div>
          <div style={{ display:'flex', gap:10 }}><Skel w={28} h={28} r={8}/><Skel h={13} r={5} style={{ flex:1 }}/></div>
        </div>
        <Skel h={38} r={10}/>
      </div>
    </div>
  )
}

/* ── Reusable form pieces — module scope so they don't lose focus on re-render ── */
function Field({label, children}) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.muted, marginBottom:7, textTransform:'uppercase', letterSpacing:.4 }}>{label}</label>
      {children}
    </div>
  )
}
function TextInput({value, onChange, placeholder, type='text'}) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'12px 14px', border:'1.5px solid '+C.border, borderRadius:11, fontSize:14, color:C.navy, outline:'none', boxSizing:'border-box', background:C.bg, transition:'border .2s' }}
      onFocus={e=>{e.target.style.borderColor=C.accent;e.target.style.background=C.accentL}}
      onBlur={e =>{e.target.style.borderColor=C.border;e.target.style.background=C.bg}}/>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
const BLANK = { name:'', phone:'', license:'', status:'active' }

export default function Drivers() {
  const { data:drivers, setData:setDrivers, loading } = useApi(api.drivers.list)
  const { data:vehicles                             } = useApi(api.vehicles.list)
  const { data:devices                              } = useApi(api.devices.list)
  const confirm = useConfirm()
  const toast   = useToast()

  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [modal,   setModal]   = useState(null)     // null | 'add' | 'edit' | 'view'
  const [form,    setForm]    = useState(BLANK)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [viewing, setViewing] = useState(null)     // driver object for the Info modal

  const fld = (k,v) => setForm(f=>({...f,[k]:v}))

  const vehicleFor = driverName => vehicles.find(v => v.owner === driverName) || null
  const deviceFor   = imei => devices.find(d => d.imei === imei) || null

  const stats = useMemo(()=>({
    total:    drivers.length,
    active:   drivers.filter(d=>d.status==='active').length,
    inactive: drivers.filter(d=>d.status==='inactive').length,
    assigned: drivers.filter(d=>vehicleFor(d.name)).length,
  }),[drivers, vehicles])

  const filtered = useMemo(()=>drivers.filter(d=>{
    const q = search.toLowerCase()
    const veh = vehicleFor(d.name)
    const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.phone?.includes(q) || veh?.name?.toLowerCase().includes(q)
    const matchFilter = filter==='all' || d.status===filter
    return matchSearch && matchFilter
  }),[drivers, vehicles, search, filter])

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal('add') }
  const openView = d => { setViewing(d); setModal('view') }
  const openEdit = d => {
    setForm({ name:d.name||'', phone:d.phone||'', license:d.license||'', status:d.status||'active' })
    setEditId(d.driver_id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null); setViewing(null) }

  const save = async () => {
    if (!form.name.trim()) { toast('Driver name is required', 'warning'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        const r = await api.drivers.create({ ...form, name: form.name.trim() })
        setDrivers(p=>[r,...p])
        toast('Driver added', 'success')
      } else {
        await api.drivers.update(editId, { ...form, name: form.name.trim() })
        setDrivers(p=>p.map(d=>d.driver_id===editId ? { ...d,...form } : d))
        toast('Changes saved', 'success')
      }
      closeModal()
    } catch(e) { toast(e.message || 'Something went wrong', 'error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    const ok = await confirm('This driver will be permanently removed. This cannot be undone.', {
      title: 'Delete driver?', danger: true, confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await api.drivers.delete(id)
      setDrivers(p=>p.filter(d=>d.driver_id!==id))
      toast('Driver deleted', 'success')
    }
    catch(e) { toast(e.message || 'Failed to delete driver', 'error') }
  }

  const isAdd  = modal === 'add'
  const isEdit = modal === 'edit'

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <LoadingStyles/>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:C.navy, letterSpacing:-.3 }}>Drivers</h1>
            {loading && <Spinner size={20}/>}
          </div>
          <p style={{ margin:'4px 0 0', color:C.faint, fontSize:14 }}>{loading?'Loading…':`${stats.total} drivers registered`}</p>
        </div>
        <button onClick={openAdd}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 22px', background:AMBER, color:AMBER_DARK, border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(242,169,59,.4)' }}>
          <Plus size={16}/> Add Driver
        </button>
      </div>

      <LoadingBar show={loading}/>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {loading ? (
          [0,1,2,3].map(i=>(
            <div key={i} style={{ background:C.card, borderRadius:14, padding:'18px 20px', border:('1px solid '+C.border), display:'flex', gap:14 }}>
              <Skel w={44} h={44} r={12}/><div style={{ flex:1 }}><Skel w="60%" h={11} r={5} style={{ marginBottom:8 }}/><Skel w="35%" h={24} r={6}/></div>
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Drivers"   value={stats.total}    icon={Users}         color={AMBER}       bg={AMBER_TINT}/>
            <StatCard label="Active"          value={stats.active}   icon={CheckCircle}   color={C.green} bg={C.greenL}/>
            <StatCard label="Inactive"        value={stats.inactive} icon={XCircle}       color={C.faint} bg={C.bg}/>
            <StatCard label="With Vehicle"    value={stats.assigned} icon={Car}           color={C.amber} bg={C.amberL}/>
          </>
        )}
      </div>

      {/* ── Unified toolbar ────────────────────────────── */}
      <div style={{ background:C.card, borderRadius:14, border:('1px solid '+C.border), padding:'12px 16px', marginBottom:20, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ flex:1, minWidth:220, display:'flex', gap:10, alignItems:'center', background:C.bg, borderRadius:10, padding:'9px 14px', border:('1px solid '+C.border) }}>
          <Search size={14} color={C.faint}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, vehicle…"
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          {search && (
            <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex' }}><X size={13}/></button>
          )}
        </div>

        <div style={{ display:'flex', gap:4, background:C.bg, borderRadius:10, padding:3, border:('1px solid '+C.border), flexShrink:0 }}>
          {[['all','All'],['active','Active'],['inactive','Inactive']].map(([id,label])=>(
            <button key={id} onClick={()=>setFilter(id)}
              style={{ padding:'6px 15px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:filter===id?700:400, background:filter===id?C.sidebar:'transparent', color:filter===id?'white':C.muted, transition:'all .15s', whiteSpace:'nowrap' }}>
              {label}
              {id!=='all' && <span style={{ marginLeft:5, fontSize:10.5, opacity:.7 }}>({id==='active'?stats.active:stats.inactive})</span>}
            </button>
          ))}
        </div>

        <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} result{filtered.length!==1?'s':''}</div>
      </div>

      {/* ── Card grid ───────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(272px,1fr))', gap:16 }}>
        {loading ? (
          [0,1,2,3,4,5].map(i=><DriverSkel key={i}/>)
        ) : filtered.length===0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px' }}>
            <div style={{ width:64, height:64, borderRadius:18, background:C.accentL, border:'1px solid '+C.accentB, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Users size={28} color={C.accent}/>
            </div>
            <div style={{ color:C.navy, fontWeight:700, fontSize:16, marginBottom:6 }}>
              {search ? 'No drivers found' : 'No drivers yet'}
            </div>
            <div style={{ color:C.faint, fontSize:13, marginBottom:20 }}>
              {search ? `No results for "${search}"` : 'Add your first driver to get started'}
            </div>
            {!search && (
              <button onClick={openAdd}
                style={{ padding:'10px 22px', background:AMBER, color:AMBER_DARK, border:'none', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
                <Plus size={14}/> Add Driver
              </button>
            )}
          </div>
        ) : (
          filtered.map(d=>(
            <DriverCard key={d.driver_id} driver={d} vehicle={vehicleFor(d.name)} onView={openView} onEdit={openEdit} onDelete={del}/>
          ))
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          INFO MODAL — Driver + Vehicle + GPS Device, all in one place
      ══════════════════════════════════════════════════════ */}
      {modal === 'view' && viewing && (() => {
        const veh = vehicleFor(viewing.name)
        const dev = veh ? deviceFor(veh.imei) : null
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e=>{ if(e.target===e.currentTarget) closeModal() }}>
            <div style={{ background:C.card, borderRadius:20, width:'100%', maxWidth:440, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

              <div style={{ padding:'20px 24px 16px', borderBottom:('1px solid '+C.border), display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Avatar name={viewing.name} size={44}/>
                  <div>
                    <div style={{ fontWeight:900, fontSize:16, color:C.navy }}>{viewing.name}</div>
                    <div style={{ color:C.faint, fontSize:12 }}>{viewing.status==='active'?'Active driver':'Inactive driver'}</div>
                  </div>
                </div>
                <button onClick={closeModal}
                  style={{ width:32, height:32, borderRadius:9, background:C.bg, border:('1px solid '+C.border), display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <X size={14} color={C.muted}/>
                </button>
              </div>

              <div style={{ overflowY:'auto', padding:'18px 24px', display:'flex', flexDirection:'column', gap:16 }}>

                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7, color:C.accent, fontWeight:700, fontSize:12, marginBottom:9, textTransform:'uppercase', letterSpacing:.4 }}>
                    <User size={12}/> Driver
                  </div>
                  {[
                    ['Phone', viewing.phone || '—'],
                    ['License', viewing.license || '—'],
                    ['Status', viewing.status || '—'],
                  ].map(([label,value])=>(
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid '+C.border, fontSize:13 }}>
                      <span style={{ color:C.faint }}>{label}</span>
                      <span style={{ color:C.navy, fontWeight:600, textTransform: label==='Status'?'capitalize':'none' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7, color:C.amber, fontWeight:700, fontSize:12, marginBottom:9, textTransform:'uppercase', letterSpacing:.4 }}>
                    <Car size={12}/> Vehicle
                  </div>
                  {veh ? (
                    [
                      ['Name', veh.name || '—'],
                      ['Plate', veh.plate || '—'],
                      ['Type', veh.type || '—'],
                      ['Status', veh.status || '—'],
                    ].map(([label,value])=>(
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid '+C.border, fontSize:13 }}>
                        <span style={{ color:C.faint }}>{label}</span>
                        <span style={{ color:C.navy, fontWeight:600, textTransform: label==='Status'?'capitalize':'none' }}>{value}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color:C.faint, fontSize:13, padding:'5px 0' }}>No vehicle assigned</div>
                  )}
                </div>

                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7, color:C.green, fontWeight:700, fontSize:12, marginBottom:9, textTransform:'uppercase', letterSpacing:.4 }}>
                    <Cpu size={12}/> GPS Device
                  </div>
                  {dev ? (
                    [
                      ['IMEI', dev.imei || '—'],
                      ['Model', dev.model || '—'],
                      ['SIM', dev.sim_number ? dev.sim_number.replace(/-/g,'') : '—'],
                      ['Protocol', dev.protocol || '—'],
                      ['Status', dev.gps_status || '—'],
                    ].map(([label,value])=>(
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid '+C.border, fontSize:13 }}>
                        <span style={{ color:C.faint }}>{label}</span>
                        <span style={{ color:C.navy, fontWeight:600, fontFamily: label==='IMEI'?'monospace':'inherit', textTransform: label==='Status'?'capitalize':'none' }}>{value}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color:C.faint, fontSize:13, padding:'5px 0' }}>
                      {veh ? 'No GPS device on this vehicle' : 'No vehicle, so no device to show'}
                    </div>
                  )}
                </div>

              </div>

              <div style={{ padding:'14px 24px', borderTop:('1px solid '+C.border), display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
                <button onClick={closeModal}
                  style={{ padding:'9px 18px', background:C.bg, border:('1px solid '+C.border), borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', color:C.muted }}>
                  Close
                </button>
                <button onClick={()=>{ closeModal(); openEdit(viewing) }}
                  style={{ padding:'9px 18px', background:AMBER, color:AMBER_DARK, border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
                  <Edit size={13}/> Edit
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════════════════════════════
          ADD MODAL — Name, Phone, Vehicle only
      ══════════════════════════════════════════════════════ */}
      {isAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e=>{ if(e.target===e.currentTarget) closeModal() }}>
          <div style={{ background:C.card, borderRadius:20, width:'100%', maxWidth:420, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
            <SavingOverlay show={saving}/>

            <div style={{ padding:'22px 24px 18px', borderBottom:('1px solid '+C.border), display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:19, color:C.navy }}>Add New Driver</div>
                <div style={{ color:C.faint, fontSize:12.5, marginTop:3 }}>Just the essentials — details can be added later</div>
              </div>
              <button onClick={closeModal}
                style={{ width:34, height:34, borderRadius:9, background:C.bg, border:('1px solid '+C.border), display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={15} color={C.muted}/>
              </button>
            </div>

            <div style={{ padding:'18px 24px 0', display:'flex', alignItems:'center', gap:13, flexShrink:0 }}>
              <Avatar name={form.name||'?'} size={50}/>
              <div>
                <div style={{ color:C.navy, fontWeight:700, fontSize:15 }}>{form.name||'New Driver'}</div>
                <div style={{ color:C.faint, fontSize:12.5 }}>Avatar generated from name</div>
              </div>
            </div>

            <div style={{ overflowY:'auto', padding:'18px 24px', flex:1 }}>

              <Field label="Full Name *">
                <TextInput value={form.name} onChange={v=>fld('name',v)} placeholder="e.g. Dara Sok"/>
              </Field>

              <Field label="Phone Number">
                <TextInput value={form.phone} onChange={v=>fld('phone',v)} placeholder="e.g. 012-345-678" type="tel"/>
                {form.phone && (
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, color:C.green, fontSize:11.5, fontWeight:500 }}>
                    <Phone size={11}/> Will appear as a clickable call button
                  </div>
                )}
              </Field>

              <div style={{ background:C.bg, borderRadius:11, padding:'13px', border:('1px solid '+C.border), display:'flex', gap:10, alignItems:'flex-start' }}>
                <Car size={14} color={C.faint} style={{ marginTop:1, flexShrink:0 }}/>
                <div style={{ color:C.muted, fontSize:12 }}>
                  Vehicle assignment happens on the Vehicles page — once this driver is added, assign them there and it'll show up here automatically.
                </div>
              </div>

            </div>

            <div style={{ padding:'14px 24px', borderTop:('1px solid '+C.border), display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={closeModal}
                style={{ padding:'10px 20px', background:C.bg, border:('1px solid '+C.border), borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', color:C.muted }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving||!form.name.trim()}
                style={{ padding:'10px 24px', background:!form.name.trim()?C.border:AMBER, color:!form.name.trim()?C.faint:AMBER_DARK, border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:!form.name.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8 }}>
                {saving ? <><Spinner size={14} color={AMBER_DARK}/> Saving…</> : <><Save size={14}/>Add Driver</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          EDIT MODAL — full details
      ══════════════════════════════════════════════════════ */}
      {isEdit && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e=>{ if(e.target===e.currentTarget) closeModal() }}>
          <div style={{ background:C.card, borderRadius:20, width:'100%', maxWidth:460, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
            <SavingOverlay show={saving}/>

            <div style={{ padding:'22px 24px 18px', borderBottom:('1px solid '+C.border), display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:19, color:C.navy }}>Edit Driver</div>
                <div style={{ color:C.faint, fontSize:12.5, marginTop:3 }}>Editing {form.name}</div>
              </div>
              <button onClick={closeModal}
                style={{ width:34, height:34, borderRadius:9, background:C.bg, border:('1px solid '+C.border), display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={15} color={C.muted}/>
              </button>
            </div>

            <div style={{ padding:'18px 24px 0', display:'flex', alignItems:'center', gap:13, flexShrink:0 }}>
              <Avatar name={form.name||'?'} size={50}/>
              <div>
                <div style={{ color:C.navy, fontWeight:700, fontSize:15 }}>{form.name||'New Driver'}</div>
                <div style={{ color:C.faint, fontSize:12.5 }}>Avatar generated from name</div>
              </div>
            </div>

            <div style={{ overflowY:'auto', padding:'18px 24px', flex:1 }}>

              <Field label="Full Name *">
                <TextInput value={form.name} onChange={v=>fld('name',v)} placeholder="e.g. Dara Sok"/>
              </Field>

              <Field label="Phone Number">
                <TextInput value={form.phone} onChange={v=>fld('phone',v)} placeholder="e.g. 012-345-678" type="tel"/>
                {form.phone && (
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, color:C.green, fontSize:11.5, fontWeight:500 }}>
                    <Phone size={11}/> Will appear as a clickable call button
                  </div>
                )}
              </Field>

              <Field label="Assigned Vehicle">
                <div style={{ padding:'12px 14px', border:'1.5px solid '+C.border, borderRadius:11, fontSize:14, background:C.bg, color: vehicleFor(form.name) ? C.navy : C.faint }}>
                  {vehicleFor(form.name) ? `${vehicleFor(form.name).name} — ${vehicleFor(form.name).plate}` : 'Unassigned'}
                </div>
                <div style={{ marginTop:6, color:C.faint, fontSize:11 }}>
                  Set automatically from the Vehicles page — change it there
                </div>
              </Field>

              <Field label="License Number">
                <TextInput value={form.license} onChange={v=>fld('license',v)} placeholder="e.g. KH-123456"/>
              </Field>

              <Field label="Status">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[['active','Active',C.green,C.greenL,C.green+'55'],['inactive','Inactive',C.faint,C.bg,C.border]].map(([val,label,c,bg,border])=>(
                    <button key={val} type="button" onClick={()=>fld('status',val)}
                      style={{ padding:'11px', border:`2px solid ${form.status===val?c:border}`, borderRadius:11, background:form.status===val?bg:C.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .15s' }}>
                      {form.status===val ? <CheckCircle size={14} color={c}/> : <XCircle size={14} color={C.faint}/>}
                      <span style={{ fontWeight:700, fontSize:13.5, color:form.status===val?c:C.faint }}>{label}</span>
                    </button>
                  ))}
                </div>
              </Field>

            </div>

            <div style={{ padding:'14px 24px', borderTop:('1px solid '+C.border), display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={closeModal}
                style={{ padding:'10px 20px', background:C.bg, border:('1px solid '+C.border), borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', color:C.muted }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving||!form.name.trim()}
                style={{ padding:'10px 24px', background:!form.name.trim()?C.border:AMBER, color:!form.name.trim()?C.faint:AMBER_DARK, border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:!form.name.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8 }}>
                {saving ? <><Spinner size={14} color={AMBER_DARK}/> Saving…</> : <><Save size={14}/>Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}