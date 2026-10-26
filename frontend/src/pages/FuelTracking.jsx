import { useState, useMemo } from 'react'
import {
  Plus, Edit, Trash2, Fuel, X, Save, Search,
  TrendingDown, DollarSign, Droplets, Activity,
  Calendar, Gauge, MapPin, ChevronDown,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { C }       from '../constants/colors.js'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import PageHeader  from '../components/ui/PageHeader.jsx'
import {
  LoadingStyles, Spinner, LoadingBar,
  Skel, SkeletonRows, SavingOverlay,
} from '../components/Loading.jsx'

const BORDER = '1px solid #E2E8F0'
const BLANK = {
  vehicle_id:'', vehicle_name:'', date:'', liters:'',
  cost_per_liter:'', total_cost:'', odometer:'',
  fuel_type:'Gasoline', station:'', full_tank:true, notes:'',
}

/* ── Custom recharts tooltip ──────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'white', borderRadius:10, padding:'10px 14px', border:BORDER, boxShadow:'0 4px 16px rgba(0,0,0,.08)', fontSize:12 }}>
      <div style={{ color:C.navy, fontWeight:700, marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, marginBottom:2 }}>
          {p.name}: <b>{p.value}</b> {p.dataKey==='consumption'?'L/100km':p.dataKey==='cost'?'$':'km'}
        </div>
      ))}
    </div>
  )
}

export default function FuelTracking() {
  const { data:logs,     setData:setLogs,  loading   } = useApi(api.fuel.list)
  const { data:vehicles                              } = useApi(api.vehicles.list)

  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [vFilter, setVFilter] = useState('')
  const [chartTab, setChartTab] = useState('consumption')  // consumption | cost

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ── Auto-calc total cost when liters or price changes ─── */
  const handleLiters = v => {
    fld('liters', v)
    const total = (Number(v) * Number(form.cost_per_liter)).toFixed(2)
    if (Number(v) && Number(form.cost_per_liter)) fld('total_cost', total)
  }
  const handleCPL = v => {
    fld('cost_per_liter', v)
    const total = (Number(form.liters) * Number(v)).toFixed(2)
    if (Number(form.liters) && Number(v)) fld('total_cost', total)
  }

  /* ── Derived stats ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const src = vFilter ? logs.filter(l => String(l.vehicle_id) === vFilter) : logs
    const totalLiters = src.reduce((s, l) => s + Number(l.liters || 0), 0)
    const totalCost   = src.reduce((s, l) => s + Number(l.total_cost || 0), 0)
    const withDist    = src.filter(l => l.distance_since_last > 0)
    const avgConsump  = withDist.length
      ? withDist.reduce((s, l) => s + (Number(l.liters)/l.distance_since_last*100), 0) / withDist.length
      : 0
    const avgCostKm   = withDist.length
      ? withDist.reduce((s, l) => s + Number(l.total_cost)/l.distance_since_last, 0) / withDist.length
      : 0
    return { totalLiters, totalCost, avgConsump, avgCostKm, count: src.length }
  }, [logs, vFilter])

  /* ── Chart data (last 10 fill-ups) ────────────────────── */
  const chartData = useMemo(() => {
    const src = (vFilter ? logs.filter(l => String(l.vehicle_id) === vFilter) : logs)
      .filter(l => l.distance_since_last > 0)
      .slice(-10)
      .map(l => ({
        date:        l.date,
        consumption: Number((Number(l.liters)/l.distance_since_last*100).toFixed(2)),
        cost:        Number(Number(l.total_cost).toFixed(2)),
        liters:      Number(l.liters),
      }))
    return src
  }, [logs, vFilter])

  /* ── Filtered table rows ───────────────────────────────── */
  const filtered = useMemo(() => logs.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.vehicle_name?.toLowerCase().includes(q) || l.station?.toLowerCase().includes(q)
    const matchV = !vFilter || String(l.vehicle_id) === vFilter
    return matchSearch && matchV
  }), [logs, search, vFilter])

  /* ── Modals ────────────────────────────────────────────── */
  const openAdd = () => {
    setForm({ ...BLANK, date: new Date().toISOString().slice(0,10) })
    setEditId(null); setModal('add')
  }
  const openEdit = row => {
    setForm({
      vehicle_id:    String(row.vehicle_id),
      vehicle_name:  row.vehicle_name,
      date:          row.date,
      liters:        String(row.liters),
      cost_per_liter:String(row.cost_per_liter),
      total_cost:    String(row.total_cost),
      odometer:      String(row.odometer),
      fuel_type:     row.fuel_type || 'Gasoline',
      station:       row.station || '',
      full_tank:     row.full_tank !== false,
      notes:         row.notes || '',
    })
    setEditId(row.log_id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null) }

  const save = async () => {
    if (!form.vehicle_id || !form.date || !form.liters) { alert('Vehicle, date, and liters are required'); return }
    setSaving(true)
    try {
      const vName = vehicles.find(v => String(v.vehicle_id) === form.vehicle_id)?.name || form.vehicle_name
      const payload = {
        ...form,
        vehicle_name:  vName,
        liters:        Number(form.liters),
        cost_per_liter:Number(form.cost_per_liter) || 0,
        total_cost:    Number(form.total_cost)     || 0,
        odometer:      Number(form.odometer)       || 0,
      }
      if (modal === 'add') {
        const r = await api.fuel.create(payload)
        setLogs(p => [r, ...p])
      } else {
        const r = await api.fuel.update(editId, payload)
        setLogs(p => p.map(l => l.log_id === editId ? r : l))
      }
      closeModal()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!window.confirm('Delete this fuel record?')) return
    try { await api.fuel.delete(id); setLogs(p => p.filter(l => l.log_id !== id)) }
    catch (e) { alert(e.message) }
  }

  const fmt2 = v => Number(v).toLocaleString('en', { minimumFractionDigits:2, maximumFractionDigits:2 })

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      <PageHeader title="Fuel Tracking" subtitle={loading ? 'Loading…' : stats.count + ' fuel records'}>
        {loading && <Spinner size={20}/>}
        <select value={vFilter} onChange={e => setVFilter(e.target.value)}
          style={{ padding:'8px 14px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name}</option>)}
        </select>
        <Btn variant="primary" onClick={openAdd}><Plus size={14}/> Log Fuel</Btn>
      </PageHeader>
      <LoadingBar show={loading}/>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, margin:'20px 0' }}>
        {loading ? Array.from({length:4}).map((_,i) => (
          <Card key={i} style={{ padding:'16px' }}>
            <Skel w={36} h={36} r={10} style={{ marginBottom:12 }}/><Skel h={26} r={6} style={{ marginBottom:8 }}/><Skel w="60%" h={12} r={5}/>
          </Card>
        )) : [
          ['Total Fuel',       stats.totalLiters.toFixed(1) + ' L',  Droplets,    '#3B82F6'],
          ['Total Cost',       '$' + fmt2(stats.totalCost),           DollarSign,  C.green  ],
          ['Avg Consumption',  stats.avgConsump.toFixed(2) + ' L/100km', TrendingDown, C.amber],
          ['Avg Cost / km',    '$' + stats.avgCostKm.toFixed(3),      Activity,    C.red    ],
        ].map(([l, v, Icon, c]) => (
          <Card key={l} style={{ padding:'18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{l}</div>
              <div style={{ color:C.navy, fontWeight:800, fontSize:20 }}>{v}</div>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={19} color={c}/>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────── */}
      <Card style={{ marginBottom:18 }}>
        <div style={{ padding:'16px 20px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:700, fontSize:15, color:C.navy }}>Fuel Trend — Last 10 Fill-ups</div>
          <div style={{ display:'flex', gap:4, background:'#F8FAFC', borderRadius:8, padding:3, border:BORDER }}>
            {[['consumption','Consumption (L/100km)'],['cost','Total Cost ($)']].map(([id, label]) => (
              <button key={id} onClick={() => setChartTab(id)}
                style={{ padding:'5px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:chartTab===id?700:400, background:chartTab===id?C.accent:'transparent', color:chartTab===id?'white':C.muted }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'16px 20px' }}>
          {loading ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32}/></div>
          ) : chartData.length === 0 ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:C.faint, fontSize:13 }}>No data yet — log at least 2 fill-ups to see trends</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartTab==='consumption'?C.amber:C.green} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={chartTab==='consumption'?C.amber:C.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="date" tick={{ fontSize:11 }} tickLine={false}/>
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey={chartTab} name={chartTab==='consumption'?'Consumption':'Cost'}
                  stroke={chartTab==='consumption'?C.amber:C.green} strokeWidth={2.5}
                  fill="url(#cg)" dot={{ r:4, fill:chartTab==='consumption'?C.amber:C.green }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Table ──────────────────────────────────────── */}
      <Card>
        <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:9, padding:'8px 12px', border:BORDER }}>
            <Search size={14} color={C.faint}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle or station…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          </div>
          <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} records</div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Vehicle','Date','Liters','Cost/L','Total Cost','Odometer','Distance','Consumption','Station','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows n={6} cols={['12%','9%','8%','8%','9%','10%','9%','11%','10%','10%']}/>
              ) : filtered.map(l => {
                const consump = l.distance_since_last > 0
                  ? (Number(l.liters)/l.distance_since_last*100).toFixed(1)
                  : null
                return (
                  <tr key={l.log_id} style={{ borderBottom:'1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Droplets size={14} color={C.green}/>
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:C.navy, fontSize:13 }}>{l.vehicle_name}</div>
                          <div style={{ fontSize:10, color:C.faint }}>{l.fuel_type}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{l.date}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#3B82F6' }}>{Number(l.liters).toFixed(2)} L</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>${Number(l.cost_per_liter).toFixed(3)}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:C.green }}>${fmt2(l.total_cost)}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{Number(l.odometer).toLocaleString()} km</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{l.distance_since_last > 0 ? l.distance_since_last + ' km' : '—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      {consump ? (
                        <span style={{ background: Number(consump)>12?'#FEF2F2':Number(consump)<8?'#ECFDF5':'#FFFBEB', color:Number(consump)>12?C.red:Number(consump)<8?C.green:C.amber, fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                          {consump} L/100km
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{l.station || '—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:7 }}>
                        <button onClick={() => openEdit(l)} style={{ background:C.accentL, border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.accent, fontSize:12, fontWeight:600 }}>
                          <Edit size={12}/> Edit
                        </button>
                        <button onClick={() => del(l.log_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.red, fontSize:12, fontWeight:600 }}>
                          <Trash2 size={12}/> Del
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:52, color:C.faint }}>
              <Droplets size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
              <div style={{ fontWeight:600, fontSize:15, color:C.muted, marginBottom:6 }}>No fuel records</div>
              <div style={{ fontSize:13 }}>Tap "Log Fuel" to add your first entry.</div>
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative' }}>
            <SavingOverlay show={saving}/>

            <div style={{ padding:'20px 24px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{modal === 'add' ? 'Log Fuel Fill-up' : 'Edit Fuel Record'}</div>
                <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>Total cost auto-calculates from liters × price</div>
              </div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Vehicle *</label>
                  <select value={form.vehicle_id} onChange={e => { const v = vehicles.find(x => String(x.vehicle_id)===e.target.value); fld('vehicle_id', e.target.value); if(v) fld('vehicle_name', v.name) }}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name} — {v.plate}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => fld('date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              {/* Fuel numbers */}
              <div style={{ background:'#F0FDF4', borderRadius:10, padding:'14px', border:'1px solid #A7F3D0' }}>
                <div style={{ color:C.green, fontWeight:700, fontSize:12, marginBottom:10 }}>⛽ Fuel Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Liters *</label>
                    <input type="number" step="0.01" value={form.liters} onChange={e => handleLiters(e.target.value)} placeholder="e.g. 45.5"
                      style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Cost per Liter ($)</label>
                    <input type="number" step="0.001" value={form.cost_per_liter} onChange={e => handleCPL(e.target.value)} placeholder="e.g. 1.050"
                      style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Total Cost ($)</label>
                    <input type="number" step="0.01" value={form.total_cost} onChange={e => fld('total_cost', e.target.value)} placeholder="auto-calc"
                      style={{ width:'100%', padding:'10px 12px', border:'1px solid '+C.green, borderRadius:9, fontSize:13, fontWeight:600, color:C.green, outline:'none', boxSizing:'border-box', background:'white' }}/>
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Odometer (km)</label>
                  <input type="number" value={form.odometer} onChange={e => fld('odometer', e.target.value)} placeholder="e.g. 45000"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => fld('fuel_type', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    {['Gasoline','Diesel','Electric'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'end' }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Gas Station</label>
                  <input value={form.station} onChange={e => fld('station', e.target.value)} placeholder="e.g. PTT, Caltex, Total"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'10px 0', fontSize:13, color:C.navy, whiteSpace:'nowrap' }}>
                  <input type="checkbox" checked={form.full_tank} onChange={e => fld('full_tank', e.target.checked)} style={{ width:16, height:16 }}/>
                  Full tank
                </label>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="Any notes…"
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <Btn onClick={closeModal}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving || !form.vehicle_id || !form.date || !form.liters}>
                {saving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>{modal === 'add' ? 'Log Fuel' : 'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}