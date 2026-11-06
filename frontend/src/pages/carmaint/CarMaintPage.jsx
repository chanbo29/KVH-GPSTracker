import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Plus, Edit, Trash2, X, Save, Search, Eye, ArrowUp, MapPin } from 'lucide-react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { LoadingStyles, Spinner, LoadingBar, SkeletonRows, SavingOverlay } from '../../components/Loading.jsx'
import MenuGridIcon from '../../components/icons/MenuGridIcon.jsx'
import { t } from '../../constants/i18n.js'
import { useFontScale } from '../../constants/fontScale.js'
import { useConfirm, useToast } from '../../components/ui/UIProvider.jsx'

/* ──────────────────────────────────────────────────────────────────
   Generic list + Add/Edit page styled after the reference Khmer
   "CARS MAINTENANCE" screen — a blue title bar over a flat gray
   panel, instead of this app's usual white-card look. One component
   powers all 18 Car Maintenance features; each feature just passes
   its own `config` (see constants/cm_configs.js).

   Full-screen: App.jsx renders this page with no Sidebar/Header, so
   this component owns the whole viewport and its own scroll — the
   root <div> below (ref=scrollRef) is the one scrollable element,
   which is also what the "scroll to top" button and the back-to-Menu
   icon in the title bar both work against.

   Data lives in the separate `carmaint` database (backend/carmaint
   app) — completely standalone from the Vehicles/Drivers tables.
   Reachable only from the Menu page, never listed in the Sidebar.
   ────────────────────────────────────────────────────────────────── */

const BLUE   = '#1D63D8'
const BLUE_D = '#164FAE'
const PANEL  = '#EDEFF2'
const BORDER = '1px solid #D7DBE0'
const BG     = '#F4F6F8'

function blankForm(fields) {
  const f = {}
  fields.forEach(fl => { f[fl.key] = fl.type === 'checkbox' ? false : '' })
  return f
}

function fmtValue(v, type) {
  if (v === null || v === undefined || v === '') return '—'
  if (type === 'checkbox') return v ? 'Yes' : 'No'
  return String(v)
}

/* Searchable combobox for `type: 'vehicleSelect'` fields — lets the
   user pick a plate number from the Vehicle Table (VehicleRoster)
   instead of free-typing it. `options` is an array of plate_number
   strings fetched once by the parent. */
function VehicleSearchSelect({ value, onChange, options }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    const onClickOutside = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = options.filter(o => !query || o.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={open ? query : (value || '')}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        placeholder="Search vehicles…"
        style={{ width: '100%', padding: '9px 11px', border: BORDER, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}/>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: BORDER, borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
          <div onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
            style={{ padding: '8px 11px', fontSize: 13, color: '#94A3B8', cursor: 'pointer' }}>— clear —</div>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 11px', fontSize: 12.5, color: '#94A3B8' }}>No matches</div>
          ) : filtered.map(o => (
            <div key={o} onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false) }}
              style={{ padding: '8px 11px', fontSize: 13, color: '#1E293B', cursor: 'pointer', background: o === value ? '#EEF4FF' : 'transparent' }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CarMaintPage({ config, navigate }) {
  const endpoint = api.carmaint[config.apiKey]
  const { data: rows, setData: setRows, loading } = useApi(endpoint.list)

  // Only fetched when this feature has a `vehicleSelect` field (e.g. Fee
  // Payments) — resolves to an empty list immediately otherwise, so the
  // other ~17 Car Maintenance pages don't pay for an unused request.
  const needsVehicleOptions = config.fields.some(f => f.type === 'vehicleSelect')
  const { data: vehicleRows } = useApi(
    needsVehicleOptions ? api.carmaint.vehicleRoster.list : async () => []
  )
  const vehicleOptions = useMemo(
    () => vehicleRows.map(v => v.plate_number).filter(Boolean),
    [vehicleRows]
  )

  const [modal, setModal]     = useState(null)   // 'add' | 'edit'
  const [form, setForm]       = useState(() => blankForm(config.fields))
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const [viewRow, setViewRow] = useState(null)   // row object shown in the read-only detail modal
  const [showTop, setShowTop] = useState(false)  // scroll-to-top button visibility

  const scrollRef = useRef(null)
  const fontScale  = useFontScale()
  const confirm    = useConfirm()
  const toast      = useToast()

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => { setForm(blankForm(config.fields)); setEditId(null); setModal('add') }
  useEffect(() => {
    const flag = 'cm_' + config.apiKey
    if (sessionStorage.getItem('kvh_menu_add') === flag) { sessionStorage.removeItem('kvh_menu_add'); openAdd() }
  }, []) // eslint-disable-line

  const openEdit = row => {
    const f = {}
    config.fields.forEach(fl => { f[fl.key] = row[fl.key] ?? (fl.type === 'checkbox' ? false : '') })
    setForm(f); setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditId(null) }

  const openView  = row => setViewRow(row)
  const closeView = () => setViewRow(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return rows
    return rows.filter(r => config.columns.some(c => String(r[c] ?? '').toLowerCase().includes(q)))
  }, [rows, search, config.columns])

  const requiredOk = () => config.fields.every(f => !f.required || String(form[f.key] ?? '').trim() !== '')

  const save = async () => {
    if (!requiredOk()) { toast('Please fill all required fields.', 'warning'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      config.fields.forEach(f => {
        if (f.type === 'decimal') payload[f.key] = form[f.key] === '' ? 0 : Number(form[f.key])
        if (f.type === 'number')  payload[f.key] = form[f.key] === '' ? null : Number(form[f.key])
      })
      const wasAdd = modal === 'add'
      if (wasAdd) {
        const r = await endpoint.create(payload)
        setRows(p => [r, ...p])
      } else {
        const r = await endpoint.update(editId, payload)
        setRows(p => p.map(x => x.id === editId ? r : x))
      }
      closeModal()
      toast(wasAdd ? 'Added successfully.' : 'Updated successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!(await confirm('Delete this row? This cannot be undone.', { danger: true }))) return
    try { await endpoint.delete(id); setRows(p => p.filter(x => x.id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const colLabel = key => config.fields.find(f => f.key === key)?.label ?? key
  const Icon = config.icon

  /* Scroll-to-top: this component's own root div is the scroll
     container (see note above), so the listener and the scroll
     target are both scrollRef. */
  const onScroll = useCallback(e => {
    setShowTop(e.currentTarget.scrollTop > 320)
  }, [])
  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div ref={scrollRef} onScroll={onScroll}
      style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: BG }}>
      <div style={{ padding: '24px 28px 40px', boxSizing: 'border-box', zoom: fontScale }}>
        <LoadingStyles/>

        {/* ── Blue title bar (reference-app look) ────────────────── */}
        <div style={{
          background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
          borderRadius: '10px 10px 0 0', padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color="#fff"/>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontStyle: 'italic' }}>{config.titleKm}</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11 }}>{config.titleEn}</div>
            </div>
          </div>
          {navigate && (
            <button onClick={() => navigate('menu')} title={t('task.backToMenu')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.16)', border: 'none', borderRadius: 8, padding: '0 12px 0 8px', height: 30, color: '#fff', cursor: 'pointer' }}>
              <MenuGridIcon size={15} color="#fff"/>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t('task.backToMenu')}</span>
            </button>
          )}
        </div>

        {/* ── Gray panel body ─────────────────────────────────────── */}
        <div style={{ background: PANEL, border: BORDER, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16 }}>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={openAdd} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: BLUE, color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <Plus size={14}/> Add
            </button>
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', background: '#fff', borderRadius: 7, padding: '7px 12px', border: BORDER, minWidth: 180 }}>
              <Search size={14} color="#8B93A1"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'none' }}/>
            </div>
            {loading && <Spinner size={18}/>}
            <div style={{ color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>{filtered.length} rows</div>
          </div>
          <LoadingBar show={loading}/>

          <div style={{ background: '#fff', border: BORDER, borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#DEE3E9' }}>
                    {config.showRowNumber && (
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .4, textTransform: 'uppercase', width: 56 }}>
                        {config.rowNumberLabel || 'No.'}
                      </th>
                    )}
                    {config.columns.map(c => (
                      <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {colLabel(c)}
                      </th>
                    ))}
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .4, textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows n={5} cols={config.columns.map(() => '14%').concat('12%')}/>
                  ) : filtered.map((row, i) => (
                    <tr key={row.id} style={{ borderTop: '1px solid #EEF1F4', background: i % 2 ? '#FAFBFC' : '#fff' }}>
                      {config.showRowNumber && (
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#94A3B8' }}>{i + 1}</td>
                      )}
                      {config.columns.map(c => (
                        <td key={c} style={{ padding: '10px 14px', fontSize: 12.5, color: '#1E293B' }}>
                          {fmtValue(row[c], config.fields.find(f => f.key === c)?.type)}
                        </td>
                      ))}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openView(row)} title="View details" style={{ background: '#EEF2FF', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#4338CA' }}>
                            <Eye size={12}/>
                          </button>
                          {config.mapLinkKey && row[config.mapLinkKey] && (
                            <button onClick={() => window.open(row[config.mapLinkKey], '_blank', 'noopener,noreferrer')} title="Open in Google Maps" style={{ background: '#E6F7EE', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#0F9D58' }}>
                              <MapPin size={12}/>
                            </button>
                          )}
                          <button onClick={() => openEdit(row)} title="Edit" style={{ background: '#E8F0FE', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: BLUE }}>
                            <Edit size={12}/>
                          </button>
                          <button onClick={() => del(row.id)} title="Delete" style={{ background: '#FDECEC', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#DC2626' }}>
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 44, color: '#94A3B8' }}>
                  <Icon size={32} color="#CBD5E1" style={{ margin: '0 auto 10px' }}/>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#64748B' }}>No records yet</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Tap "Add" to create the first entry.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll-to-top ───────────────────────────────────────── */}
      {showTop && (
        <button onClick={scrollToTop} title="Scroll to top"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 160,
            width: 42, height: 42, borderRadius: '50%', border: 'none',
            background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,99,216,.4)',
          }}>
          <ArrowUp size={18}/>
        </button>
      )}

      {/* ── Row detail (read-only "View") modal ─────────────────── */}
      {viewRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', zoom: fontScale }}>
            <div style={{
              background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
              padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {config.titleEn} — Details
              </div>
              <button onClick={closeView} style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color="#fff"/>
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13, background: PANEL }}>
              {config.fields.map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 3 }}>
                    {f.label}
                  </div>
                  {f.type === 'url' && viewRow[f.key] ? (
                    <a href={viewRow[f.key]} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#0F9D58', background: '#fff', border: BORDER, borderRadius: 7, padding: '9px 11px', wordBreak: 'break-word', textDecoration: 'none', fontWeight: 600 }}>
                      <MapPin size={13}/> Open in Google Maps
                    </a>
                  ) : (
                    <div style={{ fontSize: 13.5, color: '#1E293B', background: '#fff', border: BORDER, borderRadius: 7, padding: '9px 11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {fmtValue(viewRow[f.key], f.type)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 20px', borderTop: BORDER, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
              <button onClick={() => { closeView(); openEdit(viewRow) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, border: BORDER, background: '#fff', color: BLUE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Edit size={13}/> Edit
              </button>
              <button onClick={closeView} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit modal ───────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zoom: fontScale }}>
            <SavingOverlay show={saving}/>
            <div style={{
              background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
              padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {modal === 'add' ? 'Add' : 'Edit'} — {config.titleEn}
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color="#fff"/>
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13, background: PANEL }}>
              {config.fields.map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea value={form[f.key]} onChange={e => fld(f.key, e.target.value)} rows={2}
                      style={{ width: '100%', padding: '9px 11px', border: BORDER, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', background: '#fff' }}/>
                  ) : f.type === 'vehicleSelect' ? (
                    <VehicleSearchSelect value={form[f.key]} onChange={v => fld(f.key, v)} options={vehicleOptions}/>
                  ) : f.type === 'select' ? (
                    <select value={form[f.key]} onChange={e => fld(f.key, e.target.value)}
                      style={{ width: '100%', padding: '9px 11px', border: BORDER, borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff' }}>
                      <option value="">—</option>
                      {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <input type="checkbox" checked={!!form[f.key]} onChange={e => fld(f.key, e.target.checked)}
                      style={{ width: 18, height: 18 }}/>
                  ) : (
                    <input
                      type={f.type === 'number' || f.type === 'decimal' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
                      placeholder={f.type === 'url' ? 'https://maps.google.com/...' : undefined}
                      step={f.type === 'decimal' ? '0.01' : undefined}
                      value={form[f.key]} onChange={e => fld(f.key, e.target.value)}
                      style={{ width: '100%', padding: '9px 11px', border: BORDER, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}/>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 20px', borderTop: BORDER, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
              <button onClick={closeModal} style={{ padding: '8px 16px', borderRadius: 7, border: BORDER, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? <><Spinner size={13} color="white"/> Saving…</> : <><Save size={13}/> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
