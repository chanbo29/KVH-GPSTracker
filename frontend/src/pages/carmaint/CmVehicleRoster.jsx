import { useState, useMemo, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, X, Save, Truck, Image as ImageIcon, Camera, Settings as SettingsIcon } from 'lucide-react'
import MenuGridIcon from '../../components/icons/MenuGridIcon.jsx'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { LoadingStyles, Spinner, LoadingBar, Skel, SavingOverlay } from '../../components/Loading.jsx'
import { t } from '../../constants/i18n.js'
import { useFontScale } from '../../constants/fontScale.js'
import { useConfirm, useToast } from '../../components/ui/UIProvider.jsx'

/* ──────────────────────────────────────────────────────────────────
   "Vehicle Table" (តារាងរថយន្ត) — a standalone roster, separate from
   the main Vehicles page, backed by the carmaint `vehicleRoster` API.
   Table columns and the Active/Not Active tabs match the reference
   screenshot exactly: No., Photo, Plate, User (the assigned driver,
   stored directly on this row as `driver_name`; phone is looked up
   from VehicleUsers for display), Location, ODO, Fuel, Notes,
   Color, Brand, Name in Card.

   "Name in Card" uses the CardName quick-list (managed from the
   Settings gear icon, top-right). "User" (អ្នកប្រើប្រាស់) is picked
   from តារាងអ្នកប្រើប្រាស់រថយន្ត — the VehicleUsers table (its own
   independent flat contact directory: name/phone/address/notes) —
   so both match whatever contacts are kept there.
   ────────────────────────────────────────────────────────────────── */

const BLUE   = '#1D63D8'
const BLUE_D = '#164FAE'
const PINK   = '#DB2777'
const BORDER = '1px solid #E2E8F0'
const NAVY   = '#0F172A'
const R      = '#DC2626'
const endpoint = api.carmaint.vehicleRoster
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024

const BLANK = {
  plate_number: '', brand: '', model_name: '', year: '', color: '',
  vehicle_type: '', owner_name: '', status: 'active', notes: '', photo: '',
  location: '', distance_unit: 'Km', fuel_type: '', driver_name: '',
}

/* ── Label-left row, matching the reference "Add Vehicle" form ── */
function Row({ label, children, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
      <label style={{ width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#475569' }}>
        {label}{required && <span style={{ color: R }}> *</span>}
      </label>
      <span style={{ color: '#CBD5E1', fontSize: 13 }}>:</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
function RInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' }}
      onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.background = '#EFF6FF' }}
      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#FAFAFA' }}/>
  )
}
function RSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, color: NAVY, outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

/* Searchable combobox — same look as RSelect, but typing filters the
   option list instead of opening a long native <select> the user has
   to scroll through. Used for the Name-in-Card / Driver pickers,
   which can have dozens of entries. */
function RSearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const labelFor = v => {
    if (!v) return ''
    return options.find(([ov]) => ov === v)?.[1] ?? v
  }

  const openDropdown = () => {
    setQuery('')
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const pick = v => { onChange(v); setOpen(false); setQuery('') }

  const q = query.trim().toLowerCase()
  const filtered = !q ? options : options.filter(([, l]) => l.toLowerCase().includes(q))

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={open ? query : labelFor(value)}
        onFocus={openDropdown}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' }}
      />
      {open && (
        <div style={{ position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 9, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 28px rgba(15,23,42,.14)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: '#94A3B8' }}>No matches</div>
          ) : filtered.map(([v, l]) => (
            <div key={v || '(blank)'} onMouseDown={e => { e.preventDefault(); pick(v) }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                color: v === value ? BLUE : (v ? NAVY : '#94A3B8'),
                background: v === value ? '#EFF6FF' : 'transparent',
                fontWeight: v === value ? 700 : 400,
              }}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Photo upload panel — right side of the Add/Edit modal ── */
function PhotoPanel({ photo, onChange, onError }) {
  const fileRef = useRef(null)
  const pick = () => fileRef.current?.click()
  const handleFile = e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { onError('Please choose an image file.'); return }
    if (file.size > MAX_PHOTO_BYTES) { onError('Image is too large — please choose one under 1.5MB.'); return }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }
  return (
    <div style={{
      border: '1.5px dashed #CBD5E1', borderRadius: 14, background: '#FAFAFA',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 200, position: 'relative', overflow: 'hidden',
    }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }}/>
      {photo ? (
        <>
          <img src={photo} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}/>
          <button onClick={() => onChange('')} title="Remove photo"
            style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(220,38,38,.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={13} color="#fff"/>
          </button>
          <button onClick={pick}
            style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(15,23,42,.72)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <Camera size={12}/> {t('vr.choosePhoto')}
          </button>
        </>
      ) : (
        <button onClick={pick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={24} color={BLUE}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>{t('vr.choosePhoto')}</span>
        </button>
      )}
    </div>
  )
}

export default function CmVehicleRoster({ navigate }) {
  const fontScale = useFontScale()
  const confirm = useConfirm()
  const toast = useToast()
  const { data: rows, setData: setRows, loading, error, refresh } = useApi(endpoint.list)
  const { data: cardNames, setData: setCardNames } = useApi(api.carmaint.cardNames.list)
  const { data: vehicleUsers, setData: setVehicleUsers } = useApi(api.carmaint.vehicleUsers.list)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')   // active | inactive
  const [modal, setModal]   = useState(null)   // 'add' | 'edit'
  const [form, setForm]     = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [editOriginalPlate, setEditOriginalPlate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(null)   // { src, label } of the photo being viewed full-size

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => { setForm(BLANK); setEditId(null); setEditOriginalPlate(null); setModal('add') }
  const openEdit = row => {
    setForm({
      plate_number: row.plate_number || '', brand: row.brand || '', model_name: row.model_name || '',
      year: row.year || '', color: row.color || '', vehicle_type: row.vehicle_type || '',
      owner_name: row.owner_name || '', status: row.status || 'active', notes: row.notes || '', photo: row.photo || '',
      location: row.location || '', distance_unit: row.distance_unit || 'Km', fuel_type: row.fuel_type || '',
      driver_name: row.driver_name || '',
    })
    setEditId(row.id); setEditOriginalPlate(row.plate_number || null); setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditId(null); setEditOriginalPlate(null) }

  const save = async () => {
    if (!form.plate_number.trim()) { toast(t('vr.plateRequired'), 'warning'); return }
    setSaving(true)
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : null, photo: form.photo || null }
      const wasAdd = modal === 'add'
      let savedRow
      if (wasAdd) {
        savedRow = await endpoint.create(payload)
        setRows(p => [savedRow, ...p])
      } else {
        savedRow = await endpoint.update(editId, payload)
        setRows(p => p.map(x => x.id === editId ? savedRow : x))
      }

      closeModal()
      toast(wasAdd ? 'Added successfully.' : 'Updated successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!(await confirm(t('vr.deleteConfirm'), { danger: true }))) return
    try { await endpoint.delete(id); setRows(p => p.filter(x => x.id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const counts = useMemo(() => ({
    active:   rows.filter(r => r.status === 'active').length,
    inactive: rows.filter(r => r.status !== 'active').length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const mQ = !q
        || r.plate_number?.toLowerCase().includes(q)
        || r.brand?.toLowerCase().includes(q)
        || r.owner_name?.toLowerCase().includes(q)
        || r.driver_name?.toLowerCase().includes(q)
      const mS = statusFilter === 'active' ? r.status === 'active' : r.status !== 'active'
      return mQ && mS
    })
  }, [rows, search, statusFilter])

  const COLS = 11 // No, Photo, Plate, User, Location, ODO, Fuel, Notes, Color, Brand, Card-name (actions col is separate)

  return (
    <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#F4F6F8' }}>
    <div style={{ padding: 24, width: '100%', boxSizing: 'border-box', zoom: fontScale }}>
      <LoadingStyles/>

      {/* ── Blue title bar ──────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
        borderRadius: 14, padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(29,99,216,.25)', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={17} color="#fff"/>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontStyle: 'italic' }}>តារាងព័ត៌មានរថយន្ត</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11.5 }}>Vehicle Table</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {navigate && (
            <button onClick={() => navigate('cmVehicleSettings')} title={t('vr.settings')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.16)', border: 'none', borderRadius: 9, width: 34, height: 34, color: '#fff', cursor: 'pointer' }}>
              <SettingsIcon size={16}/>
            </button>
          )}
          {navigate && (
            <button onClick={() => navigate('menu')} title={t('task.backToMenu')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.16)', border: 'none', borderRadius: 9, padding: '0 14px 0 10px', height: 34, color: '#fff', cursor: 'pointer' }}>
              <MenuGridIcon size={16} color="#fff"/>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('task.backToMenu')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: BLUE, color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(29,99,216,.3)',
        }}>
          <Plus size={15}/> {t('vr.add')}
        </button>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: BORDER, borderRadius: 10, padding: '9px 14px' }}>
          <Search size={14} color="#94A3B8"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('vr.search')}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: NAVY, background: 'none' }}/>
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}><X size={13}/></button>}
        </div>
        <div style={{ color: '#94A3B8', fontSize: 12.5, whiteSpace: 'nowrap' }}>{filtered.length} {t('vr.rows')}</div>
      </div>

      {loading && <LoadingBar show={loading}/>}

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10,
          padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#B91C1C', fontSize: 13.5, fontWeight: 600 }}>
            {`Failed to load vehicle data: ${error}`}
          </span>
          <button onClick={refresh} style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Table card ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, border: BORDER, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>

        {/* Active / Not Active tabs */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px 4px 0', gap: 2 }}>
          {['active', 'inactive'].map(id => {
            const isSel = statusFilter === id
            const color = id === 'active' ? PINK : BLUE
            return (
              <button key={id} onClick={() => setStatusFilter(id)}
                style={{
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  background: isSel ? '#fff' : 'transparent',
                  color: isSel ? color : '#94A3B8',
                  fontWeight: 800, fontSize: 12, letterSpacing: .4, textTransform: 'uppercase',
                  borderRadius: '9px 9px 0 0',
                  borderBottom: isSel ? `3px solid ${color}` : '3px solid transparent',
                  transition: 'all .15s',
                }}>
                {id === 'active' ? t('vr.tabActive') : t('vr.tabInactive')}
                <span style={{ marginLeft: 6, opacity: .7, fontWeight: 700 }}>({id === 'active' ? counts.active : counts.inactive})</span>
              </button>
            )
          })}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '12px 14px', borderBottom: BORDER, width: 70 }}></th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.no')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.photo')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.plate')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.user')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.location')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.odo')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.fuel')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.notes')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.color')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.brand')}</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: .5, textTransform: 'uppercase', borderBottom: BORDER, whiteSpace: 'nowrap' }}>{t('vr.col.cardName')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: COLS + 1 }).map((__, j) => (
                      <td key={j} style={{ padding: '12px 14px' }}><Skel h={12} r={5}/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((r, i) => {
                const dn = r.driver_name ? vehicleUsers.find(u => u.user_name === r.driver_name) : null
                const phones = dn?.phone ? dn.phone.split('/').map(p => p.trim()).filter(Boolean) : []
                return (
                  <tr key={r.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    {/* Actions — icon-only, leftmost, matching the reference */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(r)} title={t('vr.edit')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: '#FFF7ED', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                          <Edit2 size={13} color="#D97706"/>
                        </button>
                        <button onClick={() => del(r.id)} title={t('vr.delete')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: '#FEF2F2', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                          <Trash2 size={13} color={R}/>
                        </button>
                      </div>
                    </td>
                    {/* No. */}
                    <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: 13 }}>{i + 1}</td>
                    {/* Photo — click to view full-size */}
                    <td style={{ padding: '12px 14px' }}>
                      {r.photo ? (
                        <img src={r.photo} alt={r.plate_number} title="Click to enlarge"
                          onClick={() => setLightbox({ src: r.photo, label: r.plate_number })}
                          style={{ width: 44, height: 32, borderRadius: 6, objectFit: 'cover', cursor: 'zoom-in' }}/>
                      ) : (
                        <div style={{ width: 44, height: 32, borderRadius: 6, background: '#F1F5F9', border: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={14} color="#CBD5E1"/>
                        </div>
                      )}
                    </td>
                    {/* Plate */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY, fontSize: 13.5, whiteSpace: 'nowrap' }}>{r.plate_number}</td>
                    {/* User (driver assigned to this vehicle) */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                      {r.driver_name ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{r.driver_name}</div>
                          {phones.map((p, pi) => <div key={pi} style={{ color: '#94A3B8', fontSize: 12 }}>{p}</div>)}
                        </>
                      ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    {/* Location */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>{r.location || '—'}</td>
                    {/* ODO */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{r.distance_unit || '—'}</td>
                    {/* Fuel */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{r.fuel_type || '—'}</td>
                    {/* Notes */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{r.notes || '—'}</td>
                    {/* Color */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>{r.color || '—'}</td>
                    {/* Brand */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>{r.brand || '—'}</td>
                    {/* Name in card */}
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>{r.owner_name || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '52px 20px' }}>
            <Truck size={36} color="#CBD5E1" style={{ margin: '0 auto 14px' }}/>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#334155', marginBottom: 6 }}>{t('vr.noRecords')}</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>{t('vr.noRecordsHint')}</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL — blue header + left label:value form column
          + right photo-upload panel, matching the reference design
      ══════════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '92vh', position: 'relative', zoom: fontScale }}>
            <SavingOverlay show={saving}/>

            <div style={{
              background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_D} 100%)`,
              padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={17} color="#fff"/>
                </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontStyle: 'italic' }}>
                  {modal === 'add' ? t('vr.addTitle') : t('vr.editTitle')}
                </div>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color="#fff"/>
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 22px', flex: 1 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                  <Row label={t('vr.plate')} required>
                    <RInput value={form.plate_number} onChange={v => fld('plate_number', v)} placeholder={t('vr.plateholder')}/>
                  </Row>
                  <Row label={t('vr.brand')}>
                    <RInput value={form.brand} onChange={v => fld('brand', v)} placeholder={t('vr.brandholder')}/>
                  </Row>
                  <Row label={t('vr.model')}>
                    <RInput value={form.model_name} onChange={v => fld('model_name', v)} placeholder={t('vr.modelholder')}/>
                  </Row>
                  <Row label={t('vr.year')}>
                    <RInput type="number" value={form.year} onChange={v => fld('year', v)} placeholder="2024"/>
                  </Row>
                  <Row label={t('vr.color')}>
                    <RInput value={form.color} onChange={v => fld('color', v)} placeholder={t('vr.colorholder')}/>
                  </Row>
                  <Row label={t('vr.type')}>
                    <RInput value={form.vehicle_type} onChange={v => fld('vehicle_type', v)} placeholder={t('vr.typeholder')}/>
                  </Row>
                  <Row label={t('vr.location')}>
                    <RInput value={form.location} onChange={v => fld('location', v)} placeholder={t('vr.locationholder')}/>
                  </Row>
                  <Row label={t('vr.distanceUnit')}>
                    <RSelect value={form.distance_unit} onChange={v => fld('distance_unit', v)} options={[['Km', 'Km'], ['Mile', 'Mile']]}/>
                  </Row>
                  <Row label={t('vr.fuelType')}>
                    <RInput value={form.fuel_type} onChange={v => fld('fuel_type', v)} placeholder={t('vr.fuelTypeholder')}/>
                  </Row>
                  <Row label={t('vr.owner')}>
                    <RSearchSelect value={form.owner_name} onChange={v => fld('owner_name', v)}
                      placeholder={t('vr.cardNameSelectholder')}
                      options={[['', t('vr.cardNameSelectholder')], ...cardNames.map(c => [c.name, c.name])]}/>
                  </Row>
                  <Row label={t('vr.driver')}>
                    <RSearchSelect value={form.driver_name} onChange={v => fld('driver_name', v)}
                      placeholder={t('vr.driverholder')}
                      options={[['', t('vr.driverholder')], ...vehicleUsers.map(u => [u.user_name, u.user_name])]}/>
                  </Row>
                  <Row label={t('vr.status')}>
                    <RSelect value={form.status} onChange={v => fld('status', v)} options={[['active', t('vr.statusActive')], ['inactive', t('vr.statusInactive')]]}/>
                  </Row>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 13 }}>
                    <label style={{ width: 120, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#475569', paddingTop: 8 }}>{t('vr.notes')}</label>
                    <span style={{ color: '#CBD5E1', fontSize: 13, paddingTop: 8 }}>:</span>
                    <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={3} placeholder={t('vr.notesholder')}
                      style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA', resize: 'vertical' }}/>
                  </div>
                </div>

                <div style={{ flex: '0 0 220px', width: 220 }}>
                  <PhotoPanel photo={form.photo} onChange={v => fld('photo', v)} onError={msg => toast(msg, 'error')}/>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: BORDER, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', background: '#F8FAFC', border: BORDER, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
                {t('vr.cancel')}
              </button>
              <button onClick={save} disabled={saving || !form.plate_number.trim()}
                style={{ padding: '10px 24px', background: !form.plate_number.trim() ? '#E2E8F0' : BLUE, color: !form.plate_number.trim() ? '#94A3B8' : '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: !form.plate_number.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? <><Spinner size={14} color="#fff"/>{t('vr.saving')}</> : <><Save size={14}/>{t('vr.save')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo lightbox — click any thumbnail to view it full-size ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.82)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <button onClick={() => setLightbox(null)} title={t('vr.close')}
            style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,.14)', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="#fff"/>
          </button>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: '92vw', maxHeight: '90vh' }}>
            <img src={lightbox.src} alt={lightbox.label}
              style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,.5)', objectFit: 'contain' }}/>
            <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700 }}>{lightbox.label}</div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
