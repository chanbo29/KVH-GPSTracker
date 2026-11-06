import { useState } from 'react'
import { Plus, Trash2, Settings as SettingsIcon, Type, RotateCcw } from 'lucide-react'
import MenuGridIcon from '../../components/icons/MenuGridIcon.jsx'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { LoadingStyles, LoadingBar } from '../../components/Loading.jsx'
import { t } from '../../constants/i18n.js'
import { useFontScale, setFontScale, resetFontScale, FONT_SCALE_PRESETS } from '../../constants/fontScale.js'
import { useConfirm, useToast } from '../../components/ui/UIProvider.jsx'

/* ──────────────────────────────────────────────────────────────────
   "Vehicle Table Settings" — manages the two selectable name lists used
   by the Add/Edit Vehicle form on the Vehicle Table page:
     • Name in Card (ឈ្មោះក្នុងកាតគ្រី)  — carmaint CardName
     • Driver (អ្នកប្រើប្រាស់)           — carmaint DriverName, with phone
   Picking a Driver on a vehicle syncs the matching row in VehicleUsers,
   which happens on the Vehicle Table page itself, not here.
   ────────────────────────────────────────────────────────────────── */

const BLUE   = '#1D63D8'
const BLUE_D = '#164FAE'
const BORDER = '1px solid #E2E8F0'
const NAVY   = '#0F172A'
const R      = '#DC2626'

function NameListEditor({ title, items, nameValue, onNameChange, extraValue, onExtraChange, extraPlaceholder, namePlaceholder, onAdd, onDelete, emptyText }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: BORDER, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)', flex: '1 1 320px', minWidth: 300 }}>
      <div style={{ padding: '14px 18px', borderBottom: BORDER, fontWeight: 800, fontSize: 14.5, color: NAVY }}>{title}</div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={nameValue} onChange={e => onNameChange(e.target.value)} placeholder={namePlaceholder}
            onKeyDown={e => { if (e.key === 'Enter') onAdd() }}
            style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, outline: 'none', background: '#FAFAFA' }}/>
          {onExtraChange && (
            <input value={extraValue} onChange={e => onExtraChange(e.target.value)} placeholder={extraPlaceholder}
              onKeyDown={e => { if (e.key === 'Enter') onAdd() }}
              style={{ width: 130, padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, outline: 'none', background: '#FAFAFA' }}/>
          )}
          <button onClick={onAdd} style={{ padding: '9px 14px', background: BLUE, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
            <Plus size={15}/>
          </button>
        </div>
        <div style={{ border: BORDER, borderRadius: 10, maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>{emptyText}</div>
          ) : items.map((it, i) => (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
              borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div style={{ fontSize: 13.5, color: NAVY }}>
                {it.name}
                {it.phone ? <span style={{ color: '#94A3B8', marginLeft: 10, fontSize: 12.5 }}>{it.phone}</span> : null}
              </div>
              <button onClick={() => onDelete(it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: R, padding: 4 }}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FontSizeCard() {
  const scale = useFontScale()
  const activePreset = FONT_SCALE_PRESETS.find(p => Math.abs(p.value - scale) < 0.01)

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: BORDER, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)', flex: '1 1 320px', minWidth: 300 }}>
      <div style={{ padding: '14px 18px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Type size={16} color={BLUE}/> {t('fs.title')}
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{t('fs.subtitle')}</div>
        </div>
        <button onClick={() => resetFontScale()} title={t('fs.reset')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
          <RotateCcw size={12}/> {t('fs.reset')}
        </button>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {FONT_SCALE_PRESETS.map(p => {
            const active = activePreset?.label === p.label
            return (
              <button key={p.label} onClick={() => setFontScale(p.value)}
                style={{
                  flex: '1 1 70px', padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: active ? `2px solid ${BLUE}` : '1.5px solid #E2E8F0',
                  background: active ? '#EEF4FF' : '#fff',
                  color: active ? BLUE : '#475569', fontWeight: 700,
                }}>
                <div style={{ fontSize: 15 * p.value }}>Aa</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>{t('fs.' + ({ Small: 'small', Medium: 'medium', Large: 'large', 'Extra Large': 'xlarge' }[p.label]))}</div>
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 6 }}>
          {t('fs.preview')}
        </div>
        <div style={{ border: BORDER, borderRadius: 10, padding: '14px 16px', background: '#FAFAFA', zoom: scale }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: NAVY, marginBottom: 4 }}>{t('fs.title')}</div>
          <div style={{ fontSize: 13, color: '#475569' }}>{t('fs.previewText')}</div>
        </div>
      </div>
    </div>
  )
}

export default function CmVehicleSettings({ navigate }) {
  const fontScale = useFontScale()
  const confirm = useConfirm()
  const toast = useToast()
  const { data: cardNames, setData: setCardNames, loading: l1 } = useApi(api.carmaint.cardNames.list)
  const { data: driverNames, setData: setDriverNames, loading: l2 } = useApi(api.carmaint.driverNames.list)
  const loading = l1 || l2

  const [newCardName, setNewCardName]       = useState('')
  const [newDriverName, setNewDriverName]   = useState('')
  const [newDriverPhone, setNewDriverPhone] = useState('')

  const addCardName = async () => {
    const name = newCardName.trim()
    if (!name) return
    try {
      const r = await api.carmaint.cardNames.create({ name })
      setCardNames(p => [...p, r].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCardName('')
      toast('Added successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
  }
  const deleteCardName = async id => {
    if (!(await confirm(t('vr.removeConfirm'), { danger: true }))) return
    try { await api.carmaint.cardNames.delete(id); setCardNames(p => p.filter(x => x.id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }
  const addDriverName = async () => {
    const name = newDriverName.trim()
    if (!name) return
    try {
      const r = await api.carmaint.driverNames.create({ name, phone: newDriverPhone.trim() })
      setDriverNames(p => [...p, r].sort((a, b) => a.name.localeCompare(b.name)))
      setNewDriverName(''); setNewDriverPhone('')
      toast('Added successfully.', 'success')
    } catch (e) { toast(e.message, 'error') }
  }
  const deleteDriverName = async id => {
    if (!(await confirm(t('vr.removeConfirm'), { danger: true }))) return
    try { await api.carmaint.driverNames.delete(id); setDriverNames(p => p.filter(x => x.id !== id)); toast('Deleted.', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  return (
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
            <SettingsIcon size={17} color="#fff"/>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontStyle: 'italic' }}>{t('vr.settingsTitle')}</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11.5 }}>{t('vr.settings')}</div>
          </div>
        </div>
        {navigate && (
          <button onClick={() => navigate('menu')} title={t('task.backToMenu')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.16)', border: 'none', borderRadius: 9, padding: '0 14px 0 10px', height: 34, color: '#fff', cursor: 'pointer' }}>
            <MenuGridIcon size={16} color="#fff"/>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t('task.backToMenu')}</span>
          </button>
        )}
      </div>

      {loading && <LoadingBar show={loading}/>}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <FontSizeCard/>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <NameListEditor
          title={t('vr.cardNameListTitle')}
          items={cardNames}
          nameValue={newCardName}
          onNameChange={setNewCardName}
          namePlaceholder={t('vr.cardNameholder')}
          onAdd={addCardName}
          onDelete={deleteCardName}
          emptyText={t('vr.noCardNames')}
        />
        <NameListEditor
          title={t('vr.driverListTitle')}
          items={driverNames}
          nameValue={newDriverName}
          onNameChange={setNewDriverName}
          extraValue={newDriverPhone}
          onExtraChange={setNewDriverPhone}
          extraPlaceholder={t('vr.driverPhoneholder')}
          namePlaceholder={t('vr.driverNameholder')}
          onAdd={addDriverName}
          onDelete={deleteDriverName}
          emptyText={t('vr.noDrivers')}
        />
      </div>
    </div>
  )
}
