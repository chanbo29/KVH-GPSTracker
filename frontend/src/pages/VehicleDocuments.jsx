import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Edit, Trash2, FileText, X, Save, Search, AlertTriangle, ShieldCheck, Clock,
} from 'lucide-react'
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
const DOC_TYPES = [
  ['insurance',    'Insurance'],
  ['road_tax',     'Road Tax'],
  ['inspection',   'Inspection'],
  ['registration', 'Registration'],
  ['permit',       'Permit'],
  ['other',        'Other'],
]
const BLANK = {
  vehicle_name:'', doc_type:'insurance', document_number:'',
  issuer:'', issue_date:'', expiry_date:'', cost:'0', notes:'',
}

function expiryInfo(doc) {
  if (!doc.expiry_date) return { label:'Unknown', bg:'#F8FAFC', fg:C.muted }
  const days = Math.floor((new Date(doc.expiry_date) - new Date()) / 86400000)
  if (days < 0)  return { label:'Expired',       bg:C.redL,   fg:C.red,   days }
  if (days <= 30) return { label:`Expires in ${days}d`, bg:C.amberL, fg:C.amber, days }
  return            { label:'Valid',             bg:C.greenL, fg:C.green, days }
}

export default function VehicleDocuments() {
  const confirm = useConfirm()
  const toast   = useToast()
  const { data:docs, setData:setDocs, loading } = useApi(api.vehicleDocuments.list)

  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stats = useMemo(() => {
    const total   = docs.length
    const expired = docs.filter(d => expiryInfo(d).label === 'Expired').length
    const soon    = docs.filter(d => expiryInfo(d).label.startsWith('Expires')).length
    const valid   = total - expired - soon
    return { total, expired, soon, valid }
  }, [docs])

  const filtered = useMemo(() => docs.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.vehicle_name?.toLowerCase().includes(q) || d.document_number?.toLowerCase().includes(q)
    const matchType = !typeFilter || d.doc_type === typeFilter
    return matchSearch && matchType
  }), [docs, search, typeFilter])

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal('add') }
  useEffect(() => {
    if (sessionStorage.getItem('kvh_menu_add') === 'documents') { sessionStorage.removeItem('kvh_menu_add'); openAdd() }
  }, [])
  const openEdit = row => {
    setForm({
      vehicle_name: row.vehicle_name, doc_type: row.doc_type,
      document_number: row.document_number || '', issuer: row.issuer || '',
      issue_date: row.issue_date || '', expiry_date: row.expiry_date || '',
      cost: String(row.cost || 0), notes: row.notes || '',
    })
    setEditId(row.document_id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setForm(BLANK); setEditId(null) }

  const save = async () => {
    if (!form.vehicle_name || !form.expiry_date) { toast('Name and expiry date are required', 'warning'); return }
    setSaving(true)
    try {
      const payload = { ...form, cost: Number(form.cost) || 0 }
      const wasAdd = modal === 'add'
      if (wasAdd) {
        const r = await api.vehicleDocuments.create(payload)
        setDocs(p => [r, ...p])
      } else {
        const r = await api.vehicleDocuments.update(editId, payload)
        setDocs(p => p.map(d => d.document_id === editId ? r : d))
      }
      closeModal()
      toast(wasAdd ? 'Added successfully.' : 'Updated successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!(await confirm('Delete this document record?', { danger: true }))) return
    try { await api.vehicleDocuments.delete(id); setDocs(p => p.filter(d => d.document_id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const typeLabel = t => DOC_TYPES.find(([id]) => id === t)?.[1] || t

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      <PageHeader title="Vehicle Documents" subtitle={loading ? 'Loading…' : stats.total + ' documents tracked'}>
        {loading && <Spinner size={20}/>}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding:'8px 14px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
          <option value="">All Types</option>
          {DOC_TYPES.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <Btn variant="primary" onClick={openAdd}><Plus size={14}/> Add Document</Btn>
      </PageHeader>
      <LoadingBar show={loading}/>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, margin:'20px 0' }}>
        {[
          ['Total Documents', stats.total,   FileText,      C.blue  ],
          ['Valid',            stats.valid,   ShieldCheck,   C.green ],
          ['Expiring Soon',    stats.soon,    Clock,         C.amber ],
          ['Expired',          stats.expired, AlertTriangle, C.red   ],
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle or document number…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:C.navy, background:'none' }}/>
          </div>
          <div style={{ color:C.faint, fontSize:12, whiteSpace:'nowrap' }}>{filtered.length} documents</div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Vehicle','Type','Document #','Issuer','Expiry Date','Cost','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows n={6} cols={['16%','12%','14%','14%','12%','10%','12%','10%']}/>
              ) : filtered.map(d => {
                const info = expiryInfo(d)
                return (
                  <tr key={d.document_id} style={{ borderBottom:'1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:C.blueL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <FileText size={14} color={C.blue}/>
                        </div>
                        <div style={{ fontWeight:600, color:C.navy, fontSize:13 }}>{d.vehicle_name}</div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{typeLabel(d.doc_type)}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{d.document_number || '—'}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{d.issuer || '—'}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{d.expiry_date}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>${Number(d.cost).toFixed(2)}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ background:info.bg, color:info.fg, fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{info.label}</span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:7 }}>
                        <button onClick={() => openEdit(d)} style={{ background:C.accentL, border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.accent, fontSize:12, fontWeight:600 }}>
                          <Edit size={12}/> Edit
                        </button>
                        <button onClick={() => del(d.document_id)} style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.red, fontSize:12, fontWeight:600 }}>
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
              <FileText size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
              <div style={{ fontWeight:600, fontSize:15, color:C.muted, marginBottom:6 }}>No documents yet</div>
              <div style={{ fontSize:13 }}>Tap "Add Document" to track insurance, road tax, and more.</div>
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
              <div style={{ fontWeight:800, fontSize:18, color:C.navy }}>{modal === 'add' ? 'Add Document' : 'Edit Document'}</div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:9, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Name / Vehicle *</label>
                  <input value={form.vehicle_name} onChange={e => fld('vehicle_name', e.target.value)} placeholder="e.g. Motor_1, Office Building…"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Document Type</label>
                  <select value={form.doc_type} onChange={e => fld('doc_type', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
                    {DOC_TYPES.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Document Number</label>
                  <input value={form.document_number} onChange={e => fld('document_number', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Issuer / Provider</label>
                  <input value={form.issuer} onChange={e => fld('issuer', e.target.value)} placeholder="e.g. Forte Insurance"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Issue Date</label>
                  <input type="date" value={form.issue_date} onChange={e => fld('issue_date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Expiry Date *</label>
                  <input type="date" value={form.expiry_date} onChange={e => fld('expiry_date', e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:5 }}>Cost ($)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => fld('cost', e.target.value)}
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
              <Btn variant="primary" onClick={save} disabled={saving || !form.vehicle_name || !form.expiry_date}>
                {saving ? <><Spinner size={14} color="white"/> Saving…</> : <><Save size={14}/>{modal === 'add' ? 'Add Document' : 'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
