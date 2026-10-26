import { useState, useEffect } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import {
  Car, Wifi, WifiOff, Navigation,
  AlertTriangle, MapPin, Clock,
  TrendingUp, Gauge, ChevronRight,
  Activity,
} from 'lucide-react'

const BORDER = '1px solid #E8EDF2'

// Live clock
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  return now
}

// Status helpers
const STATUS = {
  moving:  { color:'#059669', bg:'#ECFDF5', label:'Moving'  },
  stopped: { color:'#D97706', bg:'#FFFBEB', label:'Stopped' },
  online:  { color:'#059669', bg:'#ECFDF5', label:'Online'  },
  offline: { color:'#94A3B8', bg:'#F8FAFC', label:'Offline' },
}

const getStatus = s => STATUS[s] || STATUS.offline

// Pulse dot for live vehicles
function PulseDot({ color }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:10, height:10 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:.4, animation:'ping 1.5s ease infinite' }} />
      <span style={{ position:'relative', width:10, height:10, borderRadius:'50%', background:color, display:'inline-block' }} />
    </span>
  )
}

export default function Dashboard() {
  const { data:vehicles, loading:vLoad } = useApi(api.vehicles.list)
  const { data:alerts,   loading:aLoad } = useApi(api.alerts.list)
  const now = useClock()

  const total   = vehicles.length
  const moving  = vehicles.filter(v => v.status === 'moving').length
  const stopped = vehicles.filter(v => v.status === 'stopped').length
  const offline = vehicles.filter(v => v.status === 'offline').length
  const online  = vehicles.filter(v => v.status !== 'offline').length
  const unread  = alerts.filter(a => a.status === 'unread')
  const recentAlerts = unread.slice(0, 4)

  // Active vehicles sorted: moving first
  const activeVehicles = [...vehicles].sort((a, b) => {
    const order = { moving:0, stopped:1, online:2, offline:3 }
    return (order[a.status]??3) - (order[b.status]??3)
  })

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const alertColor = type =>
    type === 'Overspeed' ? '#DC2626' :
    type === 'Geofence'  ? '#D97706' :
    type === 'Offline'   ? '#64748B' : '#1B6BB5'

  return (
    <div style={{ padding:'24px 28px', minHeight:'100%', background:'#F6F8FB', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes ping { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.8);opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Top row ───────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <div style={{ color:'#94A3B8', fontSize:13, marginBottom:4 }}>{greeting}</div>
          <div style={{ color:'#0F172A', fontWeight:800, fontSize:26, letterSpacing:'-.5px' }}>Fleet Overview</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:'#0F172A', fontWeight:700, fontSize:22, fontVariantNumeric:'tabular-nums' }}>
            {now.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
          <div style={{ color:'#94A3B8', fontSize:12 }}>
            {now.toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Hero stat row ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24, animation:'fadeIn .4s ease' }}>

        {/* Total vehicles */}
        <div style={{ background:'#0F172A', borderRadius:16, padding:'22px 24px', gridColumn:'span 1', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', bottom:-20, right:-16, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, marginBottom:12 }}>Total Fleet</div>
          <div style={{ color:'white', fontWeight:900, fontSize:48, lineHeight:1, marginBottom:8 }}>{total}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#059669' }} />
            <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{online} online now</span>
          </div>
        </div>

        {/* Moving */}
        <div style={{ background:'#ECFDF5', borderRadius:16, padding:'22px 24px', border:'1px solid #BBF7D0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ color:'#065F46', fontSize:12, fontWeight:600 }}>Moving</div>
            <Navigation size={18} color="#059669" />
          </div>
          <div style={{ color:'#065F46', fontWeight:900, fontSize:48, lineHeight:1, marginBottom:8 }}>{moving}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <PulseDot color="#059669" />
            <span style={{ color:'#059669', fontSize:12, fontWeight:600 }}>Live on road</span>
          </div>
        </div>

        {/* Stopped */}
        <div style={{ background:'white', borderRadius:16, padding:'22px 24px', border:BORDER }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ color:'#64748B', fontSize:12, fontWeight:600 }}>Stopped</div>
            <Activity size={18} color="#D97706" />
          </div>
          <div style={{ color:'#0F172A', fontWeight:900, fontSize:48, lineHeight:1, marginBottom:8 }}>{stopped}</div>
          <div style={{ color:'#94A3B8', fontSize:12 }}>Engine idling</div>
        </div>

        {/* Alerts */}
        <div style={{ background: unread.length > 0 ? '#FEF2F2' : 'white', borderRadius:16, padding:'22px 24px', border: unread.length > 0 ? '1px solid #FECACA' : BORDER }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ color: unread.length > 0 ? '#DC2626' : '#64748B', fontSize:12, fontWeight:600 }}>Alerts</div>
            <AlertTriangle size={18} color={unread.length > 0 ? '#DC2626' : '#94A3B8'} />
          </div>
          <div style={{ color: unread.length > 0 ? '#DC2626' : '#0F172A', fontWeight:900, fontSize:48, lineHeight:1, marginBottom:8 }}>{unread.length}</div>
          <div style={{ color: unread.length > 0 ? '#DC2626' : '#94A3B8', fontSize:12, fontWeight: unread.length > 0 ? 600 : 400 }}>
            {unread.length > 0 ? 'Need attention' : 'All clear'}
          </div>
        </div>
      </div>

      {/* ── Main content: vehicles + alerts ───────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>

        {/* ── Vehicle list ───────────────────────────────────── */}
        <div style={{ background:'white', borderRadius:16, border:BORDER, overflow:'hidden' }}>
          <div style={{ padding:'18px 24px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:'#0F172A', fontWeight:700, fontSize:15 }}>Vehicles</div>
              <div style={{ color:'#94A3B8', fontSize:12, marginTop:2 }}>{total} registered · sorted by activity</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#ECFDF5', borderRadius:20 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#059669' }} />
                <span style={{ color:'#059669', fontSize:11, fontWeight:700 }}>{moving} moving</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#F8FAFC', borderRadius:20, border:BORDER }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8' }} />
                <span style={{ color:'#94A3B8', fontSize:11, fontWeight:700 }}>{offline} offline</span>
              </div>
            </div>
          </div>

          {vLoad ? (
            <div style={{ padding:48, textAlign:'center', color:'#94A3B8' }}>Loading vehicles...</div>
          ) : activeVehicles.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <Car size={36} color="#E2E8F0" style={{ margin:'0 auto 12px' }} />
              <div style={{ color:'#64748B', fontWeight:600, fontSize:15, marginBottom:4 }}>No vehicles yet</div>
              <div style={{ color:'#94A3B8', fontSize:13 }}>Add your first vehicle to get started</div>
            </div>
          ) : (
            <div>
              {activeVehicles.map((v, i) => {
                const st = getStatus(v.status)
                return (
                  <div key={v.imei}
                    style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom: i < activeVehicles.length-1 ? BORDER : 'none', transition:'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Status indicator + icon */}
                    <div style={{ width:44, height:44, borderRadius:12, background:st.bg, display:'flex', alignItems:'center', justifyContent:'center', marginRight:14, flexShrink:0, position:'relative' }}>
                      <Car size={20} color={st.color} />
                      {v.status === 'moving' && (
                        <div style={{ position:'absolute', top:-2, right:-2, width:10, height:10, borderRadius:'50%', background:'#059669', border:'2px solid white' }} />
                      )}
                    </div>

                    {/* Vehicle info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:3 }}>
                        <span style={{ color:'#0F172A', fontWeight:700, fontSize:14 }}>{v.name}</span>
                        <span style={{ color:'#94A3B8', fontSize:12 }}>{v.plate}</span>
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748B' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <Gauge size={11} /> {Math.round(v.speed || 0)} km/h
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span>🔋</span> {v.battery}%
                        </span>
                        {v.owner && v.owner !== 'Unassigned' && (
                          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span>👤</span> {v.owner}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Speed bar */}
                    <div style={{ width:80, marginRight:16 }}>
                      <div style={{ height:4, background:'#F1F5F9', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width: Math.min(100, (v.speed || 0) / 120 * 100) + '%', background: v.speed > 80 ? '#DC2626' : v.speed > 0 ? '#059669' : '#E2E8F0', borderRadius:2, transition:'width .3s' }} />
                      </div>
                    </div>

                    {/* Status badge */}
                    <span style={{ background:st.bg, color:st.color, fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:700, flexShrink:0 }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Fleet health */}
          <div style={{ background:'white', borderRadius:16, border:BORDER, padding:'18px 20px' }}>
            <div style={{ color:'#0F172A', fontWeight:700, fontSize:15, marginBottom:16 }}>Fleet Health</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                ['Online',  online,  total, '#059669'],
                ['Moving',  moving,  total, '#1B6BB5'],
                ['Stopped', stopped, total, '#D97706'],
                ['Offline', offline, total, '#94A3B8'],
              ].map(([l, v, t, c]) => (
                <div key={l}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ color:'#64748B', fontSize:13 }}>{l}</span>
                    <span style={{ color:'#0F172A', fontWeight:700, fontSize:13 }}>{v}<span style={{ color:'#94A3B8', fontWeight:400 }}> / {t}</span></span>
                  </div>
                  <div style={{ height:6, background:'#F1F5F9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: t > 0 ? (v/t*100)+'%' : '0%', background:c, borderRadius:3, transition:'width .6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active alerts */}
          <div style={{ background:'white', borderRadius:16, border:BORDER, flex:1, overflow:'hidden' }}>
            <div style={{ padding:'18px 20px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:'#0F172A', fontWeight:700, fontSize:15 }}>
                Recent Alerts
                {unread.length > 0 && (
                  <span style={{ marginLeft:8, background:'#DC2626', color:'white', fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:800, verticalAlign:'middle' }}>
                    {unread.length}
                  </span>
                )}
              </div>
            </div>

            {aLoad ? (
              <div style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>Loading...</div>
            ) : recentAlerts.length === 0 ? (
              <div style={{ padding:32, textAlign:'center' }}>
                <div style={{ width:44, height:44, borderRadius:14, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                  <span style={{ fontSize:22 }}>✓</span>
                </div>
                <div style={{ color:'#64748B', fontWeight:600, fontSize:14, marginBottom:3 }}>All clear</div>
                <div style={{ color:'#94A3B8', fontSize:12 }}>No active alerts</div>
              </div>
            ) : (
              <div>
                {recentAlerts.map((a, i) => (
                  <div key={a.alert_id}
                    style={{ padding:'14px 20px', borderBottom: i < recentAlerts.length-1 ? BORDER : 'none', display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:alertColor(a.type), flexShrink:0, marginTop:4 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:2 }}>
                        <span style={{ color:'#0F172A', fontWeight:600, fontSize:13 }}>{a.type}</span>
                        <span style={{ color:'#94A3B8', fontSize:11, flexShrink:0 }}>{a.alert_time?.split(' ')[1] || a.alert_time}</span>
                      </div>
                      <div style={{ color:'#64748B', fontSize:12, marginBottom:2 }}>{a.vehicle}</div>
                      {a.speed > 0 && <div style={{ color:'#94A3B8', fontSize:11 }}>{a.speed} km/h</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}