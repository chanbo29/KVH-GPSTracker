export default function SignalDots({ n = 0 }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ width: '3px', height: `${4 + i * 3}px`, borderRadius: '1px', background: i <= n ? '#22C55E' : '#334155' }} />
      ))}
    </div>
  )
}
