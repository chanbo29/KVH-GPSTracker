import { useState, useEffect } from 'react'
import { Car, Activity, WifiOff, Clock, AlertTriangle, TrendingUp, Shield } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../api/client.js'
import { LoadingStyles, Skel, Spinner, SkeletonStatCard, SkeletonCard } from '../components/Loading.jsx'

const B = '#1B6BB5', G = '#059669', R = '#DC2626', A = '#D97706'
const sc = s => s==='moving'||s==='online'?G:s==='stopped'?A:'#94A3B8'
const sb = s => s==='moving'||s==='online'?'#ECFDF5':s==='stopped'?'#FFFBEB':'#F8FAFC'

export default function Dashboard() {
  const { data:vehicles, loading:vL } = useApi(api.vehicles.list)
  const { data:alerts,   loading:aL } = useApi(api.alerts.list)
  const { data:drivers,  loading:dL } = useApi(api.drivers.list)
  const loading = vL||aL||dL

  const moving   = vehicles.filter(v=>v.status==='moving').length
  const stopped  = vehicles.filter(v=>v.status==='stopped').length
  const offline  = vehicles.filter(v=>v.status==='offline').length
  const unread   = alerts.filter(a=>a.status==='unread').length
  const recent   = alerts.slice(0,5)
  const sorted   = [...vehicles].sort((a,b)=>{const o={moving:0,stopped:1,offline:2};return(o[a.status]??3)-(o[b.status]??3)})

  const statCards = [
    { label:'Total Vehicles', value:vehicles.length, icon:Car,      color:B                      },
    { label:'Moving',         value:moving,           icon:Activity, color:G                      },
    { label:'Stopped',        value:stopped,          icon:Clock,    color:A                      },
    { label:'Offline',        value:offline,          icon:WifiOff,  color:'#94A3B8'              },
    { label:'Alerts',         value:unread,           icon:AlertTriangle, color:unread>0?R:'#94A3B8' },
    { label:'Drivers',        value:drivers.length,   icon:Shield,   color:B                      },
  ]

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:24, fontWeight:800, color:'#0F172A' }}>Dashboard</div>
          {loading && <Spinner size={20}/>}
        </div>
        <div style={{ color:'#64748B', fontSize:14, marginTop:4 }}>Fleet overview — real-time status</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:28 }}>
        {loading ? (
          Array.from({length:6}).map((_,i)=><SkeletonStatCard key={i}/>)
        ) : (
          statCards.map(({ label, value, icon:Icon, color })=>(
            <div key={label} style={{ background:'white', borderRadius:12, padding:'20px', border:'1px solid #E2E8F0', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={20} color={color}/></div>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'#0F172A', lineHeight:1, marginBottom:6 }}>{value}</div>
              <div style={{ fontSize:13, color:'#64748B' }}>{label}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
        {/* Vehicle list */}
        <div style={{ background:'white', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#0F172A' }}>Vehicles</div>
            {loading && <Spinner size={16}/>}
          </div>
          {loading ? (
            <div style={{ padding:'16px 20px' }}>
              {Array.from({length:5}).map((_,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #F1F5F9' }}>
                  <Skel w={42} h={42} r={10}/>
                  <div style={{ flex:1 }}><Skel h={14} mb={7}/><Skel w="55%" h={11}/></div>
                  <Skel w={65} h={24} r={20}/>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxHeight:420, overflowY:'auto' }}>
              {sorted.map(v=>(
                <div key={v.imei} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:'1px solid #F8FAFC' }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:sb(v.status), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Car size={20} color={sc(v.status)}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                    <div style={{ fontSize:12, color:'#64748B' }}>{v.plate} · {Math.round(v.speed||0)} km/h</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:sb(v.status), color:sc(v.status), fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{v.status}</span>
                  </div>
                </div>
              ))}
              {sorted.length===0 && <div style={{ textAlign:'center', padding:40, color:'#94A3B8' }}>No vehicles</div>}
            </div>
          )}
          {/* Fleet health bars */}
          {!loading && vehicles.length>0 && (
            <div style={{ padding:'16px 20px', borderTop:'1px solid #E2E8F0', display:'flex', flexDirection:'column', gap:10 }}>
              {[['Moving',moving,G],['Stopped',stopped,A],['Offline',offline,'#94A3B8']].map(([l,v,c])=>(
                <div key={l}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'#64748B' }}>{l}</span>
                    <span style={{ fontWeight:600, color:c }}>{v}</span>
                  </div>
                  <div style={{ height:6, background:'#F1F5F9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:vehicles.length>0?(v/vehicles.length*100)+'%':'0%', background:c, borderRadius:3, transition:'width .6s' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div style={{ background:'white', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#0F172A' }}>Recent Alerts</div>
            {unread>0 && !loading && <span style={{ background:'#FEF2F2', color:R, fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{unread} unread</span>}
            {loading && <Spinner size={16}/>}
          </div>
          <div style={{ overflowY:'auto', maxHeight:480 }}>
            {loading ? (
              <div style={{ padding:'16px 20px' }}>
                {Array.from({length:4}).map((_,i)=>(
                  <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #F1F5F9' }}>
                    <Skel w={38} h={38} r={10}/>
                    <div style={{ flex:1 }}><Skel h={13} mb={7}/><Skel w="70%" h={11}/></div>
                  </div>
                ))}
              </div>
            ) : recent.length===0 ? (
              <div style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:14 }}>No alerts</div>
            ) : (
              recent.map(a=>{
                const ac = a.type==='Overspeed'?R:a.type==='Geofence'?A:a.type==='Offline'?'#94A3B8':B
                return (
                  <div key={a.alert_id} style={{ padding:'14px 20px', borderBottom:'1px solid #F8FAFC', borderLeft:'3px solid '+(a.status==='unread'?ac:'transparent'), opacity:a.status==='read'?.7:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                      <span style={{ color:ac, fontWeight:700, fontSize:13 }}>{a.type}</span>
                      {a.status==='unread' && <span style={{ width:7, height:7, borderRadius:'50%', background:R, display:'inline-block', flexShrink:0, marginTop:2 }}/>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:2 }}>{a.vehicle||'—'}</div>
                    <div style={{ fontSize:12, color:'#64748B' }}>{a.description||a.location||'—'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{a.alert_time}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}