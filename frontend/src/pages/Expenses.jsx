import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Receipt, X, Save, Search, DollarSign, TrendingUp, Wrench, Fuel,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { C }       from '../constants/colors.js'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import PageHeader  from '../components/ui/PageHeader.jsx'
import { useConfirm, useToast } from '../components/ui/UIProvider.jsx'
import {
  LoadingStyles, Spinner, LoadingBar,
  SkeletonRows, SavingOverlay,
} from '../components/Loading.jsx'

const BORDER = '1px solid #E2E8F0'
const CATEGORIES = [
  ['repair',    'Repair'],
  ['parts',     'Parts'],
  ['fuel',      'Fuel'],
  ['insurance', 'Insurance'],
  ['document',  'Document/Permit'],
  ['fine',      'Fine'],
  ['other',     'Other'],
]
const CAT_COLOR = {
  repair:C.red, parts:C.blue, fuel:C.amber, insurance:C.purple,
  document:'#0891B2', fine:'#334155', other:C.muted,
}
const BLANK = { vehicle_name:'', category:'repair', amount:'', date:'', description:'', receipt_no:'', notes:'' }

export default function Expenses() {
  const confirm = useConfirm()
  const toast   = useToast()
  const { data:expenses, setData:setExpenses, loading } = useApi(api.expenses.list)

  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stats = useMemo(() => {
    const total = expenses.reduce((s,e) => s + Number(e.amount || 0), 0)
    const count = expenses.length
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date); const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s,e) => s + Number(e.amount || 0), 0)
    const avg = count ? total / count : 0
    return { total, count, thisMonth, avg }
  }, [expenses])

  const byCategory = useMemo(() => {
    const map = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0) })
    return Object.entries(map).map(([cat, value]) => ({ name: CATEGORIES.find(([id]) => id===cat)?.[1] || cat, value, cat }))
  }, [expenses])

  const filtered = useMemo(() => expenses.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.vehicle_name?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
    const matchCat = !catFilter || e.category === catFilter
    return matchSearch && matchCat
  }), [expenses, search, catFilter])

  const openAdd = () => { setForm({ ...BLANK, date: new Date().toISOString().slice(0,10) }); setEditId(null); setModal('add') }
  useEffect(() => {
    if (sessionStorage.getItem('kvh_menu_add') === 'expenses') { sessionStorage.removeItem('kvh_menu_add'); openAdd() }
  }, [])
  const openEdit = row => {
    setForm({
      vehicle_name: row.vehicle_name || '',
      category: row.category, amount: String(row.amount), date: row.date,
      description: row.description || '', receipt_no: row.receipt_no || '', notes: row.notes || '',
    })
    setEditId(row.expense_id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null) }

  const save = async () => {
    if (!form.amount || !form.date) { toast('Amount and date are required', 'warning'); return }
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      const wasAdd = modal === 'add'
      if (wasAdd) {
        const r = await api.expenses.create(payload)
        setExpenses(p => [r, ...p])
      } else {
        const r = await api.expenses.update(editId, payload)
        setExpenses(p => p.map(e => e.expense_id === editId ? r : e))
      }
      closeModal()
      toast(wasAdd ? 'Added successfully.' : 'Updated successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!(await confirm('Delete this expense?', { danger: true }))) return
    try { await api.expenses.delete(id); setExpenses(p => p.filter(e => e.expense_id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const catLabel = c => CATEGORIES.find(([id]) => id===c)?.[1] || c
  const fmt2 = v => Number(v).toLocaleString('en', { minimumFractionDigits:2, maximumFractionDigits:2 })

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      <PageHeader title="Expenses" subtitle={loading ? 'Loading…' : stats.count + ' expense records'}>
        {loading && <Spinner size={20}/>}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding:'8px 14px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <Btn variant="primary" onClick={openAdd}><Plus size={14}/> Add Expense</Btn>
      </PageHeader>
      <LoadingBar show={loading}/>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, margin:'20px 0' }}>
        {[
          ['Total Spent',   '$'+fmt2(stats.total),     DollarSign, C.red  ],
          ['This Month',    '$'+fmt2(stats.thisMonth),  TrendingUp, C.amber],
          ['Avg per Entry', '$'+fmt2(stats.avg),        Receipt,    C.blue ],
          ['Records',       stats.count,                 Wrench,     C.green],
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

      {/* ── Breakdown chart ─────────────────────────────── */}
      <Card style={{ marginBottom:18 }}>
        <div style={{ padding:'16px 20px', borderBottom:BORDER, fontWeight:700, fontSize:15, color:C.navy }}>Spending by Category</div>
        <div style={{ padding:'16px 20px' }}>
          {loading ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32}/></div>
          ) : byCategory.length === 0 ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:C.faint, fontSize:13 }}>No expenses yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {byCategory.map((entry, i) => <Cell key={i} fill={CAT_COLOR[entry.cat] || C.muted}/>)}
                </Pie>
                <Tooltip formatter={v => '$'+fmt2(v)}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Table ──────────────────────────────────────── */}
      <Card>
        <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:9, padding:'8px 12px', border:BORDER }}>
            <Search size={14} color={C.faint}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle or description…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          </div>
          <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} records</div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Vehicle','Category','Date','Amount','Description','Receipt #','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows n={6} cols={['16%','14%','10%','10%','26%','12%','12%']}/>
              ) : filtered.map(e => (
                <tr key={e.expense_id} style={{ borderBottom:'1px solid #F8FAFC' }}
                  onMouseEnter={ev => ev.currentTarget.style.background='#FAFBFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:(CAT_COLOR[e.category]||C.muted)+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Receipt size={14} color={CAT_COLOR[e.category]||C.muted}/>
                      </div>
                      <div style={{ fontWeight:600, color:C.navy, fontSize:13 }}>{e.vehicle_name || '—'}</div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:(CAT_COLOR[e.category]||C.muted)+'18', color:CAT_COLOR[e.category]||C.muted, fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{catLabel(e.category)}</span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{e.date}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:C.red }}>${fmt2(e.amount)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{e.description || '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{e.receipt_no || '—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:7 }}>
                      <button onClick={() => openEdit(e)} style={{ background:C.accentL, border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.accent, fontSize:12, fontWeight:600 }}>
                        <Edit size={12}/> Edit
                      </button>
                      <button onClick={() => del(e.expense_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.red, fontSize:12, fontWeight:600 }}>
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
              <Receipt size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
              <div style={{ fontWeight:600, fontSize:15, color:C.muted, marginBottom:6 }}>No expenses yet</div>
              <div style={{ fontSize:13 }}>Tap "Add Expense" to log repair costs, fines, and more.</div>
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
              <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{modal === 'add' ? 'Add Expense' : 'Edit Expense'}</div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Name / Vehicle (optional)</label>
                  <input value={form.vehicle_name} onChange={e => fld('vehicle_name', e.target.value)} placeholder="e.g. Motor_1, Office rent…"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Category</label>
                  <select value={form.category} onChange={e => fld('category', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    {CATEGORIES.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Amount ($) *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => fld('amount', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => fld('date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Description</label>
                <input value={form.description} onChange={e => fld('description', e.target.value)} placeholder="What was this for?"
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Receipt / Reference #</label>
                <input value={form.receipt_no} onChange={e => fld('receipt_no', e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2}
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:BORDER, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <Btn onClick={closeModal}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving || !form.amount || !form.date}>
                {saving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>{modal === 'add' ? 'Add Expense' : 'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
