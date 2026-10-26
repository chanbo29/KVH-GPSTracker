import { Gauge, Trash2 } from 'lucide-react'
import BatteryBar from './BatteryBar.jsx'
import SignalDots from './SignalDots.jsx'

const SC = { moving: '#22C55E', stopped: '#F59E0B', parked: '#EF4444' }
const SB = { moving: '#22C55E18', stopped: '#F59E0B18', parked: '#EF444418' }
const SI = { moving: '⚡', stopped: '⏸', parked: '🅿' }
const TC = { car: '#3B82F6', motorbike: '#8B5CF6' }

export default function VehicleCard({ vehicle: v, isSelected, onClick, onDelete }) {
  return (
    <div onClick={onClick} style={{
      background: isSelected ? '#1D4ED815' : '#0A1020',
      border: `1px solid ${isSelected ? '#3B82F680' : '#1E2D45'}`,
      borderRadius: '10px', padding: '11px', marginBottom: '6px', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: TC[v.type] + '20', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
            {v.type === 'car' ? '🚗' : '🏍️'}
          </div>
          <div>
            <div style={{ color: '#E2E8F0', fontWeight: '600', fontSize: '12px' }}>{v.name}</div>
            <div style={{ color: '#475569', fontSize: '10px' }}>{v.plate} · {v.owner}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '9px', fontWeight: '700', background: SB[v.status], color: SC[v.status] }}>
            {SI[v.status]} {v.status?.toUpperCase()}
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(v.imei) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '2px', display: 'flex' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ background: '#060B15', borderRadius: '6px', padding: '4px 8px', marginBottom: '7px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ color: '#334155', fontSize: '9px', fontWeight: '700' }}>IMEI</span>
        <span style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>{v.imei}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Gauge size={11} color="#475569" />
          <span style={{ color: v.status === 'moving' ? '#22C55E' : '#475569', fontSize: '11px', fontWeight: '600' }}>
            {Math.round(v.speed ?? 0)} km/h
          </span>
        </div>
        <BatteryBar pct={v.battery} />
        <SignalDots n={v.signal} />
      </div>
    </div>
  )
}
