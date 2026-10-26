import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, Edit, Trash2, Wrench, X, Save, Search,
  CheckCircle, Clock, AlertCircle, Calendar, Gauge,
  DollarSign, ChevronDown, User, FileText,
} from 'lucide-react'
import { C }       from '../constants/colors.js'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import PageHeader  from '../components/ui/PageHeader.jsx'
import Badge       from '../components/ui/Badge.jsx'
import {
  LoadingStyles, Spinner, LoadingBar,
  Skel, SkeletonRows, SavingOverlay,
} from '../components/Loading.jsx'

const BORDER = '1px solid #E2E8F0'

const SERVICE_CATEGORIES = [
  { label: 'Engine & Fluids', types: [
    'Oil Change', 'Air Filter', 'Spark Plugs', 'Fuel Filter',
    'Fuel Injector Cleaning', 'Timing Belt / Chain', 'Engine Mounts', 'PCV Valve',
  ]},
  { label: 'Cooling System', types: [
    'Coolant Flush / Replacement', 'Radiator Service', 'Thermostat Replacement',
    'Water Pump', 'Cooling Fan / Hoses',
  ]},
  { label: 'Brakes', types: [
    'Brake Pads', 'Brake Rotors / Discs', 'Brake Fluid Flush',
    'Brake Lines / Hoses', 'Parking Brake Adjustment',
  ]},
  { label: 'Tires & Wheels', types: [
    'Tire Rotation', 'Tire Replacement', 'Wheel Alignment',
    'Wheel Balancing', 'Tire Pressure Check',
  ]},
  { label: 'Transmission & Drivetrain', types: [
    'Transmission Fluid Change', 'Transmission Filter', 'Differential Fluid',
    'CV Joints / Axles', 'Clutch',
  ]},
  { label: 'Electrical & Battery', types: [
    'Battery Replacement', 'Battery Terminal Cleaning', 'Alternator',
    'Starter Motor', 'Fuses / Wiring',
  ]},
  { label: 'Suspension & Steering', types: [
    'Shocks / Struts', 'Ball Joints', 'Tie Rods',
    'Power Steering Fluid', 'Steering Rack',
  ]},
  { label: 'Belts & Hoses', types: [
    'Serpentine / Drive Belt', 'Radiator / Heater Hoses',
  ]},
  { label: 'Exhaust System', types: [
    'Muffler', 'Catalytic Converter', 'Exhaust Pipe / Gasket',
  ]},
  { label: 'HVAC / Cabin', types: [
    'AC Service', 'Cabin Air Filter', 'Heater Core',
  ]},
  { label: 'Safety & Inspection', types: [
    'General Inspection', 'Wiper Blades', 'Headlight / Taillight Bulbs', 'Horn',
  ]},
  { label: 'Other', types: [ 'Other' ] },
]
const SERVICE_TYPES = SERVICE_CATEGORIES.flatMap(c => c.types)
const VEHICLE_TYPES = ['Sedan','SUV','Truck','Van','Motorcycle','Bus','Other']
const STATUS_MAP = {
  completed: { label:'Completed', color:C.green,  bg:'#ECFDF5', Icon:CheckCircle },
  scheduled: { label:'Scheduled', color:C.blue,   bg:'#EFF6FF', Icon:Clock       },
  overdue:   { label:'Overdue',   color:C.red,    bg:'#FEF2F2', Icon:AlertCircle },
}
const BLANK = {
  vehicle_id:'', vehicle_name:'', service_types:[],
  date:'', odometer:'', cost:'', technician:'',
  notes:'', next_date:'', next_odometer:'', status:'completed',
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.completed
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color }}>
      <s.Icon size={11}/>{s.label}
    </span>
  )
}

const fmt$ = v => v ? '$' + Number(v).toLocaleString('en', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '—'
const fmtKm = v => v ? Number(v).toLocaleString('en') + ' km' : '—'

/* Splits the stored comma-joined string back into a clean array of service types */
const parseServiceTypes = str => (str || '').split(',').map(s => s.trim()).filter(Boolean)

/* ── Searchable vehicle picker — type a vehicle name, plate, or driver name ── */
/* Also lets you add a brand-new vehicle inline (name + plate + type only, no    */
/* GPS device needed) right from this dropdown, for cars that don't use GPS.     */
function VehiclePicker({ vehicles, value, onChange, onVehicleCreated }) {
  const [open,     setOpen]     = useState(false)
  const [search,   setSearch]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [newV,     setNewV]     = useState({ name:'', plate:'', type:'Sedan' })
  const [creating, setCreating] = useState(false)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const selected = vehicles.find(v => String(v.vehicle_id) === value)

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    return !q || v.name?.toLowerCase().includes(q) || v.plate?.toLowerCase().includes(q) || v.owner?.toLowerCase().includes(q)
  })

  useEffect(() => {
    const onClickOutside = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setAdding(false) } }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => { if (open && !adding) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 0) } }, [open, adding])

  const startAdd = () => {
    setNewV({ name: search, plate: '', type: 'Sedan' })
    setAdding(true)
  }

  const createVehicle = async () => {
    if (!newV.name.trim() || !newV.plate.trim()) { alert('Vehicle name and plate are required'); return }
    setCreating(true)
    try {
      const created = await api.vehicles.create({
        name: newV.name.trim(), plate: newV.plate.trim(), type: newV.type,
        status: 'offline', owner: 'Unassigned', battery: 100, signal: 5, speed: 0, lat: 0, lng: 0,
        // no imei — this vehicle simply doesn't use GPS, which is fine, it just won't show live tracking data
      })
      onVehicleCreated?.(created)
      onChange(created)
      setAdding(false); setOpen(false)
    } catch (e) { alert(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8,
          padding:'10px 12px', border:BORDER, borderRadius:9, background:'white',
          cursor:'pointer', fontSize:13, color: selected ? C.navy : '#94A3B8', textAlign:'left', boxSizing:'border-box',
        }}
      >
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selected ? `${selected.name} — ${selected.plate}` : 'Select vehicle…'}
        </span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'white', border:BORDER, borderRadius:10, boxShadow:'0 12px 32px rgba(0,0,0,.14)', zIndex:50, overflow:'hidden' }}>

          {!adding ? (
            <>
              <div style={{ padding:8, borderBottom:BORDER, display:'flex', alignItems:'center', gap:8, background:'#F8FAFC' }}>
                <Search size={13} color="#94A3B8" style={{ flexShrink:0 }}/>
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search vehicle, plate, or driver…"
                  style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'none', color:C.navy }}
                />
              </div>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding:'14px', color:'#94A3B8', fontSize:13, textAlign:'center' }}>No vehicles match "{search}"</div>
                ) : filtered.map(v => (
                  <button
                    key={v.vehicle_id}
                    onClick={() => { onChange(v); setOpen(false) }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'none', background: String(v.vehicle_id)===value?'#EFF6FF':'white', cursor:'pointer', textAlign:'left' }}
                    onMouseEnter={e => { if (String(v.vehicle_id)!==value) e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={e => { if (String(v.vehicle_id)!==value) e.currentTarget.style.background = 'white' }}
                  >
                    <div style={{ width:30, height:30, borderRadius:8, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Wrench size={14} color={C.accent}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {v.name} <span style={{ color:'#94A3B8', fontWeight:400, fontFamily:'monospace' }}>— {v.plate}</span>
                      </div>
                      {v.owner && v.owner !== 'Unassigned' && (
                        <div style={{ fontSize:11, color:'#94A3B8' }}>Driver: {v.owner}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {/* Quick-add — for a vehicle that doesn't exist yet, e.g. one that doesn't use GPS */}
              <button onClick={startAdd}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'11px 14px', border:'none', borderTop:BORDER, background:'#F8FAFC', cursor:'pointer', textAlign:'left', color:C.accent, fontSize:12.5, fontWeight:700 }}>
                <Plus size={14}/> {search ? `Add "${search}" as a new vehicle` : 'Add a new vehicle'}
              </button>
            </>
          ) : (
            /* Inline quick-add form — name + plate + type only, no GPS device required */
            <div style={{ padding:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:10 }}>New Vehicle</div>
              <input
                autoFocus
                value={newV.name}
                onChange={e => setNewV(v => ({ ...v, name: e.target.value }))}
                placeholder="Vehicle name (e.g. Toyota Camry)"
                style={{ width:'100%', padding:'8px 10px', border:BORDER, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 }}
              />
              <input
                value={newV.plate}
                onChange={e => setNewV(v => ({ ...v, plate: e.target.value }))}
                placeholder="Plate number (e.g. 2A-1234)"
                style={{ width:'100%', padding:'8px 10px', border:BORDER, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 }}
              />
              <select
                value={newV.type}
                onChange={e => setNewV(v => ({ ...v, type: e.target.value }))}
                style={{ width:'100%', padding:'8px 10px', border:BORDER, borderRadius:8, fontSize:13, outline:'none', background:'white', boxSizing:'border-box', marginBottom:10 }}
              >
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <div style={{ color:'#94A3B8', fontSize:11, marginBottom:10 }}>
                No GPS device needed — you can add one later if this vehicle ever gets a tracker.
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setAdding(false)}
                  style={{ flex:1, padding:'8px', border:BORDER, borderRadius:8, background:'white', color:'#64748B', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
                  Cancel
                </button>
                <button onClick={createVehicle} disabled={creating || !newV.name.trim() || !newV.plate.trim()}
                  style={{ flex:1, padding:'8px', border:'none', borderRadius:8, background: (!newV.name.trim()||!newV.plate.trim())?'#E2E8F0':C.accent, color: (!newV.name.trim()||!newV.plate.trim())?'#94A3B8':'white', fontSize:12.5, fontWeight:700, cursor: creating?'not-allowed':'pointer' }}>
                  {creating ? 'Adding…' : 'Add Vehicle'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Maintenance() {
  const { data:logs,      setData:setLogs,     loading    } = useApi(api.maintenance.list)
  const { data:vehicles, setData:setVehicles              } = useApi(api.vehicles.list)

  const [modal,   setModal]   = useState(null)   // null | 'add' | 'edit'
  const [form,    setForm]    = useState(BLANK)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('all')  // all | completed | scheduled | overdue
  const [vFilter, setVFilter] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleServiceType = t => setForm(f => ({
    ...f,
    service_types: f.service_types.includes(t)
      ? f.service_types.filter(x => x !== t)
      : [...f.service_types, t],
  }))

  /* ── Derived stats ─────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:     logs.length,
    completed: logs.filter(l => l.status === 'completed').length,
    scheduled: logs.filter(l => l.status === 'scheduled').length,
    overdue:   logs.filter(l => l.status === 'overdue').length,
    totalCost: logs.reduce((s, l) => s + Number(l.cost || 0), 0),
    monthCost: logs
      .filter(l => { const d = new Date(l.date); const n = new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear() })
      .reduce((s, l) => s + Number(l.cost || 0), 0),
  }), [logs])

  /* ── Filtered rows ─────────────────────────────────────── */
  const filtered = useMemo(() => logs.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.vehicle_name?.toLowerCase().includes(q) || l.service_type?.toLowerCase().includes(q) || l.technician?.toLowerCase().includes(q)
    const matchTab    = tab === 'all' || l.status === tab
    const matchV      = !vFilter || String(l.vehicle_id) === vFilter
    return matchSearch && matchTab && matchV
  }), [logs, search, tab, vFilter])

  /* ── Open modals ───────────────────────────────────────── */
  const openAdd = () => {
    setForm({ ...BLANK, date: new Date().toISOString().slice(0,10) })
    setEditId(null); setServiceSearch(''); setModal('add')
  }
  const openEdit = row => {
    setForm({
      vehicle_id:    String(row.vehicle_id),
      vehicle_name:  row.vehicle_name,
      service_types: parseServiceTypes(row.service_type),
      date:          row.date,
      odometer:      String(row.odometer || ''),
      cost:          String(row.cost || ''),
      technician:    row.technician || '',
      notes:         row.notes || '',
      next_date:     row.next_date || '',
      next_odometer: String(row.next_odometer || ''),
      status:        row.status,
    })
    setEditId(row.log_id); setServiceSearch(''); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null); setServiceSearch('') }

  /* ── Save ──────────────────────────────────────────────── */
  const save = async () => {
    if (!form.vehicle_id || !form.date)     { alert('Vehicle and date are required'); return }
    if (form.service_types.length === 0)    { alert('Select at least one service type'); return }
    setSaving(true)
    try {
      const vName = vehicles.find(v => String(v.vehicle_id) === form.vehicle_id)?.name || form.vehicle_name
      const { service_types, ...rest } = form
      const payload = {
        ...rest,
        vehicle_name:  vName,
        service_type:  service_types.join(', '),
        odometer:      Number(form.odometer) || 0,
        cost:          Number(form.cost)     || 0,
        next_odometer: Number(form.next_odometer) || null,
        next_date:     form.next_date || null,
      }
      if (modal === 'add') {
        const r = await api.maintenance.create(payload)
        setLogs(p => [r, ...p])
      } else {
        const r = await api.maintenance.update(editId, payload)
        setLogs(p => p.map(l => l.log_id === editId ? r : l))
      }
      closeModal()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!window.confirm('Delete this service record?')) return
    try { await api.maintenance.delete(id); setLogs(p => p.filter(l => l.log_id !== id)) }
    catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      <PageHeader title="Maintenance" subtitle={loading ? 'Loading…' : stats.total + ' service records'}>
        {loading && <Spinner size={20}/>}
        <Btn variant="primary" onClick={openAdd}><Plus size={14}/> Log Service</Btn>
      </PageHeader>
      <LoadingBar show={loading}/>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, margin:'20px 0' }}>
        {loading ? Array.from({length:4}).map((_,i) => (
          <Card key={i} style={{ padding:'16px' }}>
            <Skel w={36} h={36} r={10} style={{ marginBottom:12 }}/><Skel h={26} r={6} style={{ marginBottom:8 }}/><Skel w="60%" h={12} r={5}/>
          </Card>
        )) : [
          ['Total Services',   stats.total,                  Wrench,    C.blue ],
          ['Overdue',          stats.overdue,                AlertCircle,C.red  ],
          ['Scheduled',        stats.scheduled,              Clock,     C.amber],
          ['This Month Cost',  fmt$(stats.monthCost),        DollarSign, C.green],
        ].map(([l, v, Icon, c]) => (
          <Card key={l} style={{ padding:'18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{l}</div>
              <div style={{ color:C.navy, fontWeight:800, fontSize:22 }}>{v}</div>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={19} color={c}/>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <Card style={{ marginBottom:0 }}>
        <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          {/* Status tabs */}
          <div style={{ display:'flex', gap:4, background:'#F8FAFC', borderRadius:10, padding:3, border:BORDER }}>
            {[['all','All'],['completed','Completed'],['scheduled','Scheduled'],['overdue','Overdue']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:tab===id?700:400, background:tab===id?(id==='overdue'?C.red:id==='scheduled'?C.blue:tab==='all'?C.navy:C.green):'transparent', color:tab===id?'white':C.muted, transition:'all .15s', whiteSpace:'nowrap' }}>
                {label} {id !== 'all' && `(${stats[id]??0})`}
              </button>
            ))}
          </div>

          {/* Vehicle filter */}
          <select value={vFilter} onChange={e => setVFilter(e.target.value)}
            style={{ padding:'8px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name}</option>)}
          </select>

          {/* Search */}
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:9, padding:'8px 12px', border:BORDER, minWidth:200 }}>
            <Search size={14} color={C.faint}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle, service, technician…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          </div>

          <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} records</div>
        </div>

        {/* ── Table ──────────────────────────────────── */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Vehicle','Service Type','Date','Odometer','Cost','Technician','Status','Next Due','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows n={6} cols={['14%','14%','10%','10%','9%','11%','10%','12%','10%']}/>
              ) : filtered.map(l => (
                <tr key={l.log_id} style={{ borderBottom:'1px solid #F8FAFC' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFBFC'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div style={{ width:34, height:34, borderRadius:9, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Wrench size={15} color={C.accent}/>
                      </div>
                      <span style={{ fontWeight:600, color:C.navy, fontSize:13 }}>{l.vehicle_name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:12, color:C.navy, maxWidth:200 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {parseServiceTypes(l.service_type).map(t => (
                        <span key={t} style={{ background:C.accentL, color:C.accent, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.muted }}>{l.date}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.muted }}>{fmtKm(l.odometer)}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:C.navy }}>{fmt$(l.cost)}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.muted }}>{l.technician || '—'}</td>
                  <td style={{ padding:'13px 16px' }}><StatusBadge status={l.status}/></td>
                  <td style={{ padding:'13px 16px', fontSize:12, color:C.muted }}>
                    {l.next_date ? (
                      <div>
                        <div style={{ color:C.navy, fontWeight:500 }}>{l.next_date}</div>
                        {l.next_odometer && <div style={{ color:C.faint, fontSize:11 }}>{fmtKm(l.next_odometer)}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', gap:7 }}>
                      <button onClick={() => openEdit(l)} style={{ background:C.accentL, border:'none', borderRadius:7, padding:'6px 11px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.accent, fontSize:12, fontWeight:600 }}>
                        <Edit size={12}/> Edit
                      </button>
                      <button onClick={() => del(l.log_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 11px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.red, fontSize:12, fontWeight:600 }}>
                        <Trash2 size={12}/> Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:52, color:C.faint }}>
              <Wrench size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
              <div style={{ fontWeight:600, fontSize:15, color:C.muted, marginBottom:6 }}>No records found</div>
              <div style={{ fontSize:13 }}>Try a different filter or log a new service.</div>
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:580, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative' }}>
            <SavingOverlay show={saving}/>

            <div style={{ padding:'20px 24px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{modal === 'add' ? 'Log Service' : 'Edit Service Record'}</div>
                <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>Fill in the maintenance details below</div>
              </div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Vehicle */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Vehicle *</label>
                <VehiclePicker
                  vehicles={vehicles}
                  value={form.vehicle_id}
                  onChange={v => { fld('vehicle_id', String(v.vehicle_id)); fld('vehicle_name', v.name) }}
                  onVehicleCreated={v => setVehicles(p => [...p, v])}
                />
              </div>

              {/* Service Type — searchable, categorized multi-select with a clear "what's selected" summary */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:'block', marginBottom:8 }}>
                  Service Type * <span style={{ color:C.faint, fontWeight:400 }}>— select all that apply</span>
                </label>

                {/* Selected chips — always visible so it's clear what's been picked */}
                {form.service_types.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10, padding:'10px 12px', background:C.accentL, borderRadius:9, border:'1px solid '+C.accentB }}>
                    {form.service_types.map(t => (
                      <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:5, background:'white', color:C.accent, padding:'4px 6px 4px 10px', borderRadius:20, fontSize:12, fontWeight:600, border:'1px solid '+C.accentB }}>
                        {t}
                        <button onClick={() => toggleServiceType(t)}
                          style={{ background:C.accentL, border:'none', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:C.accent, padding:0 }}>
                          <X size={10} strokeWidth={3}/>
                        </button>
                      </span>
                    ))}
                    <button onClick={() => fld('service_types', [])}
                      style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, fontSize:11, fontWeight:600, marginLeft:4 }}>
                      Clear all
                    </button>
                  </div>
                )}

                {/* Search to jump straight to a service instead of scanning every category */}
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F8FAFC', border:BORDER, borderRadius:9, padding:'8px 12px', marginBottom:10 }}>
                  <Search size={13} color={C.faint}/>
                  <input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="Search a service (e.g. brake, filter, tire)…"
                    style={{ flex:1, border:'none', outline:'none', fontSize:12.5, color:C.navy, background:'none' }}/>
                  {serviceSearch && (
                    <button onClick={() => setServiceSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex' }}>
                      <X size={12}/>
                    </button>
                  )}
                </div>

                {/* Categorized checklist */}
                <div style={{ maxHeight:280, overflowY:'auto', border:BORDER, borderRadius:9, padding:12 }}>
                  {SERVICE_CATEGORIES
                    .map(cat => ({ ...cat, types: cat.types.filter(t => t.toLowerCase().includes(serviceSearch.toLowerCase())) }))
                    .filter(cat => cat.types.length > 0)
                    .map((cat, i, arr) => {
                      const allChecked  = cat.types.every(t => form.service_types.includes(t))
                      return (
                        <div key={cat.label} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                            <span style={{ color:C.muted, fontSize:10.5, fontWeight:700, letterSpacing:.5, textTransform:'uppercase' }}>{cat.label}</span>
                            <button
                              onClick={() => fld('service_types', allChecked
                                ? form.service_types.filter(t => !cat.types.includes(t))
                                : [...new Set([...form.service_types, ...cat.types])])}
                              style={{ background:'none', border:'none', cursor:'pointer', color: allChecked ? C.accent : C.faint, fontSize:10.5, fontWeight:600 }}>
                              {allChecked ? 'Deselect' : 'Select all'}
                            </button>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                            {cat.types.map(t => {
                              const checked = form.service_types.includes(t)
                              return (
                                <div key={t} onClick={() => toggleServiceType(t)}
                                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', borderRadius:8, cursor:'pointer', border:'1.5px solid '+(checked?C.accent:'#E2E8F0'), background: checked?C.accentL:'#FAFAFA', transition:'all .1s' }}>
                                  <div style={{ width:14, height:14, borderRadius:4, flexShrink:0, background: checked?C.accent:'white', border:'2px solid '+(checked?C.accent:'#E2E8F0'), display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    {checked && <CheckCircle size={8} color="white" strokeWidth={4}/>}
                                  </div>
                                  <span style={{ fontSize:11.5, color: checked?C.accent:C.muted, fontWeight: checked?600:400 }}>{t}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  {SERVICE_CATEGORIES.every(cat => cat.types.every(t => !t.toLowerCase().includes(serviceSearch.toLowerCase()))) && (
                    <div style={{ textAlign:'center', color:C.faint, fontSize:12, padding:'16px 0' }}>No services match "{serviceSearch}"</div>
                  )}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Service Date *</label>
                  <input type="date" value={form.date} onChange={e => fld('date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Odometer (km)</label>
                  <input type="number" value={form.odometer} onChange={e => fld('odometer', e.target.value)} placeholder="e.g. 45000"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Cost ($)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => fld('cost', e.target.value)} placeholder="e.g. 35.00"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Technician</label>
                  <input value={form.technician} onChange={e => fld('technician', e.target.value)} placeholder="e.g. Dara Mechanics"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Status</label>
                  <select value={form.status} onChange={e => fld('status', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    <option value="completed">Completed</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Next service */}
              <div style={{ background:'#F8FAFC', borderRadius:10, padding:'14px', border:BORDER }}>
                <div style={{ color:C.navy, fontWeight:600, fontSize:13, marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
                  <Calendar size={14} color={C.accent}/> Next Service Reminder
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Due Date</label>
                    <input type="date" value={form.next_date} onChange={e => fld('next_date', e.target.value)}
                      style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Due Odometer (km)</label>
                    <input type="number" value={form.next_odometer} onChange={e => fld('next_odometer', e.target.value)} placeholder="e.g. 50000"
                      style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={3} placeholder="Any additional notes about this service…"
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <Btn onClick={closeModal}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving || !form.vehicle_id || !form.date || form.service_types.length === 0}>
                {saving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>{modal === 'add' ? 'Log Service' : 'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}