import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { createVehicle } from '../api/client.js'

const INIT = { imei: '', name: '', type: 'car', plate: '', owner: '', status: 'parked' }

export default function AddVehicleModal({ onClose, onAdded }) {
  const [form, setForm]     = useState(INIT)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle = { width: '100%', padding: '10px 12px', background: '#060B15', border: '1px solid #1E2D45', borderRadius: '8px', color: '#CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { color: '#64748B', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '5px' }

  const handleSubmit = async () => {
    if (!form.imei || !form.name || !form.plate || !form.owner) { setError('All fields are required.'); return }
    if (!/^\d{15}$/.test(form.imei)) { setError('IMEI must be exactly 15 digits.'); return }
    setSaving(true); setError('')
    try {
      const vehicle = await createVehicle(form)
      onAdded(vehicle)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save vehicle.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0D1525', borderRadius: '16px', padding: '28px', width: '380px', border: '1px solid #1E2D45' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ color: '#E2E8F0', fontWeight: '700', fontSize: '16px' }}>Add Vehicle</div>
            <div style={{ color: '#475569', fontSize: '12px' }}>Register real GPS device by IMEI</div>
          </div>
          <button onClick={onClose} style={{ background: '#1E2D45', border: 'none', borderRadius: '8px', color: '#64748B', cursor: 'pointer', padding: '6px 8px' }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>IMEI (15 digits — from device label)</label>
          <input placeholder="358748093698001" value={form.imei} onChange={set('imei')} maxLength={15} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Vehicle Name</label>
          <input placeholder="Toyota Camry" value={form.name} onChange={set('name')} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={set('type')} style={inputStyle}>
              <option value="car">🚗 Car</option>
              <option value="motorbike">🏍️ Motorbike</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={set('status')} style={inputStyle}>
              <option value="parked">🅿 Parked</option>
              <option value="stopped">⏸ Stopped</option>
              <option value="moving">⚡ Moving</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Plate Number</label>
          <input placeholder="2A-1234" value={form.plate} onChange={set('plate')} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Owner Name</label>
          <input placeholder="Dara Sok" value={form.owner} onChange={set('owner')} style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: '#EF444415', border: '1px solid #EF4444', borderRadius: '8px', padding: '8px 12px', color: '#EF4444', fontSize: '12px', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: '10px', background: saving ? '#1E40AF' : 'linear-gradient(135deg,#3B82F6,#6366F1)', color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Plus size={16} />{saving ? 'Saving…' : 'Add Vehicle'}
        </button>
      </div>
    </div>
  )
}
