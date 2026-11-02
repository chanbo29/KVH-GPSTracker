import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Package, X, Save, Search,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, Boxes,
} from 'lucide-react'
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
const CATEGORIES = ['Engine','Brakes','Tires','Electrical','Body','Filters','Fluids','Other']
const BLANK = {
  name:'', part_number:'', category:'Other', unit:'pcs', quantity:'0',
  reorder_level:'0', unit_price:'0', supplier:'', location:'', notes:'',
}
const MOVE_BLANK = { movement_type:'in', quantity:'', vehicle_id:'', vehicle_name:'', date:'', reference:'', notes:'' }

function stockBadge(part) {
  const q = Number(part.quantity), r = Number(part.reorder_level)
  if (q <= 0)  return { label:'Out of Stock', bg:C.redL,   fg:C.red   }
  if (q <= r)  return { label:'Low Stock',    bg:C.amberL, fg:C.amber }
  return          { label:'In Stock',       bg:C.greenL, fg:C.green }
}

export default function SparePartsInventory() {
  const { data:parts, setData:setParts, loading } = useApi(api.spareparts.list)
  const { data:vehicles }                         = useApi(api.vehicles.list)

  const [modal,  setModal]  = useState(null)   // 'add' | 'edit'
  const [form,   setForm]   = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const [moveFor, setMoveFor] = useState(null)   // part row while the stock-move modal is open
  const [moveForm, setMoveForm] = useState(MOVE_BLANK)
  const [moveSaving, setMoveSaving] = useState(false)

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const mfld = (k, v) => setMoveForm(f => ({ ...f, [k]: v }))

  const stats = useMemo(() => {
    const total   = parts.length
    const low     = parts.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorder_level)).length
    const out     = parts.filter(p => Number(p.quantity) <= 0).length
    const value   = parts.reduce((s,p) => s + Number(p.quantity) * Number(p.unit_price), 0)
    return { total, low, out, value }
  }, [parts])

  const filtered = useMemo(() => parts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q)
    const matchCat = !catFilter || p.category === catFilter
    return matchSearch && matchCat
  }), [parts, search, catFilter])

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal('add') }
  useEffect(() => {
    if (sessionStorage.getItem('kvh_menu_add') === 'spareparts') { sessionStorage.removeItem('kvh_menu_add'); openAdd() }
  }, [])
  const openEdit = row => {
    setForm({
      name:row.name, part_number:row.part_number||'', category:row.category||'Other',
      unit:row.unit||'pcs', quantity:String(row.quantity), reorder_level:String(row.reorder_level),
      unit_price:String(row.unit_price), supplier:row.supplier||'', location:row.location||'', notes:row.notes||'',
    })
    setEditId(row.part_id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null) }

  const save = async () => {
    if (!form.name) { alert('Part name is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        unit_price: Number(form.unit_price) || 0,
      }
      if (modal === 'add') {
        const r = await api.spareparts.create(payload)
        setParts(p => [r, ...p])
      } else {
        const r = await api.spareparts.update(editId, payload)
        setParts(p => p.map(x => x.part_id === editId ? r : x))
      }
      closeModal()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!window.confirm('Delete this spare part?')) return
    try { await api.spareparts.delete(id); setParts(p => p.filter(x => x.part_id !== id)) }
    catch (e) { alert(e.message) }
  }

  const openMove = (part, type) => {
    setMoveFor(part)
    setMoveForm({ ...MOVE_BLANK, movement_type:type, date:new Date().toISOString().slice(0,10) })
  }
  const closeMove = () => { setMoveFor(null); setMoveForm(MOVE_BLANK) }

  const saveMove = async () => {
    if (!moveForm.quantity || Number(moveForm.quantity) <= 0) { alert('Enter a quantity'); return }
    setMoveSaving(true)
    try {
      const vName = vehicles.find(v => String(v.vehicle_id) === moveForm.vehicle_id)?.name || moveForm.vehicle_name
      await api.stockMovements.create({
        ...moveForm, part: moveFor.part_id, vehicle_name: vName,
        quantity: Number(moveForm.quantity),
        vehicle_id: moveForm.vehicle_id || null,
      })
      const delta = moveForm.movement_type === 'in' ? Number(moveForm.quantity) : -Number(moveForm.quantity)
      setParts(p => p.map(x => x.part_id === moveFor.part_id ? { ...x, quantity: Number(x.quantity) + delta } : x))
      closeMove()
    } catch (e) { alert(e.message) }
    finally { setMoveSaving(false) }
  }

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      <PageHeader title="Spare Parts Inventory" subtitle={loading ? 'Loading…' : stats.total + ' parts tracked'}>
        {loading && <Spinner size={20}/>}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding:'8px 14px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Btn variant="primary" onClick={openAdd}><Plus size={14}/> Add Part</Btn>
      </PageHeader>
      <LoadingBar show={loading}/>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, margin:'20px 0' }}>
        {loading ? Array.from({length:4}).map((_,i) => (
          <Card key={i} style={{ padding:'16px' }}>
            <Skel w={36} h={36} r={10} style={{ marginBottom:12 }}/><Skel h={26} r={6} style={{ marginBottom:8 }}/><Skel w="60%" h={12} r={5}/>
          </Card>
        )) : [
          ['Total Parts',   stats.total,                 Boxes,         C.blue  ],
          ['Low Stock',     stats.low,                    AlertTriangle, C.amber ],
          ['Out of Stock',  stats.out,                    AlertTriangle, C.red   ],
          ['Inventory Value', '$'+stats.value.toLocaleString('en',{maximumFractionDigits:2}), Package, C.green],
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

      {/* ── Table ──────────────────────────────────────── */}
      <Card>
        <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:9, padding:'8px 12px', border:BORDER }}>
            <Search size={14} color={C.faint}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search part name or number…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          </div>
          <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} parts</div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Part','Category','Qty','Reorder At','Unit Price','Supplier','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows n={6} cols={['18%','12%','8%','10%','10%','14%','12%','16%']}/>
              ) : filtered.map(p => {
                const badge = stockBadge(p)
                return (
                  <tr key={p.part_id} style={{ borderBottom:'1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:C.blueL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Package size={14} color={C.blue}/>
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:C.navy, fontSize:13 }}>{p.name}</div>
                          <div style={{ fontSize:10, color:C.faint }}>{p.part_number || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{p.category}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:C.navy }}>{p.quantity} {p.unit}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{p.reorder_level} {p.unit}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>${Number(p.unit_price).toFixed(2)}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{p.supplier || '—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ background:badge.bg, color:badge.fg, fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{badge.label}</span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button onClick={() => openMove(p, 'in')} title="Stock In" style={{ background:C.greenL, border:'none', borderRadius:7, padding:'6px 8px', cursor:'pointer', display:'flex', alignItems:'center', color:C.green }}>
                          <ArrowDownCircle size={14}/>
                        </button>
                        <button onClick={() => openMove(p, 'out')} title="Stock Out" style={{ background:C.amberL, border:'none', borderRadius:7, padding:'6px 8px', cursor:'pointer', display:'flex', alignItems:'center', color:C.amber }}>
                          <ArrowUpCircle size={14}/>
                        </button>
                        <button onClick={() => openEdit(p)} style={{ background:C.accentL, border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.accent, fontSize:12, fontWeight:600 }}>
                          <Edit size={12}/>
                        </button>
                        <button onClick={() => del(p.part_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.red, fontSize:12, fontWeight:600 }}>
                          <Trash2 size={12}/>
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
              <Package size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
              <div style={{ fontWeight:600, fontSize:15, color:C.muted, marginBottom:6 }}>No spare parts yet</div>
              <div style={{ fontSize:13 }}>Tap "Add Part" to start tracking inventory.</div>
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT PART MODAL
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative' }}>
            <SavingOverlay show={saving}/>
            <div style={{ padding:'20px 24px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{modal === 'add' ? 'Add Spare Part' : 'Edit Spare Part'}</div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Part Name *</label>
                  <input value={form.name} onChange={e => fld('name', e.target.value)} placeholder="e.g. Brake Pad Set"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Part Number</label>
                  <input value={form.part_number} onChange={e => fld('part_number', e.target.value)} placeholder="e.g. BP-2201"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Category</label>
                  <select value={form.category} onChange={e => fld('category', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Unit</label>
                  <input value={form.unit} onChange={e => fld('unit', e.target.value)} placeholder="pcs, set, liter…"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => fld('quantity', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Reorder Level</label>
                  <input type="number" value={form.reorder_level} onChange={e => fld('reorder_level', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Unit Price ($)</label>
                  <input type="number" step="0.01" value={form.unit_price} onChange={e => fld('unit_price', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Supplier</label>
                  <input value={form.supplier} onChange={e => fld('supplier', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Storage Location</label>
                  <input value={form.location} onChange={e => fld('location', e.target.value)} placeholder="e.g. Shelf A3"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2}
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <Btn onClick={closeModal}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving || !form.name}>
                {saving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>{modal === 'add' ? 'Add Part' : 'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STOCK IN / OUT MODAL
      ══════════════════════════════════════════════════════ */}
      {moveFor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:460, position:'relative' }}>
            <SavingOverlay show={moveSaving}/>
            <div style={{ padding:'20px 24px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{moveForm.movement_type === 'in' ? 'Stock In' : 'Stock Out'}</div>
                <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>{moveFor.name} — currently {moveFor.quantity} {moveFor.unit}</div>
              </div>
              <button onClick={closeMove} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', gap:4, background:'#F8FAFC', borderRadius:8, padding:3, border:BORDER }}>
                {[['in','Stock In'],['out','Stock Out']].map(([id, label]) => (
                  <button key={id} onClick={() => mfld('movement_type', id)}
                    style={{ flex:1, padding:'7px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12.5, fontWeight:moveForm.movement_type===id?700:400, background:moveForm.movement_type===id?(id==='in'?C.green:C.amber):'transparent', color:moveForm.movement_type===id?'white':C.muted }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Quantity *</label>
                  <input type="number" value={moveForm.quantity} onChange={e => mfld('quantity', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Date</label>
                  <input type="date" value={moveForm.date} onChange={e => mfld('date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              {moveForm.movement_type === 'out' && (
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Used for Vehicle (optional)</label>
                  <select value={moveForm.vehicle_id} onChange={e => mfld('vehicle_id', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    <option value="">—</option>
                    {vehicles.map(v => <option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name} — {v.plate}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Reference / Note</label>
                <input value={moveForm.reference} onChange={e => mfld('reference', e.target.value)} placeholder="PO number, job ticket…"
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn onClick={closeMove}>Cancel</Btn>
              <Btn variant="primary" onClick={saveMove} disabled={moveSaving || !moveForm.quantity}>
                {moveSaving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>Confirm</>}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
