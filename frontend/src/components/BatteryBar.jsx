export default function BatteryBar({ pct = 0 }) {
  const color = pct < 30 ? '#EF4444' : pct < 60 ? '#F59E0B' : '#22C55E'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: '20px', height: '10px', border: `1px solid ${color}40`, borderRadius: '2px', position: 'relative', padding: '1px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '1px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '50%', transform: 'translateY(-50%)', width: '2px', height: '5px', background: `${color}80`, borderRadius: '0 1px 1px 0' }} />
      </div>
      <span style={{ color, fontSize: '10px', fontWeight: '600' }}>{pct}%</span>
    </div>
  )
}
