import { useState, useMemo } from 'react'
import { Plus, X, Edit2, Trash2, Save, ClipboardList, Car } from 'lucide-react'
import MenuGridIcon from '../../components/icons/MenuGridIcon.jsx'
import { api } from '../../api/client.js'
import { t } from '../../constants/i18n.js'
import { useFontScale } from '../../constants/fontScale.js'
import { useConfirm, useToast } from '../../components/ui/UIProvider.jsx'
import { useApi } from '../../hooks/useApi.js'
import { LoadingStyles, Spinner, LoadingBar, SavingOverlay, Skel } from '../../components/Loading.jsx'

/* ──────────────────────────────────────────────────────────────────
   "Task" page — a full-width stack of separate, clearly-spaced cards
   (one per task) instead of dense packed rows, so each entry is easy
   to read on its own. Still backed by the same standalone `otherWork`
   table/API in the carmaint database.
   ────────────────────────────────────────────────────────────────── */

const BLUE   = '#1D63D8'
const BLUE_D = '#164FAE'
const BORDER = '1px solid #E2E8F0'
const endpoint = api.carmaint.otherWork

function fmtTimestamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const BLANK = { work_name: 'Task', vehicle_name: '', notes: '' }

export default function CmOtherWork({ navigate }) {
  const fontScale = useFontScale()
  const confirm = useConfirm()
  const toast = useToast()
  const { data: rows, setData: setRows, loading } = useApi(endpoint.list)

  const [modal, setModal]   = useState(null)   // 'add' | 'edit'
  const [form, setForm]     = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({ work_name: row.work_name || 'Task', vehicle_name: row.vehicle_name || '', notes: row.notes || '' })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditId(null) }

  const save = async () => {
    if (!form.notes.trim()) { toast(t('task.detailsRequired'), 'warning'); return }
    setSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const payload = { ...form, date: today }
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
    if (!(await confirm(t('task.deleteConfirm'), { danger: true }))) return
    try { await endpoint.delete(id); setRows(p => p.filter(x => x.id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rows]
  )

  return (
    <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#F4F6F8' }}>
    <div style={{ padding: 24, width: '100%', boxSizing: 'border-box', zoom: fontScale }}>
      <LoadingStyles/>

      {/* ── Blue title bar — full width, with a clear Back-to-Menu button ── */}
      <div style={{
        background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
        borderRadius: 14, padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(29,99,216,.25)', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={17} color="#fff"/>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Task</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11.5 }}>តារាងការងារផ្សេងៗ · {rows.length} {t('task.total')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={openAdd} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: BLUE, border: 'none',
            borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={14}/> {t('task.newTask')}
          </button>
          {navigate && (
            <button onClick={() => navigate('menu')} title="Back to Menu" style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.16)', border: 'none',
              borderRadius: 9, padding: '9px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <MenuGridIcon size={15} color="#fff"/> {t('task.backToMenu')}
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingBar show={loading}/>}

      {/* ── Task cards, one per entry, clearly separated, full width ───── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: BORDER, borderRadius: 14, padding: 18 }}>
              <Skel w={160} h={14} r={6} style={{ marginBottom: 10 }}/>
              <Skel w="90%" h={12} r={5} style={{ marginBottom: 6 }}/>
              <Skel w="70%" h={12} r={5}/>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: '#fff', border: BORDER, borderRadius: 14, textAlign: 'center', padding: 52 }}>
          <ClipboardList size={36} color="#CBD5E1" style={{ margin: '0 auto 14px' }}/>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#334155', marginBottom: 6 }}>{t('task.noTasks')}</div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>{t('task.noTasksHint')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map(row => (
            <div key={row.id} style={{
              background: '#fff', border: BORDER, borderRadius: 14, padding: '18px 24px',
              boxShadow: '0 1px 3px rgba(15,23,42,.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: BLUE, fontWeight: 700, fontSize: 14 }}>{fmtTimestamp(row.created_at)}</span>
                  {row.vehicle_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F6FF', color: BLUE, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
                      <Car size={11}/> {row.vehicle_name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(row)} title="Edit"
                    style={{ background: '#FFF7ED', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Edit2 size={13} color="#D97706"/>
                  </button>
                  <button onClick={() => del(row.id)} title="Delete"
                    style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={13} color="#DC2626"/>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13.5, color: '#1E293B', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {row.notes || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zoom: fontScale }}>
            <SavingOverlay show={saving}/>
            <div style={{
              background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{modal === 'add' ? t('task.newTask') : t('task.editTask')}</div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color="#fff"/>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{t('task.vehicleOptional')}</label>
                <input value={form.vehicle_name} onChange={e => fld('vehicle_name', e.target.value)} placeholder={t('task.vehiclePlaceholder')}
                  style={{ width: '100%', padding: '10px 12px', border: BORDER, borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{t('task.taskDetails')} *</label>
                <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={6} placeholder={t('task.taskDetailsPlaceholder')}
                  style={{ width: '100%', padding: '10px 12px', border: BORDER, borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}/>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: BORDER, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ padding: '9px 16px', borderRadius: 9, border: BORDER, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('task.cancel')}
              </button>
              <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? <><Spinner size={13} color="white"/> {t('task.saving')}</> : <><Save size={13}/> {t('task.save')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
