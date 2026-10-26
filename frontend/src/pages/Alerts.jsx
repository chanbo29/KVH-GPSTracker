import { useState } from 'react'
import { AlertTriangle, Check, Clock, Gauge, Bell } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../api/client.js'
import { LoadingStyles, Spinner, LoadingBar, SkeletonRows } from '../components/Loading.jsx'

const R='#DC2626', A='#D97706', B='#1B6BB5'
const ac=t=>t==='Overspeed'?R:t==='Geofence'?A:t==='Offline'?'#94A3B8':B
const ab=t=>t==='Overspeed'?'#FEF2F2':t==='Geofence'?'#FFFBEB':t==='Offline'?'#F8FAFC':'#EFF6FF'

export default function Alerts() {
  const { data:alerts, setData:setAlerts, loading } = useApi(api.alerts.list)
  const [filter, setFilter] = useState('all')
  const unread = alerts.filter(a=>a.status==='unread').length
  const filtered = filter==='all'?alerts:filter==='unread'?alerts.filter(a=>a.status==='unread'):alerts.filter(a=>a.type===filter)
  const markAll = async()=>{ try{await api.alerts.markAllRead();setAlerts(p=>p.map(a=>({...a,status:'read'})))}catch(e){alert(e.message)} }

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24, fontWeight:800, color:'#0F172A' }}>Alerts</div>
            {loading && <Spinner size={20}/>}
            {unread>0 && !loading && <span style={{ background:'#FEF2F2', color:R, fontSize:13, fontWeight:700, padding:'3px 12px', borderRadius:20 }}>{unread} unread</span>}
          </div>
          <div style={{ color:'#64748B', fontSize:14, marginTop:4 }}>{alerts.length} total alerts</div>
        </div>
        {unread>0 && (
          <button onClick={markAll} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'#EFF6FF', color:B, border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
            <Check size={16}/> Mark all read
          </button>
        )}
      </div>
      <LoadingBar show={loading}/>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['all','All'],['unread','Unread'],['Overspeed','Overspeed'],['Geofence','Geofence'],['Offline','Offline']].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'7px 16px', borderRadius:20, border:filter===f?'none':'1px solid #E2E8F0', cursor:'pointer', fontSize:13, fontWeight:600, background:filter===f?'#0F172A':'white', color:filter===f?'white':'#64748B' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ background:'white', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['Type','Vehicle','Description','Time','Speed','Status'].map(h=>(
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748B', letterSpacing:.5, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows n={7} cols={['12%','18%','25%','15%','10%','10%']}/>
            ) : filtered.map(a=>(
              <tr key={a.alert_id} style={{ borderBottom:'1px solid #F1F5F9', opacity:a.status==='read'?.7:1, borderLeft:'3px solid '+(a.status==='unread'?ac(a.type):'transparent') }}>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:ab(a.type), display:'flex', alignItems:'center', justifyContent:'center' }}><AlertTriangle size={15} color={ac(a.type)}/></div>
                    <span style={{ color:ac(a.type), fontWeight:700, fontSize:13 }}>{a.type}</span>
                  </div>
                </td>
                <td style={{ padding:'14px 16px', fontWeight:600, color:'#0F172A', fontSize:13 }}>{a.vehicle||'—'}</td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.description||a.location||'—'}</td>
                <td style={{ padding:'14px 16px', color:'#94A3B8', fontSize:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}><Clock size={12}/>{a.alert_time}</div>
                </td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13 }}>
                  {a.speed>0 && <div style={{ display:'flex', alignItems:'center', gap:5 }}><Gauge size={12}/>{a.speed} km/h</div>}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{ background:a.status==='unread'?'#FEF2F2':'#F1F5F9', color:a.status==='unread'?R:'#94A3B8', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:56 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><Check size={26} color='#059669'/></div>
            <div style={{ color:'#0F172A', fontWeight:700, fontSize:17, marginBottom:6 }}>All Clear!</div>
            <div style={{ color:'#94A3B8', fontSize:13 }}>No alerts match this filter.</div>
          </div>
        )}
      </div>
    </div>
  )
}