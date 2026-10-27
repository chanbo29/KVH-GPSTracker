import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Home, Map, Car, Bell, MoreHorizontal, LogOut,
  ChevronRight, ChevronLeft, Navigation, Wifi, WifiOff,
  Battery, Gauge, MapPin, Clock, Shield, User, Search,
  AlertTriangle, Check, X, Activity, Plus, Trash2,
  Phone, Play, Pause, SkipBack, SkipForward,
  Eye, EyeOff, BarChart2, Cpu, Hexagon, Settings,
  Wrench, Droplets, CheckCircle, AlertCircle,
  Languages, Edit, Users,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../api/client.js'
import { t }      from '../constants/i18n.js'

const C = {
  bg:     '#F1F5F9',
  card:   '#FFFFFF',
  navy:   '#0F172A',
  blue:   '#1B6BB5',
  blueD:  '#0F3460',
  blueL:  '#EFF6FF',
  green:  '#059669',
  greenL: '#ECFDF5',
  red:    '#DC2626',
  redL:   '#FEF2F2',
  amber:  '#D97706',
  amberL: '#FFFBEB',
  muted:  '#64748B',
  faint:  '#94A3B8',
  border: '#E2E8F0',
}

const sv = s => s==='moving'||s==='online'
const sc = s => sv(s)?C.green:s==='stopped'?C.amber:C.faint
const sb = s => sv(s)?C.greenL:s==='stopped'?C.amberL:'#F8FAFC'
/** Translates a raw status word (moving/stopped/offline/online/active) for display. */
const tStatus = s => t('status.'+String(s||'').toLowerCase()) !== 'status.'+String(s||'').toLowerCase()
  ? t('status.'+String(s||'').toLowerCase())
  : s
/** On phone we lead with the assigned driver's name, not the vehicle's own name/model. */
const dName = v => (v.owner && v.owner!=='Unassigned') ? v.owner : t('mobile.unassigned')

/* ── Loading components ─────────────────────────────────────── */
const PULSE_CSS = `
@keyframes kvh-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes kvh-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes kvh-slideUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
@keyframes kvh-fadeIn  { from{opacity:0} to{opacity:1} }
.kvh-pulse { animation: kvh-pulse 1.5s ease-in-out infinite }
.kvh-spin  { animation: kvh-spin  0.8s linear infinite }
`

const Skel = ({ w='100%', h=14, r=8, style={} }) => (
  <div className="kvh-pulse" style={{ width:w, height:h, borderRadius:r, background:'#E2E8F0', ...style }}/>
)

const Spinner = ({ size=24, color=C.blue }) => (
  <div className="kvh-spin" style={{ width:size, height:size, borderRadius:'50%', border:`3px solid ${color}22`, borderTopColor:color, flexShrink:0 }}/>
)

const VehicleSkel = () => (
  <div style={{ background:C.card, borderRadius:14, border:'1px solid '+C.border, padding:'14px', marginBottom:10 }}>
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
      <Skel w={44} h={44} r={12}/>
      <div style={{ flex:1 }}>
        <Skel h={15} r={6} style={{ marginBottom:8 }}/>
        <Skel w="60%" h={11} r={6}/>
      </div>
      <Skel w={60} h={24} r={20}/>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
      {[0,1,2,3].map(i=><Skel key={i} h={50} r={9}/>)}
    </div>
  </div>
)

const ListSkel = ({ n=4 }) => (
  <>
    {Array.from({length:n}).map((_,i)=>(
      <div key={i} style={{ background:C.card, borderRadius:14, border:'1px solid '+C.border, padding:'14px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
        <Skel w={44} h={44} r={12}/>
        <div style={{ flex:1 }}>
          <Skel h={15} r={6} style={{ marginBottom:8 }}/>
          <Skel w="50%" h={11} r={6}/>
        </div>
      </div>
    ))}
  </>
)

const LoadingBar = ({ show }) => show ? (
  <div className="kvh-pulse" style={{ height:3, background:C.blue, borderRadius:0, flexShrink:0 }}/>
) : <div style={{ height:3, flexShrink:0 }}/>

/* ── Layout wrappers ─────────────────────────────────────────── */
const Screen = ({ children }) => (
  <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', paddingBottom:72 }}>
    {children}
  </div>
)

const Bar = ({ title, onBack, action, loading }) => (
  <div style={{ background:C.card, borderBottom:'1px solid '+C.border, flexShrink:0 }}>
    <div style={{ height:56, display:'flex', alignItems:'center', padding:'0 14px', gap:10 }}>
      {onBack && (
        <button onClick={onBack} style={{ width:38, height:38, borderRadius:10, background:C.bg, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <ChevronLeft size={22} color={C.navy}/>
        </button>
      )}
      <div style={{ flex:1, fontWeight:800, fontSize:17, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
      {loading && <Spinner size={20}/>}
      {action && !loading && action}
    </div>
    <LoadingBar show={loading}/>
  </div>
)

const Sheet = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end' }}>
    <div style={{ background:'white', borderRadius:'20px 20px 0 0', width:'100%', height:'90dvh', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.border }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', padding:'10px 16px 12px', borderBottom:'1px solid '+C.border, flexShrink:0 }}>
        <div style={{ flex:1, fontWeight:800, fontSize:17, color:C.navy }}>{title}</div>
        <button onClick={onClose} style={{ width:38, height:38, borderRadius:10, background:C.bg, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <X size={18} color={C.navy}/>
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'16px', paddingBottom:'max(32px,env(safe-area-inset-bottom))' }}>
        {children}
      </div>
    </div>
  </div>
)

const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, borderRadius:14, border:'1px solid '+C.border, overflow:'hidden', ...style }}>{children}</div>
)
const Pill = ({ label, color, bg }) => (
  <span style={{ background:bg, color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, flexShrink:0 }}>{label}</span>
)
const IconBox = ({ icon:Icon, color, bg, size=20 }) => (
  <div style={{ width:44, height:44, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
    <Icon size={size} color={color}/>
  </div>
)
/* Avatar with initials, colored by name — used on the Drivers screen */
const AVATAR_PALETTE = [C.blue,C.green,C.amber,'#7C3AED',C.red,'#0891B2']
const MiniAvatar = ({ name, size=44 }) => {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_PALETTE.length
  const col = AVATAR_PALETTE[idx]
  const initials = name ? name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:col+'1A', border:'1.5px solid '+col+'55', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800, fontSize:size*0.36, color:col }}>
      {initials}
    </div>
  )
}
const Row = ({ children, style={} }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, ...style }}>{children}</div>
)
const IconBtn = ({ icon:Icon, color=C.navy, bg=C.bg, onClick, size=18 }) => (
  <button onClick={onClick} style={{ width:38, height:38, borderRadius:10, background:bg, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
    <Icon size={size} color={color}/>
  </button>
)
const SearchBar = ({ value, onChange, placeholder='Search...' }) => (
  <div style={{ display:'flex', gap:8, alignItems:'center', background:C.card, borderRadius:12, padding:'10px 14px', border:'1px solid '+C.border }}>
    <Search size={15} color={C.faint}/>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ flex:1, border:'none', outline:'none', fontSize:14, color:C.navy, background:'none' }}/>
  </div>
)
const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
      <label style={{ color:C.muted, fontSize:12, fontWeight:600 }}>{label}</label>
      {hint && <span style={{ color:C.faint, fontSize:11 }}>{hint}</span>}
    </div>
    {children}
  </div>
)
const TInput = ({ value, onChange, placeholder, type='text', mono }) => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ width:'100%', padding:'13px 14px', border:'1px solid '+C.border, borderRadius:10, fontSize:15, color:C.navy, outline:'none', boxSizing:'border-box', fontFamily:mono?'monospace':'inherit', background:'white' }}/>
)
const TSelect = ({ value, onChange, children }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ width:'100%', padding:'13px 14px', border:'1px solid '+C.border, borderRadius:10, fontSize:15, color:C.navy, outline:'none', background:'white', boxSizing:'border-box' }}>
    {children}
  </select>
)
const PrimaryBtn = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ flex:1, padding:'14px', background:disabled?C.faint:C.blue, color:'white', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:disabled?'not-allowed':'pointer', opacity:disabled?.6:1 }}>
    {label}
  </button>
)
const GhostBtn = ({ label, onClick }) => (
  <button onClick={onClick}
    style={{ flex:1, padding:'14px', background:C.bg, border:'1px solid '+C.border, borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', color:C.muted }}>
    {label}
  </button>
)

/* ── Bottom Nav ─────────────────────────────────────────────── */
const TABS = [
  { id:'home',     labelKey:'mobile.home',     Icon:Home           },
  { id:'tracking', labelKey:'mobile.tracking', Icon:Map            },
  { id:'vehicles', labelKey:'nav.vehicles',    Icon:Car            },
  { id:'alerts',   labelKey:'nav.alerts',      Icon:Bell           },
  { id:'more',     labelKey:'mobile.more',     Icon:MoreHorizontal },
]
const MAIN = new Set(TABS.map(tab=>tab.id))

function Nav({ active, onNav, unread }) {
  const cur = MAIN.has(active)?active:'more'
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, background:C.card, borderTop:'1px solid '+C.border, paddingBottom:'max(8px,env(safe-area-inset-bottom))' }}>
      <div style={{ display:'flex', height:52 }}>
        {TABS.map(({ id, labelKey, Icon })=>{
          const label=t(labelKey)
          const on=cur===id
          return (
            <button key={id} onClick={()=>onNav(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'none', background:'none', cursor:'pointer', gap:3, position:'relative' }}>
              {id==='alerts' && unread>0 && (
                <div style={{ position:'absolute', top:4, left:'50%', marginLeft:5, background:C.red, color:'white', borderRadius:10, fontSize:9, fontWeight:800, padding:'1px 5px', minWidth:16, textAlign:'center' }}>
                  {unread>9?'9+':unread}
                </div>
              )}
              <div style={{ width:40, height:26, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:13, background:on?C.blueL:'transparent' }}>
                <Icon size={19} color={on?C.blue:C.faint} strokeWidth={on?2.5:1.8}/>
              </div>
              <span style={{ fontSize:10, fontWeight:on?700:400, color:on?C.blue:C.faint }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   HOME
════════════════════════════════════════════════════════════ */
function HomeScreen({ user, onNav }) {
  const { data:vehicles, loading:vL } = useApi(api.vehicles.list)
  const { data:alerts,   loading:aL } = useApi(api.alerts.list)
  const [now, setNow] = useState(new Date())
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(id) },[])
  const loading = vL||aL
  const moving  = vehicles.filter(v=>v.status==='moving').length
  const stopped = vehicles.filter(v=>v.status==='stopped').length
  const offline = vehicles.filter(v=>v.status==='offline').length
  const unread  = alerts.filter(a=>a.status==='unread').length
  const hour    = now.getHours()
  const greet   = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  return (
    <Screen>
      <div style={{ background:'linear-gradient(150deg,'+C.blueD+','+C.blue+')', padding:'max(44px,env(safe-area-inset-top)) 18px 22px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <img src="/kvh-logo.png" alt="" style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'55%', maxWidth:220, opacity:.08, filter:'brightness(0) invert(1)', pointerEvents:'none' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, position:'relative' }}>
          <div>
            <div style={{ color:'rgba(255,255,255,.65)', fontSize:12, marginBottom:3 }}>{greet} 👋</div>
            <div style={{ color:'white', fontWeight:800, fontSize:18, textTransform:'uppercase', letterSpacing:.5 }}>{user?.name||'Admin KVH'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'white', fontWeight:700, fontSize:17 }}>{now.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:11 }}>{now.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</div>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,.12)', borderRadius:14, padding:'14px', position:'relative' }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}><Spinner size={28} color="white"/></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[[vehicles.length,t('mobile.fleet'),'white'],[moving,t('mobile.moving'),'#86EFAC'],[unread,t('nav.alerts'),unread>0?'#FCA5A5':'rgba(255,255,255,.55)']].map(([v,l,col])=>(
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ color:col, fontWeight:800, fontSize:24, lineHeight:1 }}>{v}</div>
                  <div style={{ color:'rgba(255,255,255,.55)', fontSize:11, marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding:'16px 14px' }}>
        <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:10 }}>{t('mobile.quickAccess')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
          {[[t('mobile.map'),Map,'tracking',C.blue,C.blueL],[t('nav.vehicles'),Car,'vehicles',C.green,C.greenL],[t('nav.alerts'),Bell,'alerts',C.red,C.redL],[t('mobile.more'),MoreHorizontal,'more',C.amber,C.amberL]].map(([l,Icon,nav,col,bg])=>(
            <button key={l} onClick={()=>onNav(nav)} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:'12px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer' }}>
              <div style={{ width:44, height:44, borderRadius:13, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={20} color={col}/></div>
              <span style={{ color:C.navy, fontSize:11, fontWeight:600 }}>{l}</span>
            </button>
          ))}
        </div>
        <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:10 }}>{t('mobile.fleetStatus')}</div>
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {loading ? (
            [0,1,2].map(i=>(
              <div key={i} style={{ flex:1, background:C.card, borderRadius:14, padding:'12px 10px', border:'1px solid '+C.border }}>
                <Skel w={32} h={32} r={9} style={{ marginBottom:8 }}/>
                <Skel h={22} r={6} style={{ marginBottom:6 }}/>
                <Skel w="60%" h={11} r={6}/>
              </div>
            ))
          ) : (
            [['Moving',moving,C.green,Activity],['Stopped',stopped,C.amber,Clock],['Offline',offline,C.faint,WifiOff]].map(([l,v,col,Icon])=>(
              <div key={l} style={{ flex:1, background:C.card, borderRadius:14, padding:'12px 10px', border:'1px solid '+C.border, display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:col+'18', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color={col}/></div>
                <div style={{ color:C.navy, fontWeight:800, fontSize:20 }}>{v}</div>
                <div style={{ color:C.faint, fontSize:11 }}>{l}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>{t('nav.vehicles')}</div>
          <button onClick={()=>onNav('vehicles')} style={{ color:C.blue, fontSize:12, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>{t('common.seeAll')} →</button>
        </div>
        {loading ? (
          [0,1,2].map(i=>(
            <div key={i} style={{ background:C.card, borderRadius:14, padding:'12px 14px', border:'1px solid '+C.border, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
              <Skel w={44} h={44} r={12}/>
              <div style={{ flex:1 }}><Skel h={15} r={6} style={{ marginBottom:7 }}/><Skel w="55%" h={11} r={6}/></div>
              <Skel w={60} h={24} r={20}/>
            </div>
          ))
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {vehicles.slice(0,4).map(v=>(
              <Card key={v.imei} style={{ padding:'12px 14px' }}>
                <Row>
                  <IconBox icon={Car} color={sc(v.status)} bg={sb(v.status)}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.navy, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dName(v)}</div>
                    <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name} · {v.plate} · {Math.round(v.speed||0)} km/h</div>
                  </div>
                  <Pill label={tStatus(v.status)} color={sc(v.status)} bg={sb(v.status)}/>
                </Row>
              </Card>
            ))}
            {vehicles.length===0 && <Card style={{ padding:24, textAlign:'center' }}><div style={{ color:C.faint }}>{t('mobile.noVehiclesYet')}</div></Card>}
          </div>
        )}
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   LIVE TRACKING
════════════════════════════════════════════════════════════ */
function TrackingScreen() {
  const { data:vehicles, loading } = useApi(api.vehicles.list)
  const [sel,       setSel]       = useState(null)
  const [sheet,     setSheet]     = useState(false)
  const [sheetFilter, setSheetFilter] = useState('all')
  const [ready,     setReady]     = useState(false)
  const [search,    setSearch]    = useState('')
  const mapEl=useRef(null); const gmap=useRef(null); const marks=useRef({})
  const filtered = vehicles
    .filter(v=>sheetFilter==='all'||v.status===sheetFilter)
    .filter(v=>!search||v.name?.toLowerCase().includes(search.toLowerCase())||v.plate?.includes(search)||v.owner?.toLowerCase().includes(search.toLowerCase()))
  const moving  = vehicles.filter(v=>v.status==='moving').length
  const stopped = vehicles.filter(v=>v.status==='stopped').length
  const offline = vehicles.filter(v=>v.status==='offline').length
  const mkIcon=(status,initial)=>L.divIcon({
    className:'kvh-mobile-marker',
    html:`<div style="width:30px;height:30px;border-radius:50%;background:${sc(status)};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;">${initial}</div>`,
    iconSize:[30,30],
    iconAnchor:[15,15],
  })
  const initMap=()=>{
    if(!mapEl.current||gmap.current)return
    const map=L.map(mapEl.current,{center:[11.5564,104.9282],zoom:13,zoomControl:true})
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    gmap.current=map
    setReady(true)
  }
  useEffect(()=>{initMap()},[])
  useEffect(()=>{
    if(!ready)return
    vehicles.forEach(v=>{
      if(!v.lat||!v.lng)return
      if(marks.current[v.imei]){marks.current[v.imei].setLatLng([v.lat,v.lng]);return}
      const m=L.marker([v.lat,v.lng],{icon:mkIcon(v.status,dName(v).charAt(0).toUpperCase()),title:dName(v)+' · '+v.plate}).addTo(gmap.current)
      m.on('click',()=>{setSel(v);setSheet(false)})
      marks.current[v.imei]=m
    })
  },[vehicles,ready])
  const panTo=v=>{setSel(v);setSheet(false);if(gmap.current&&v.lat&&v.lng){gmap.current.flyTo([v.lat,v.lng],16)}}
  const fitAll=()=>{
    if(!gmap.current)return
    const pts=vehicles.filter(v=>v.lat&&v.lng)
    if(!pts.length)return
    if(pts.length===1){gmap.current.flyTo([pts[0].lat,pts[0].lng],16);return}
    const bounds=L.latLngBounds(pts.map(v=>[v.lat,v.lng]))
    gmap.current.fitBounds(bounds,{padding:[64,64]})
  }
  const openFilter=key=>{setSheetFilter(key);setSearch('');setSel(null);setSheet(true)}
  return (
    <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {loading && <LoadingBar show/>}
      <div ref={mapEl} style={{ flex:1 }}/>

      {/* ── Fleet summary bar + quick status filters ─────────────────── */}
      <div style={{ position:'absolute', top:'max(14px,env(safe-area-inset-top))', left:12, right:12, zIndex:40, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <button onClick={()=>{setSheetFilter('all');setSearch('');setSheet(p=>!p)}}
          style={{ background:C.navy, color:'white', border:'none', borderRadius:24, padding:'10px 18px', display:'flex', alignItems:'center', gap:9, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,.3)', fontSize:13, fontWeight:700 }}>
          {loading ? <Spinner size={14} color="white"/> : <Car size={15} color="white"/>}
          {loading ? t('common.loading') : vehicles.length+' '+t('nav.vehicles')}
          {!loading && <div style={{ width:7, height:7, borderRadius:'50%', background:moving>0?'#86EFAC':C.faint, flexShrink:0 }}/>}
          <ChevronRight size={14} color="rgba(255,255,255,.6)" style={{ transform:sheet?'rotate(-90deg)':'rotate(90deg)', transition:'transform .2s' }}/>
        </button>
        {!loading && vehicles.length>0 && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', maxWidth:'100%', padding:'1px' }}>
            {[['moving',t('status.moving'),moving,C.green],['stopped',t('status.stopped'),stopped,C.amber],['offline',t('status.offline'),offline,C.faint]].map(([key,label,count,col])=>(
              <button key={key} onClick={()=>openFilter(key)}
                style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, border:'none', cursor:'pointer', background:'white', boxShadow:'0 2px 10px rgba(0,0,0,.15)', fontSize:11, fontWeight:700, color:C.navy }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:col, flexShrink:0 }}/>
                {label} · {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Recenter-on-fleet button ──────────────────────────────────── */}
      {ready && (
        <button onClick={fitAll} title={t('mobile.map')}
          style={{ position:'absolute', right:14, bottom: sel && !sheet ? 'calc(52px + max(8px,env(safe-area-inset-bottom)) + 168px)' : 'calc(52px + max(8px,env(safe-area-inset-bottom)) + 16px)', width:46, height:46, borderRadius:23, background:'white', border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.22)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:39, transition:'bottom .2s ease' }}>
          <Navigation size={19} color={C.blue}/>
        </button>
      )}

      {/* ── Selected vehicle card ─────────────────────────────────────── */}
      {sel && !sheet && (
        <div style={{ position:'absolute', bottom:'calc(52px + max(8px,env(safe-area-inset-bottom)) + 14px)', left:12, right:12, background:'white', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.2)', zIndex:40, maxHeight:'calc(100% - 140px)', overflowY:'auto', WebkitOverflowScrolling:'touch', animation:'kvh-slideUp .22s ease' }}>
          <div style={{ padding:16 }}>
            <Row style={{ marginBottom:14 }}>
              <IconBox icon={Car} color={sc(sel.status)} bg={sb(sel.status)} size={22}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:C.navy, fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dName(sel)}</div>
                <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sel.name} · {sel.plate}</div>
              </div>
              <Pill label={tStatus(sel.status)} color={sc(sel.status)} bg={sb(sel.status)}/>
              <button onClick={()=>setSel(null)} aria-label={t('common.close')}
                style={{ width:34, height:34, borderRadius:17, border:'none', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                <X size={16} color={C.muted}/>
              </button>
            </Row>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[[t('mobile.speed'),Math.round(sel.speed||0)+' km/h',Gauge],[t('mobile.battery'),sel.battery+'%',Battery],[t('mobile.signal'),sel.signal+'/5',Wifi]].map(([l,v,Icon])=>(
                <div key={l} style={{ background:C.bg, borderRadius:10, padding:'10px 6px', textAlign:'center' }}>
                  <Icon size={15} color={C.blue} style={{ margin:'0 auto 5px' }}/>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:13 }}>{v}</div>
                  <div style={{ color:C.faint, fontSize:10 }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{if(gmap.current&&sel.lat&&sel.lng){gmap.current.panTo({lat:sel.lat,lng:sel.lng});gmap.current.setZoom(17)}}}
              style={{ width:'100%', padding:'12px', background:C.blueL, color:C.blue, border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <Navigation size={14}/> {t('mobile.map')}
            </button>
          </div>
        </div>
      )}

      {/* ── All-vehicles sheet with filters ───────────────────────────── */}
      {sheet && (
        <div style={{ position:'absolute', bottom:'calc(52px + max(8px,env(safe-area-inset-bottom)))', left:0, right:0, background:'white', borderRadius:'20px 20px 0 0', maxHeight:'62%', display:'flex', flexDirection:'column', boxShadow:'0 -8px 32px rgba(0,0,0,.15)', zIndex:40, animation:'kvh-slideUp .22s ease' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}><div style={{ width:36, height:4, borderRadius:2, background:C.border }}/></div>
          <div style={{ padding:'0 14px 10px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <div style={{ flex:1 }}><SearchBar value={search} onChange={setSearch} placeholder={t('mobile.searchVehicles')}/></div>
              <button onClick={()=>setSheet(false)} style={{ background:C.bg, border:'none', borderRadius:10, padding:'9px 14px', cursor:'pointer', color:C.muted, fontSize:13, fontWeight:600, flexShrink:0 }}>{t('common.close')}</button>
            </div>
            <div style={{ display:'flex', gap:7, overflowX:'auto' }}>
              {['all','moving','stopped','offline'].map(f=>(
                <button key={f} onClick={()=>setSheetFilter(f)}
                  style={{ padding:'6px 13px', borderRadius:20, border:sheetFilter===f?'none':'1px solid '+C.border, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:sheetFilter===f?C.navy:C.card, color:sheetFilter===f?'white':C.muted, flexShrink:0 }}>
                  {t('status.'+f)} ({f==='all'?vehicles.length:vehicles.filter(v=>v.status===f).length})
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowY:'auto', flex:1, padding:'4px 14px 24px', borderTop:'1px solid '+C.border, WebkitOverflowScrolling:'touch' }}>
            {loading && <div style={{ display:'flex', justifyContent:'center', padding:20 }}><Spinner/></div>}
            {!loading && filtered.length===0 && (
              <div style={{ textAlign:'center', padding:36, color:C.faint, fontSize:13 }}>{t('mobile.noVehiclesFound')}</div>
            )}
            {filtered.map(v=>(
              <button key={v.imei} onClick={()=>panTo(v)}
                style={{ width:'100%', textAlign:'left', background:'none', border:'none', padding:0, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 2px', borderBottom:'1px solid '+C.border }}>
                  <IconBox icon={Car} color={sc(v.status)} bg={sb(v.status)} size={20}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.navy, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dName(v)}</div>
                    <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name} · {v.plate} · {Math.round(v.speed||0)} km/h</div>
                  </div>
                  <Pill label={tStatus(v.status)} color={sc(v.status)} bg={sb(v.status)}/>
                  <ChevronRight size={16} color={C.faint} style={{ flexShrink:0 }}/>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   VEHICLES
════════════════════════════════════════════════════════════ */
function VehiclesScreen() {
  const { data:vehicles, loading } = useApi(api.vehicles.list)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const filtered = vehicles.filter(v=>(!search||v.name?.toLowerCase().includes(search.toLowerCase())||v.plate?.includes(search)||v.owner?.toLowerCase().includes(search.toLowerCase()))&&(filter==='all'||v.status===filter))
  return (
    <Screen>
      <div style={{ padding:'12px 14px 6px', position:'sticky', top:0, background:C.bg, zIndex:10 }}>
        <SearchBar value={search} onChange={setSearch} placeholder={t('mobile.searchVehicles')}/>
        <div style={{ display:'flex', gap:7, overflowX:'auto', padding:'10px 0 2px' }}>
          {['all','moving','stopped','offline'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'5px 14px', borderRadius:20, border:filter===f?'none':'1px solid '+C.border, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:filter===f?C.navy:C.card, color:filter===f?'white':C.muted, flexShrink:0 }}>
              {t('status.'+f)} ({f==='all'?vehicles.length:vehicles.filter(v=>v.status===f).length})
            </button>
          ))}
          {loading && <div style={{ display:'flex', alignItems:'center', paddingLeft:8 }}><Spinner size={16}/></div>}
        </div>
      </div>
      <div style={{ padding:'6px 14px' }}>
        {loading && filtered.length===0 ? <VehicleSkel/> : (
          <>
            {filtered.map(v=>(
              <Card key={v.imei} style={{ marginBottom:10 }}>
                <div style={{ padding:'14px' }}>
                  <Row style={{ marginBottom:12 }}>
                    <IconBox icon={Car} color={sc(v.status)} bg={sb(v.status)} size={22}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:C.navy, fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dName(v)}</div>
                      <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name} · {v.plate}</div>
                    </div>
                    <Pill label={tStatus(v.status)} color={sc(v.status)} bg={sb(v.status)}/>
                  </Row>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {[[t('mobile.speed'),Math.round(v.speed||0)+' km/h',Gauge,v.speed>0?C.green:C.faint],[t('mobile.battery'),v.battery+'%',Battery,v.battery<20?C.red:C.green],[t('mobile.signal'),v.signal+'/5',Wifi,C.blue],['IMEI','..'+v.imei?.slice(-4),Cpu,C.muted]].map(([l,val,Icon,col])=>(
                      <div key={l} style={{ background:C.bg, borderRadius:9, padding:'8px 4px', textAlign:'center' }}>
                        <Icon size={13} color={col} style={{ margin:'0 auto 3px' }}/>
                        <div style={{ color:C.navy, fontWeight:700, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</div>
                        <div style={{ color:C.faint, fontSize:9 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
            {!loading && filtered.length===0 && <div style={{ textAlign:'center', padding:40, color:C.faint }}>{t('mobile.noVehiclesFound')}</div>}
          </>
        )}
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   ALERTS
════════════════════════════════════════════════════════════ */
function AlertsScreen() {
  const { data:alerts, setData:setAlerts, loading } = useApi(api.alerts.list)
  const unread = alerts.filter(a=>a.status==='unread').length
  const markAll = async()=>{ try{await api.alerts.markAllRead();setAlerts(p=>p.map(a=>({...a,status:'read'})))}catch{} }
  const ac = t => t==='Overspeed'?C.red:t==='Geofence'?C.amber:t==='Night Driving'?'#7C3AED':t==='Offline'?C.faint:C.blue
  const ab = t => t==='Overspeed'?C.redL:t==='Geofence'?C.amberL:t==='Night Driving'?'#F5F3FF':t==='Offline'?'#F8FAFC':C.blueL
  return (
    <Screen>
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ color:C.navy, fontWeight:800, fontSize:18 }}>Alerts</div>
            {loading && <Spinner size={16}/>}
          </div>
          {unread>0 && <div style={{ color:C.red, fontSize:12, fontWeight:600 }}>{unread} unread</div>}
        </div>
        {unread>0 && (
          <button onClick={markAll} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:C.blueL, border:'none', borderRadius:10, color:C.blue, fontWeight:600, fontSize:13, cursor:'pointer' }}>
            <Check size={14}/> Mark all read
          </button>
        )}
      </div>
      <div style={{ padding:'12px 14px' }}>
        {loading && alerts.length===0 ? <ListSkel n={3}/> : (
          <>
            {alerts.length===0 && (
              <div style={{ textAlign:'center', padding:52 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:C.greenL, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><Check size={28} color={C.green}/></div>
                <div style={{ color:C.navy, fontWeight:700, fontSize:17, marginBottom:6 }}>All Clear!</div>
                <div style={{ color:C.faint, fontSize:13 }}>No alerts at this time.</div>
              </div>
            )}
            {alerts.map(a=>(
              <Card key={a.alert_id} style={{ marginBottom:10, borderLeft:'4px solid '+(a.status==='unread'?ac(a.type):C.border), opacity:a.status==='read'?.7:1 }}>
                <div style={{ padding:'13px' }}>
                  <Row>
                    <div style={{ width:40, height:40, borderRadius:11, background:ab(a.type), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <AlertTriangle size={18} color={ac(a.type)}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <Row style={{ gap:6, marginBottom:3 }}>
                        <span style={{ color:ac(a.type), fontWeight:700, fontSize:13 }}>{a.type}</span>
                        {a.status==='unread' && <span style={{ width:7, height:7, borderRadius:'50%', background:C.red, display:'inline-block', flexShrink:0 }}/>}
                      </Row>
                      <div style={{ color:C.navy, fontWeight:600, fontSize:14, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.vehicle||'Vehicle'}</div>
                      <div style={{ color:C.muted, fontSize:12 }}>{a.description||a.location||'—'}</div>
                      <div style={{ display:'flex', gap:12, marginTop:5, fontSize:11, color:C.faint }}>
                        <span><Clock size={10}/> {a.alert_time}</span>
                        {a.speed>0 && <span><Gauge size={10}/> {a.speed} km/h</span>}
                      </div>
                    </div>
                  </Row>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   DRIVERS
════════════════════════════════════════════════════════════ */
function DriversScreen({ onBack }) {
  const { data:drivers, setData:setDrivers, loading } = useApi(api.drivers.list)
  const { data:vehicles } = useApi(api.vehicles.list)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sheet,  setSheet]  = useState(null)   // null | 'add' | 'edit' | 'view'
  const [form,   setForm]   = useState({ name:'', phone:'', license:'', status:'active' })
  const [editId, setEditId] = useState(null)
  const [viewing,setViewing]= useState(null)
  const [saving, setSaving] = useState(false)

  const vehicleFor = name => vehicles.find(v=>v.owner===name) || null

  const stats = {
    total:    drivers.length,
    active:   drivers.filter(d=>d.status==='active').length,
    assigned: drivers.filter(d=>vehicleFor(d.name)).length,
  }

  const filtered = drivers.filter(d=>{
    const q = search.toLowerCase()
    const veh = vehicleFor(d.name)
    const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.phone?.includes(q) || veh?.name?.toLowerCase().includes(q)
    const matchFilter = filter==='all' || d.status===filter
    return matchSearch && matchFilter
  })

  const openAdd  = () => { setForm({ name:'', phone:'', license:'', status:'active' }); setEditId(null); setSheet('add') }
  const openEdit = d  => { setForm({ name:d.name||'', phone:d.phone||'', license:d.license||'', status:d.status||'active' }); setEditId(d.driver_id); setSheet('edit') }
  const openView = d  => { setViewing(d); setSheet('view') }
  const close    = () => { setSheet(null); setViewing(null); setEditId(null) }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (sheet === 'add') {
        const r = await api.drivers.create({ ...form, name:form.name.trim() })
        setDrivers(p=>[r,...p])
      } else {
        await api.drivers.update(editId, { ...form, name:form.name.trim() })
        setDrivers(p=>p.map(d=>d.driver_id===editId ? { ...d, ...form } : d))
      }
      close()
    } catch(e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!window.confirm(t('mobile.confirmDeleteDriver'))) return
    try { await api.drivers.delete(id); setDrivers(p=>p.filter(d=>d.driver_id!==id)) }
    catch(e) { alert(e.message) }
  }

  return (
    <Screen>
      <Bar title={t('nav.drivers')} onBack={onBack} loading={loading} action={<IconBtn icon={Plus} color="white" bg={C.blue} onClick={openAdd}/>}/>

      <div style={{ padding:'12px 14px 0' }}>
        {!loading && drivers.length>0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
            {[[t('mobile.total'),stats.total,Users,C.blue],[t('status.active'),stats.active,CheckCircle,C.green],[t('mobile.withVehicle'),stats.assigned,Car,C.amber]].map(([l,v,Icon,col])=>(
              <div key={l} style={{ background:C.card, borderRadius:14, padding:'10px 8px', border:'1px solid '+C.border, textAlign:'center' }}>
                <Icon size={15} color={col} style={{ margin:'0 auto 4px' }}/>
                <div style={{ color:C.navy, fontWeight:800, fontSize:17 }}>{v}</div>
                <div style={{ color:C.faint, fontSize:10 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <SearchBar value={search} onChange={setSearch} placeholder={t('mobile.searchDrivers')}/>
        <div style={{ display:'flex', gap:7, overflowX:'auto', padding:'10px 0 4px' }}>
          {['all','active','inactive'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'6px 14px', borderRadius:20, border:filter===f?'none':'1px solid '+C.border, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:filter===f?C.navy:C.card, color:filter===f?'white':C.muted, flexShrink:0 }}>
              {t('status.'+f)}{f!=='all' && ' ('+(f==='active'?stats.active:drivers.length-stats.active)+')'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'6px 14px' }}>
        {loading && drivers.length===0 ? <ListSkel n={4}/> : (
          <>
            {filtered.map(d=>{
              const veh    = vehicleFor(d.name)
              const active = d.status==='active'
              return (
                <Card key={d.driver_id} style={{ marginBottom:10, padding:'14px' }}>
                  <button onClick={()=>openView(d)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', padding:0, cursor:'pointer' }}>
                    <Row style={{ marginBottom:12 }}>
                      <MiniAvatar name={d.name}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:C.navy, fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                        <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {veh ? veh.name+' · '+veh.plate : t('mobile.unassigned')}
                        </div>
                      </div>
                      <Pill label={tStatus(d.status)} color={active?C.green:C.faint} bg={active?C.greenL:C.bg}/>
                    </Row>
                  </button>
                  <div style={{ display:'flex', gap:8 }}>
                    {d.phone ? (
                      <a href={'tel:'+d.phone} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:C.greenL, color:C.green, padding:'9px', borderRadius:10, fontSize:12.5, fontWeight:700, textDecoration:'none' }}>
                        <Phone size={13}/> {d.phone}
                      </a>
                    ) : (
                      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.faint, fontSize:12 }}>{t('mobile.noPhone')}</div>
                    )}
                    <IconBtn icon={Edit} color={C.blue} bg={C.blueL} onClick={()=>openEdit(d)}/>
                    <IconBtn icon={Trash2} color={C.red} bg={C.redL} onClick={()=>del(d.driver_id)}/>
                  </div>
                </Card>
              )
            })}
            {!loading && filtered.length===0 && (
              <div style={{ textAlign:'center', padding:48 }}>
                <User size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
                <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>
                  {search||filter!=='all' ? t('mobile.noDriversFound') : t('mobile.noDrivers')}
                </div>
                <div style={{ color:C.faint, fontSize:13 }}>
                  {search||filter!=='all' ? t('mobile.tryDifferentSearch') : t('mobile.tapAddDriver')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {sheet==='view' && viewing && (() => {
        const veh = vehicleFor(viewing.name)
        return (
          <Sheet title={viewing.name} onClose={close}>
            <Row style={{ marginBottom:18 }}>
              <MiniAvatar name={viewing.name} size={50}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:C.navy, fontWeight:800, fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{viewing.name}</div>
                <div style={{ marginTop:4 }}><Pill label={tStatus(viewing.status)} color={viewing.status==='active'?C.green:C.faint} bg={viewing.status==='active'?C.greenL:C.bg}/></div>
              </div>
            </Row>
            {[[t('mobile.phone'),viewing.phone||'—'],[t('mobile.license'),viewing.license||'—'],[t('mobile.vehicle'),veh?veh.name+' — '+veh.plate:t('mobile.unassigned')]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid '+C.border, fontSize:13 }}>
                <span style={{ color:C.faint }}>{l}</span>
                <span style={{ color:C.navy, fontWeight:600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <GhostBtn label={t('common.close')} onClick={close}/>
              <PrimaryBtn label={t('common.edit')} onClick={()=>openEdit(viewing)}/>
            </div>
          </Sheet>
        )
      })()}

      {(sheet==='add'||sheet==='edit') && (
        <Sheet title={sheet==='add'?t('mobile.addDriver'):t('mobile.editDriver')} onClose={close}>
          <Field label={t('mobile.driverName')+' *'}><TInput value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. Dara Sok"/></Field>
          <Field label={t('mobile.phoneNumber')} hint={t('common.optional')}><TInput value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="e.g. 012-345-678" type="tel"/></Field>
          <Field label={t('mobile.licenseNumber')} hint={t('common.optional')}><TInput value={form.license} onChange={v=>setForm(f=>({...f,license:v}))} placeholder="e.g. KH-123456"/></Field>
          <Field label={t('common.status')}>
            <div style={{ display:'flex', gap:10 }}>
              {['active','inactive'].map(s=>(
                <button key={s} type="button" onClick={()=>setForm(f=>({...f,status:s}))}
                  style={{ flex:1, padding:'11px', border:'2px solid '+(form.status===s?(s==='active'?C.green:C.faint):C.border), borderRadius:11, background:form.status===s?(s==='active'?C.greenL:C.bg):C.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  {form.status===s ? <CheckCircle size={14} color={s==='active'?C.green:C.muted}/> : <AlertCircle size={14} color={C.faint}/>}
                  <span style={{ fontWeight:700, fontSize:13, color:form.status===s?(s==='active'?C.green:C.muted):C.faint }}>{t('status.'+s)}</span>
                </button>
              ))}
            </div>
          </Field>
          {sheet==='edit' && (
            <div style={{ background:C.bg, borderRadius:12, padding:'12px 14px', marginBottom:20, border:'1px solid '+C.border, display:'flex', gap:10, alignItems:'flex-start' }}>
              <Car size={14} color={C.faint} style={{ marginTop:1, flexShrink:0 }}/>
              <div>
                <div style={{ color:C.navy, fontSize:12.5, fontWeight:600 }}>{vehicleFor(form.name) ? vehicleFor(form.name).name+' — '+vehicleFor(form.name).plate : t('mobile.unassigned')}</div>
                <div style={{ color:C.faint, fontSize:11, marginTop:2 }}>{t('mobile.vehicleAssignHint')}</div>
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <GhostBtn label={t('common.cancel')} onClick={close}/>
            <PrimaryBtn label={saving?t('common.loading'):(sheet==='add'?t('mobile.addDriver'):t('common.save'))} onClick={save} disabled={saving||!form.name.trim()}/>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   GPS DEVICES
════════════════════════════════════════════════════════════ */
function DevicesScreen({ onBack }) {
  const { data:devices, setData:setDevices, loading } = useApi(api.devices.list)
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState({ imei:'', model:'GPS', sim_number:'', vehicle:'', protocol:'GT06', gps_status:'offline' })
  const [saving, setSaving] = useState(false)
  const col = s => s==='online'?C.green:s==='offline'?C.faint:C.amber
  const save = async()=>{
    if(!form.imei||form.imei.length!==15){alert('IMEI must be 15 digits');return}; setSaving(true)
    try{ const r=await api.devices.create({...form,last_connection:'',last_update:''}); setDevices(p=>[...p,r]); setOpen(false); setForm({imei:'',model:'GPS',sim_number:'',vehicle:'',protocol:'GT06',gps_status:'offline'}) }catch(e){alert(e.message)}finally{setSaving(false)}
  }
  const handleSIM=raw=>{ const d=raw.replace(/\D/g,'').slice(0,9); let fmt=d; if(d.length>6)fmt=d.slice(0,3)+'-'+d.slice(3,6)+'-'+d.slice(6); else if(d.length>3)fmt=d.slice(0,3)+'-'+d.slice(3); setForm(f=>({...f,sim_number:fmt})) }
  return (
    <Screen>
      <Bar title={t('nav.devices')} onBack={onBack} loading={loading} action={<IconBtn icon={Plus} color="white" bg={C.blue} onClick={()=>setOpen(true)}/>}/>
      <div style={{ padding:'12px 14px' }}>
        {loading && devices.length===0 ? <ListSkel n={3}/> : (
          <>
            {devices.map(d=>(
              <Card key={d.device_id} style={{ marginBottom:10, padding:'14px' }}>
                <Row style={{ marginBottom:12 }}>
                  <IconBox icon={Cpu} color={C.blue} bg={C.blueL}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.navy, fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.model||'GPS Device'}</div>
                    <div style={{ color:C.muted, fontSize:11, fontFamily:'monospace' }}>{d.imei}</div>
                  </div>
                  <Pill label={d.gps_status} color={col(d.gps_status)} bg={col(d.gps_status)+'18'}/>
                </Row>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                  {[['SIM',d.sim_number||'—',Phone],['Vehicle',d.vehicle||'Unassigned',Car],['Protocol',d.protocol||'—',Wifi]].map(([l,v,Icon])=>(
                    <div key={l} style={{ background:C.bg, borderRadius:9, padding:'9px 6px', textAlign:'center' }}>
                      <Icon size={13} color={C.blue} style={{ margin:'0 auto 4px' }}/>
                      <div style={{ color:C.navy, fontWeight:600, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                      <div style={{ color:C.faint, fontSize:9 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {!loading && devices.length===0 && (
              <div style={{ textAlign:'center', padding:48 }}>
                <Cpu size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
                <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>No GPS Devices</div>
                <div style={{ color:C.faint, fontSize:13 }}>Tap + to add your GPS device</div>
              </div>
            )}
          </>
        )}
      </div>
      {open && (
        <Sheet title="Add GPS Device" onClose={()=>setOpen(false)}>
          <Field label="IMEI *" hint="15 digits from device label">
            <TInput value={form.imei} onChange={v=>setForm(f=>({...f,imei:v.replace(/\D/g,'').slice(0,15)}))} placeholder="e.g. 865784056472668" mono/>
            {form.imei.length>0 && (
              <div style={{ marginTop:6, fontSize:13, fontWeight:600, color:form.imei.length===15?C.green:C.red }}>
                {form.imei.length===15?'✓ Valid IMEI':form.imei.length+' / 15 digits'}
              </div>
            )}
          </Field>
          <Field label="Device Model"><TInput value={form.model} onChange={v=>setForm(f=>({...f,model:v}))} placeholder="e.g. GPS, GT06 Tracker"/></Field>
          <Field label="SIM Number"><TInput value={form.sim_number} onChange={handleSIM} placeholder="e.g. 070-758-528" type="tel"/></Field>
          <Field label="Assigned Vehicle"><TInput value={form.vehicle} onChange={v=>setForm(f=>({...f,vehicle:v}))} placeholder="e.g. Ford, Toyota Camry"/></Field>
          <Field label="Protocol">
            <TSelect value={form.protocol} onChange={v=>setForm(f=>({...f,protocol:v}))}>
              {['GT06','TK103','H02','GT02','Other'].map(p=><option key={p} value={p}>{p}</option>)}
            </TSelect>
          </Field>
          <div style={{ background:C.blueL, borderRadius:12, padding:'14px', marginBottom:20, border:'1px solid '+C.border }}>
            <div style={{ color:C.blue, fontWeight:700, fontSize:13, marginBottom:6 }}>📡 After adding — send SMS:</div>
            {['APN#metfone#','803#203.189.137.58#5023#','805#10#'].map(cmd=>(
              <div key={cmd} style={{ background:'white', borderRadius:8, padding:'8px 12px', marginBottom:6, fontFamily:'monospace', fontSize:13, color:C.navy }}>{cmd}</div>
            ))}
            <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Send each SMS to your GPS device SIM</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <GhostBtn label="Cancel" onClick={()=>setOpen(false)}/>
            <PrimaryBtn label={saving?'Saving...':'Add Device'} onClick={save} disabled={saving||form.imei.length!==15}/>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   USERS
════════════════════════════════════════════════════════════ */
function UsersScreen({ onBack }) {
  const { data:users, setData:setUsers, loading } = useApi(api.clients.list)
  const [search,   setSearch]   = useState('')
  const [open,     setOpen]     = useState(false)
  const [form,     setForm]     = useState({ username:'', email:'', password:'', role:'staff' })
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const filtered = users.filter(u=>!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.username?.includes(search))
  const ALL_P = ['dashboard','live','vehicles','history','alerts','geofences','reports','devices','users','settings','maintenance','fuel']
  const save = async()=>{
    if(!form.username||!form.email||!form.password)return; setSaving(true)
    try{ const r=await api.clients.create({...form,name:form.username.replace(/\b\w/g,c=>c.toUpperCase()),status:'active',permissions:form.role==='admin'?ALL_P:[]}); setUsers(p=>[...p,r]); setOpen(false); setForm({username:'',email:'',password:'',role:'staff'}) }catch(e){alert(e.message)}finally{setSaving(false)}
  }
  const del = async id=>{ if(!window.confirm('Delete user?'))return; try{await api.clients.delete(id);setUsers(p=>p.filter(u=>u.client_id!==id))}catch(e){alert(e.message)} }
  return (
    <Screen>
      <Bar title={t('nav.users')} onBack={onBack} loading={loading} action={<IconBtn icon={Plus} color="white" bg={C.blue} onClick={()=>setOpen(true)}/>}/>
      <div style={{ padding:'12px 14px 6px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search users..."/></div>
      <div style={{ padding:'6px 14px' }}>
        {loading && users.length===0 ? <ListSkel n={4}/> : (
          <>
            {filtered.map(u=>(
              <Card key={u.client_id} style={{ marginBottom:10, padding:'14px' }}>
                <Row>
                  <div style={{ width:44, height:44, borderRadius:12, background:u.role==='admin'?C.navy:C.blueL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {u.role==='admin'?<Shield size={20} color="white"/>:<User size={20} color={C.blue}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.navy, fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name||u.username}</div>
                    <div style={{ color:C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{u.username} · {u.email}</div>
                    <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                      <Pill label={u.name||u.role} color={u.role==='admin'?'white':C.blue} bg={u.role==='admin'?C.navy:C.blueL}/>
                      <Pill label={u.status} color={u.status==='active'?C.green:C.red} bg={u.status==='active'?C.greenL:C.redL}/>
                    </div>
                  </div>
                  <IconBtn icon={Trash2} color={C.red} bg={C.redL} onClick={()=>del(u.client_id)}/>
                </Row>
              </Card>
            ))}
            {!loading && filtered.length===0 && (
              <div style={{ textAlign:'center', padding:48 }}>
                <User size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
                <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>No Users</div>
                <div style={{ color:C.faint, fontSize:13 }}>Tap + to add a user</div>
              </div>
            )}
          </>
        )}
      </div>
      {open && (
        <Sheet title="Add User" onClose={()=>setOpen(false)}>
          <Field label="Username *"><TInput value={form.username} onChange={v=>setForm(f=>({...f,username:v}))} placeholder="e.g. dara_sok"/></Field>
          <Field label="Email *"><TInput value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="dara@kvh.com" type="email"/></Field>
          <Field label="Password *">
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Set password"
                style={{ width:'100%', padding:'13px 48px 13px 14px', border:'1px solid '+C.border, borderRadius:10, fontSize:15, color:C.navy, outline:'none', boxSizing:'border-box' }}/>
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex' }}>
                {showPass?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </div>
          </Field>
          <Field label="Role">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['admin','Admin','Full access'],['staff','Staff','Limited access']].map(([r,l,d])=>(
                <button key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{ padding:'14px 12px', border:'2px solid '+(form.role===r?C.blue:C.border), borderRadius:12, background:form.role===r?C.blueL:'white', cursor:'pointer', textAlign:'center' }}>
                  <div style={{ color:form.role===r?C.blue:C.navy, fontWeight:700, fontSize:15, marginBottom:3 }}>{l}</div>
                  <div style={{ color:C.faint, fontSize:12 }}>{d}</div>
                </button>
              ))}
            </div>
          </Field>
          <div style={{ background:C.blueL, borderRadius:12, padding:'12px 14px', marginBottom:20, border:'1px solid '+C.border }}>
            <div style={{ color:C.blue, fontWeight:700, fontSize:13, marginBottom:3 }}>ℹ️ About Roles</div>
            <div style={{ color:C.muted, fontSize:13 }}><b>Admin</b> — full access.<br/><b>Staff</b> — limited, set from desktop.</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <GhostBtn label="Cancel" onClick={()=>setOpen(false)}/>
            <PrimaryBtn label={saving?'Saving...':'Add User'} onClick={save} disabled={saving||!form.username||!form.email||!form.password}/>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   REPORTS
════════════════════════════════════════════════════════════ */
function ReportsScreen({ onBack }) {
  const { data:vehicles, loading:vL } = useApi(api.vehicles.list)
  const { data:alerts,   loading:aL } = useApi(api.alerts.list)
  const loading = vL||aL
  const s = { moving:vehicles.filter(v=>v.status==='moving').length, stopped:vehicles.filter(v=>v.status==='stopped').length, offline:vehicles.filter(v=>v.status==='offline').length, unread:alerts.filter(a=>a.status==='unread').length, overspeed:alerts.filter(a=>a.type==='Overspeed').length, geofence:alerts.filter(a=>a.type==='Geofence').length }
  return (
    <Screen>
      <Bar title={t('nav.reports')} onBack={onBack} loading={loading}/>
      <div style={{ padding:'12px 14px' }}>
        {loading ? (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {[0,1,2,3].map(i=><div key={i} style={{ background:C.card, borderRadius:14, padding:'14px', border:'1px solid '+C.border }}><Skel h={34} r={9} style={{ marginBottom:10 }}/><Skel h={28} r={6}/></div>)}
            </div>
            <ListSkel n={2}/>
          </>
        ) : (
          <>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:12 }}>Fleet Overview</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {[['Total',vehicles.length,Car,C.blue],['Moving',s.moving,Activity,C.green],['Stopped',s.stopped,Clock,C.amber],['Offline',s.offline,WifiOff,C.faint]].map(([l,v,Icon,col])=>(
                <Card key={l} style={{ padding:'14px' }}>
                  <Row style={{ marginBottom:8 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:col+'18', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={17} color={col}/></div>
                    <div style={{ color:C.faint, fontSize:12 }}>{l}</div>
                  </Row>
                  <div style={{ color:C.navy, fontWeight:800, fontSize:26 }}>{v}</div>
                </Card>
              ))}
            </div>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:12 }}>Alert Summary</div>
            <Card style={{ marginBottom:18 }}>
              {[['Total Alerts',alerts.length,C.red],['Overspeed',s.overspeed,C.red],['Geofence',s.geofence,C.amber],['Unread',s.unread,C.blue]].map(([l,v,col],i,arr)=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', borderBottom:i<arr.length-1?'1px solid '+C.border:'none' }}>
                  <Row style={{ gap:10 }}><div style={{ width:8, height:8, borderRadius:'50%', background:col }}/><span style={{ color:C.navy, fontSize:14 }}>{l}</span></Row>
                  <span style={{ color:col, fontWeight:800, fontSize:18 }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:12 }}>Vehicle Status</div>
            <Card style={{ padding:'14px' }}>
              {[['Moving',s.moving,C.green],['Stopped',s.stopped,C.amber],['Offline',s.offline,C.faint]].map(([l,v,col])=>(
                <div key={l} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ color:C.navy, fontSize:13 }}>{l}</span>
                    <span style={{ color:col, fontWeight:700, fontSize:13 }}>{v} / {vehicles.length}</span>
                  </div>
                  <div style={{ height:8, background:C.bg, borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:vehicles.length>0?(v/vehicles.length*100)+'%':'0%', background:col, borderRadius:4, transition:'width .5s' }}/>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   HISTORY PLAYBACK
════════════════════════════════════════════════════════════ */
const MOCK = { '865784056472668': { '2026-09-10': [
  {lat:11.5564,lng:104.9282,time:'07:30',speed:0},{lat:11.5580,lng:104.9300,time:'07:35',speed:45},
  {lat:11.5610,lng:104.9330,time:'07:40',speed:62},{lat:11.5640,lng:104.9360,time:'07:45',speed:55},
  {lat:11.5660,lng:104.9400,time:'07:50',speed:70},{lat:11.5700,lng:104.9440,time:'08:00',speed:0},
]}}

function HistoryScreen({ onBack }) {
  const { data:vehicles, loading:vL } = useApi(api.vehicles.list)
  const [imei,    setImei]    = useState('')
  const [date,    setDate]    = useState('2026-09-10')
  const [route,   setRoute]   = useState([])
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready,   setReady]   = useState(false)
  const mapEl=useRef(null); const gmap=useRef(null); const marker=useRef(null); const poly=useRef(null); const endpoints=useRef([]); const timer=useRef(null)
  const dotIcon=(label,color)=>L.divIcon({
    className:'kvh-hist-dot',
    html:`<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;">${label}</div>`,
    iconSize:[24,24], iconAnchor:[12,12],
  })
  const playIcon=L.divIcon({
    className:'kvh-hist-marker',
    html:`<div style="width:22px;height:22px;"><svg width="22" height="22" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))"><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="${C.blue}" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg></div>`,
    iconSize:[22,22], iconAnchor:[11,11],
  })
  const initMap=()=>{
    if(!mapEl.current||gmap.current)return
    const map=L.map(mapEl.current,{center:[11.5564,104.9282],zoom:13,zoomControl:true})
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    gmap.current=map
    setReady(true)
  }
  useEffect(()=>{initMap()},[])
  const draw=pts=>{
    if(!gmap.current||!pts.length)return
    if(poly.current)gmap.current.removeLayer(poly.current)
    if(marker.current)gmap.current.removeLayer(marker.current)
    endpoints.current.forEach(m=>gmap.current.removeLayer(m)); endpoints.current=[]
    const latlngs=pts.map(p=>[p.lat,p.lng])
    poly.current=L.polyline(latlngs,{color:C.blue,opacity:.8,weight:4}).addTo(gmap.current)
    const a=L.marker(latlngs[0],{icon:dotIcon('A',C.green)}).addTo(gmap.current)
    const b=L.marker(latlngs[latlngs.length-1],{icon:dotIcon('B',C.red)}).addTo(gmap.current)
    endpoints.current=[a,b]
    marker.current=L.marker(latlngs[0],{icon:playIcon}).addTo(gmap.current)
    gmap.current.fitBounds(L.latLngBounds(latlngs),{paddingTopLeft:[30,50],paddingBottomRight:[30,120]})
    setIdx(0)
  }
  const load=()=>{ const r=MOCK[imei]?.[date]||[]; setRoute(r); setIdx(0); setPlaying(false); if(r.length&&ready)draw(r) }
  useEffect(()=>{ clearInterval(timer.current); if(!playing||!route.length)return; timer.current=setInterval(()=>{ setIdx(p=>{ const n=p+1; if(n>=route.length){setPlaying(false);clearInterval(timer.current);return p}; if(marker.current)marker.current.setLatLng([route[n].lat,route[n].lng]); return n }) },600); return()=>clearInterval(timer.current) },[playing,route])
  const go=n=>{ const i=Math.max(0,Math.min(route.length-1,n)); setIdx(i); if(marker.current&&route[i])marker.current.setLatLng([route[i].lat,route[i].lng]) }
  const cur=route[idx]; const pct=route.length>1?(idx/(route.length-1)*100):0
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Bar title={t('nav.history')} onBack={onBack} loading={vL}/>
      <div style={{ background:C.card, padding:'10px 14px', borderBottom:'1px solid '+C.border, flexShrink:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
          <select value={imei} onChange={e=>setImei(e.target.value)} style={{ padding:'10px', border:'1px solid '+C.border, borderRadius:10, fontSize:13, color:C.navy, outline:'none', background:'white' }}>
            <option value="">Select vehicle...</option>
            {vehicles.map(v=><option key={v.imei} value={v.imei}>{v.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:'10px', border:'1px solid '+C.border, borderRadius:10, fontSize:13, color:C.navy, outline:'none' }}/>
        </div>
        <button onClick={load} style={{ width:'100%', padding:'11px', background:C.blue, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>Load Route</button>
      </div>
      <div style={{ flex:1, position:'relative', minHeight:0 }}>
        <div ref={mapEl} style={{ width:'100%', height:'100%' }}/>
        {route.length===0 && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, background:'rgba(240,247,255,.94)', pointerEvents:'none' }}>
            <MapPin size={38} color={C.faint}/><div style={{ color:C.muted, fontSize:14 }}>Select vehicle and date, then tap Load</div>
          </div>
        )}
        {cur&&route.length>0 && (
          <div style={{ position:'absolute', top:12, left:12, background:'white', borderRadius:12, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.12)', border:'1px solid '+C.border }}>
            <div style={{ color:C.faint, fontSize:10, marginBottom:4 }}>Current Point</div>
            <div style={{ display:'flex', gap:16 }}>
              <div><div style={{ color:C.faint, fontSize:10 }}>Time</div><div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>{cur.time}</div></div>
              <div><div style={{ color:C.faint, fontSize:10 }}>Speed</div><div style={{ color:cur.speed>60?C.red:cur.speed===0?C.muted:C.green, fontWeight:700, fontSize:14 }}>{cur.speed} km/h</div></div>
            </div>
          </div>
        )}
      </div>
      {route.length>0 && (
        <div style={{ background:'white', borderTop:'1px solid '+C.border, padding:'10px 14px', paddingBottom:'max(10px,env(safe-area-inset-bottom))', flexShrink:0 }}>
          <div style={{ background:C.bg, borderRadius:4, height:6, marginBottom:6, cursor:'pointer', position:'relative' }} onClick={e=>{ const r=e.currentTarget.getBoundingClientRect(); go(Math.round((e.clientX-r.left)/r.width*(route.length-1))) }}>
            <div style={{ position:'absolute', top:0, left:0, bottom:0, width:pct+'%', background:C.blue, borderRadius:4 }}/>
            <div style={{ position:'absolute', top:'50%', left:pct+'%', transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'white', border:'2px solid '+C.blue }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.faint, marginBottom:10 }}>
            <span>{route[0]?.time}</span><span>{idx+1}/{route.length}</span><span>{route[route.length-1]?.time}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
            <IconBtn icon={SkipBack}    onClick={()=>go(0)}/>
            <IconBtn icon={ChevronLeft} onClick={()=>go(idx-1)}/>
            <button onClick={()=>setPlaying(p=>!p)} style={{ width:54, height:40, background:playing?C.red:C.blue, border:'none', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              {playing?<Pause size={20} color="white"/>:<Play size={20} color="white"/>}
            </button>
            <IconBtn icon={ChevronRight} onClick={()=>go(idx+1)}/>
            <IconBtn icon={SkipForward}  onClick={()=>go(route.length-1)}/>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   GEOFENCES
════════════════════════════════════════════════════════════ */
function GeofencesScreen({ onBack }) {
  const { data:geo, loading } = useApi(api.geofences.list)
  return (
    <Screen>
      <Bar title={t('nav.geofences')} onBack={onBack} loading={loading}/>
      <div style={{ padding:'12px 14px' }}>
        {loading && geo.length===0 ? <ListSkel n={3}/> : (
          <>
            {geo.map(g=>(
              <Card key={g.geofence_id} style={{ marginBottom:10, padding:'14px' }}>
                <Row>
                  <IconBox icon={Hexagon} color={C.blue} bg={C.blueL}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.navy, fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</div>
                    <div style={{ color:C.muted, fontSize:12 }}>{g.type} · {g.radius}m radius</div>
                  </div>
                  <Pill label={g.enabled?'Active':'Off'} color={g.enabled?C.green:C.red} bg={g.enabled?C.greenL:C.redL}/>
                </Row>
              </Card>
            ))}
            {!loading && geo.length===0 && (
              <div style={{ textAlign:'center', padding:48 }}>
                <Hexagon size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
                <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>No Geofences</div>
                <div style={{ color:C.faint, fontSize:13 }}>Add geofences from the desktop app.</div>
              </div>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════════════════ */
function SettingsScreen({ onBack, user, lang, onToggleLanguage }) {
  const isKhmer = lang === 'km'
  return (
    <Screen>
      <Bar title={t('nav.settings')} onBack={onBack}/>
      <div style={{ padding:'12px 14px' }}>

        {/* Language */}
        <div style={{ marginBottom:18 }}>
          <div style={{ color:C.faint, fontSize:11, fontWeight:700, marginBottom:8, paddingLeft:4, letterSpacing:.5 }}>{t('mobile.language').toUpperCase()}</div>
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px' }}>
              <span style={{ color:C.muted, fontSize:14 }}>{t('mobile.language')}</span>
              <button onClick={onToggleLanguage} style={{ display:'flex', alignItems:'center', gap:6, background:C.bg, border:'1px solid '+C.border, borderRadius:20, padding:'6px 12px', cursor:'pointer', color:C.navy, fontSize:13, fontWeight:600 }}>
                <Languages size={14}/>
                {isKhmer ? t('mobile.khmer') : t('mobile.english')}
              </button>
            </div>
          </Card>
        </div>

        {[
          { title:t('mobile.account'), rows:[['Username','@'+(user?.username||'—')],['Email',user?.email||'—'],['Position',user?.name||'—'],['Role',user?.role||'—']] },
          { title:t('mobile.system'),  rows:[['Version','1.0.0'],['Django Port','8000'],['TCP Port','5023']] },
        ].map(g=>(
          <div key={g.title} style={{ marginBottom:18 }}>
            <div style={{ color:C.faint, fontSize:11, fontWeight:700, marginBottom:8, paddingLeft:4, letterSpacing:.5 }}>{g.title.toUpperCase()}</div>
            <Card>
              {g.rows.map(([l,v],i,arr)=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', borderBottom:i<arr.length-1?'1px solid '+C.border:'none' }}>
                  <span style={{ color:C.muted, fontSize:14 }}>{l}</span>
                  <span style={{ color:C.navy, fontWeight:600, fontSize:14 }}>{v}</span>
                </div>
              ))}
            </Card>
          </div>
        ))}
        <div style={{ background:C.blueL, borderRadius:14, padding:18, border:'1px solid '+C.border, textAlign:'center' }}>
          <img src="/kvh-logo.png" alt="" style={{ height:36, marginBottom:10 }}/>
          <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:3 }}>KVH GPS Fleet Management</div>
          <div style={{ color:C.muted, fontSize:12 }}>Kong Veng Heng Co., Ltd.</div>
          <div style={{ color:C.faint, fontSize:11, marginTop:4 }}>© 2026 All rights reserved.</div>
        </div>
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   MAINTENANCE
════════════════════════════════════════════════════════════ */
const SERVICE_TYPES_MOB = [
  'Oil Change','Tire Rotation','Tire Replacement','Brake Service',
  'Air Filter','Spark Plugs','Battery','Transmission',
  'Cooling System','AC Service','Inspection','Other',
]
const MSTATUS = {
  completed: { label:'Done',    color:C.green, bg:C.greenL },
  scheduled: { label:'Sched.',  color:C.blue,  bg:C.blueL  },
  overdue:   { label:'Overdue', color:C.red,   bg:C.redL   },
}

function MaintenanceScreen({ onBack }) {
  const { data:logs,     setData:setLogs,  loading } = useApi(api.maintenance.list)
  const { data:vehicles                            } = useApi(api.vehicles.list)
  const [tab,    setTab]    = useState('all')
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState({ vehicle_id:'', vehicle_name:'', service_type:'Oil Change', date:'', odometer:'', cost:'', technician:'', next_date:'', status:'completed' })
  const [saving, setSaving] = useState(false)
  const fld = (k,v) => setForm(f=>({...f,[k]:v}))

  const filtered = logs.filter(l=>tab==='all'||l.status===tab)
  const overdue   = logs.filter(l=>l.status==='overdue').length
  const scheduled = logs.filter(l=>l.status==='scheduled').length

  const save = async()=>{
    if(!form.vehicle_id||!form.date){alert('Vehicle and date required');return}
    setSaving(true)
    try{
      const vName=vehicles.find(v=>String(v.vehicle_id)===form.vehicle_id)?.name||''
      const r=await api.maintenance.create({...form,vehicle_name:vName,odometer:Number(form.odometer)||0,cost:Number(form.cost)||0,next_date:form.next_date||null,next_odometer:null})
      setLogs(p=>[r,...p])
      setOpen(false)
      setForm({vehicle_id:'',vehicle_name:'',service_type:'Oil Change',date:'',odometer:'',cost:'',technician:'',next_date:'',status:'completed'})
    }catch(e){alert(e.message)}finally{setSaving(false)}
  }

  const del = async id=>{ if(!window.confirm('Delete?'))return; try{await api.maintenance.delete(id);setLogs(p=>p.filter(l=>l.log_id!==id))}catch(e){alert(e.message)} }

  return (
    <Screen>
      <Bar title={t('nav.maintenance')} onBack={onBack} loading={loading}
        action={<IconBtn icon={Plus} color="white" bg={C.blue} onClick={()=>setOpen(true)}/>}
      />

      {/* Summary row */}
      <div style={{ padding:'12px 14px 6px' }}>
        <div style={{ display:'flex', gap:8 }}>
          {[
            [logs.length+' Total', C.blue,  C.blueL ],
            [overdue+' Overdue',   C.red,   C.redL  ],
            [scheduled+' Sched.',  C.amber, C.amberL],
          ].map(([l,c,bg])=>(
            <div key={l} style={{ flex:1, background:bg, borderRadius:12, padding:'10px 6px', textAlign:'center', border:`1px solid ${c}22` }}>
              <div style={{ color:c, fontWeight:800, fontSize:15 }}>{l.split(' ')[0]}</div>
              <div style={{ color:c, fontSize:10, opacity:.8 }}>{l.split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'6px 14px', display:'flex', gap:6, overflowX:'auto' }}>
        {[['all','All'],['completed','Done'],['scheduled','Sched.'],['overdue','Overdue']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'5px 13px', borderRadius:20, border:tab===id?'none':'1px solid '+C.border, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:tab===id?C.navy:C.card, color:tab===id?'white':C.muted, flexShrink:0 }}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding:'6px 14px' }}>
        {loading && <ListSkel n={4}/>}
        {!loading && filtered.map(l=>{
          const s=MSTATUS[l.status]||MSTATUS.completed
          return (
            <Card key={l.log_id} style={{ marginBottom:10, padding:'14px' }}>
              <Row style={{ marginBottom:l.next_date?8:0 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Wrench size={20} color={s.color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.vehicle_name}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>{l.service_type} · {l.date}</div>
                  {Number(l.cost)>0 && <div style={{ color:C.green, fontSize:12, fontWeight:600, marginTop:2 }}>${Number(l.cost).toFixed(2)}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <Pill label={s.label} color={s.color} bg={s.bg}/>
                  <IconBtn icon={Trash2} color={C.red} bg={C.redL} onClick={()=>del(l.log_id)} size={15}/>
                </div>
              </Row>
              {l.next_date && (
                <div style={{ marginTop:8, padding:'7px 10px', background:C.blueL, borderRadius:8, display:'flex', alignItems:'center', gap:7 }}>
                  <Clock size={12} color={C.blue}/>
                  <span style={{ color:C.blue, fontSize:12, fontWeight:600 }}>Next: {l.next_date}</span>
                </div>
              )}
            </Card>
          )
        })}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:48 }}>
            <Wrench size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
            <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>No Records</div>
            <div style={{ color:C.faint, fontSize:13 }}>Tap + to log a service</div>
          </div>
        )}
      </div>

      {open && (
        <Sheet title="Log Service" onClose={()=>setOpen(false)}>
          <Field label="Vehicle *">
            <TSelect value={form.vehicle_id} onChange={v=>{ const veh=vehicles.find(x=>String(x.vehicle_id)===v); fld('vehicle_id',v); if(veh)fld('vehicle_name',veh.name) }}>
              <option value="">Select vehicle…</option>
              {vehicles.map(v=><option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name} — {v.plate}</option>)}
            </TSelect>
          </Field>
          <Field label="Service Type">
            <TSelect value={form.service_type} onChange={v=>fld('service_type',v)}>
              {SERVICE_TYPES_MOB.map(t=><option key={t}>{t}</option>)}
            </TSelect>
          </Field>
          <Field label="Date *"><TInput value={form.date} onChange={v=>fld('date',v)} type="date"/></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>Odometer (km)</label>
              <TInput value={form.odometer} onChange={v=>fld('odometer',v)} placeholder="45000" type="number"/>
            </div>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>Cost ($)</label>
              <TInput value={form.cost} onChange={v=>fld('cost',v)} placeholder="35.00" type="number"/>
            </div>
          </div>
          <Field label="Technician"><TInput value={form.technician} onChange={v=>fld('technician',v)} placeholder="e.g. Dara Mechanics"/></Field>
          <Field label="Next Service Date"><TInput value={form.next_date} onChange={v=>fld('next_date',v)} type="date"/></Field>
          <Field label="Status">
            <TSelect value={form.status} onChange={v=>fld('status',v)}>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
            </TSelect>
          </Field>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <GhostBtn label="Cancel" onClick={()=>setOpen(false)}/>
            <PrimaryBtn label={saving?'Saving...':'Log Service'} onClick={save} disabled={saving||!form.vehicle_id||!form.date}/>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   FUEL TRACKING
════════════════════════════════════════════════════════════ */
function FuelScreen({ onBack }) {
  const { data:logs,     setData:setLogs,  loading } = useApi(api.fuel.list)
  const { data:vehicles                            } = useApi(api.vehicles.list)
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState({ vehicle_id:'', vehicle_name:'', date:'', liters:'', cost_per_liter:'', total_cost:'', odometer:'', fuel_type:'Gasoline', station:'', full_tank:true })
  const [saving, setSaving] = useState(false)
  const fld = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleLiters = v => {
    fld('liters',v)
    if(Number(v)&&Number(form.cost_per_liter)) fld('total_cost',(Number(v)*Number(form.cost_per_liter)).toFixed(2))
  }
  const handleCPL = v => {
    fld('cost_per_liter',v)
    if(Number(form.liters)&&Number(v)) fld('total_cost',(Number(form.liters)*Number(v)).toFixed(2))
  }

  const totalL    = logs.reduce((s,l)=>s+Number(l.liters||0),0)
  const totalCost = logs.reduce((s,l)=>s+Number(l.total_cost||0),0)
  const withDist  = logs.filter(l=>l.distance_since_last>0)
  const avgC      = withDist.length ? withDist.reduce((s,l)=>s+(Number(l.liters)/l.distance_since_last*100),0)/withDist.length : 0

  const save = async()=>{
    if(!form.vehicle_id||!form.date||!form.liters){alert('Vehicle, date and liters required');return}
    setSaving(true)
    try{
      const vName=vehicles.find(v=>String(v.vehicle_id)===form.vehicle_id)?.name||''
      const r=await api.fuel.create({...form,vehicle_name:vName,liters:Number(form.liters),cost_per_liter:Number(form.cost_per_liter)||0,total_cost:Number(form.total_cost)||0,odometer:Number(form.odometer)||0})
      setLogs(p=>[r,...p])
      setOpen(false)
      setForm({vehicle_id:'',vehicle_name:'',date:'',liters:'',cost_per_liter:'',total_cost:'',odometer:'',fuel_type:'Gasoline',station:'',full_tank:true})
    }catch(e){alert(e.message)}finally{setSaving(false)}
  }

  const del = async id=>{ if(!window.confirm('Delete?'))return; try{await api.fuel.delete(id);setLogs(p=>p.filter(l=>l.log_id!==id))}catch(e){alert(e.message)} }

  return (
    <Screen>
      <Bar title={t('nav.fuel')} onBack={onBack} loading={loading}
        action={<IconBtn icon={Plus} color="white" bg={C.green} onClick={()=>setOpen(true)}/>}
      />

      {/* Stats */}
      <div style={{ padding:'12px 14px 6px' }}>
        <div style={{ display:'flex', gap:8 }}>
          {[
            [`${totalL.toFixed(1)} L`,    'Total Fuel', '#3B82F6','#EFF6FF'],
            [`$${totalCost.toFixed(2)}`,  'Total Cost', C.green,  C.greenL],
            [`${avgC.toFixed(1)} L/100`,  'Avg Consump',C.amber,  C.amberL],
          ].map(([v,l,c,bg])=>(
            <div key={l} style={{ flex:1, background:bg, borderRadius:12, padding:'10px 6px', textAlign:'center', border:`1px solid ${c}22` }}>
              <div style={{ color:c, fontWeight:800, fontSize:13 }}>{v}</div>
              <div style={{ color:c, fontSize:9, opacity:.8, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding:'8px 14px' }}>
        {loading && <ListSkel n={4}/>}
        {!loading && logs.map(l=>{
          const consump = l.distance_since_last>0 ? (Number(l.liters)/l.distance_since_last*100).toFixed(1) : null
          const cColor  = consump ? (Number(consump)>12?C.red:Number(consump)<8?C.green:C.amber) : C.faint
          return (
            <Card key={l.log_id} style={{ marginBottom:10, padding:'14px' }}>
              <Row style={{ marginBottom:10 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:C.greenL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Droplets size={20} color={C.green}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.vehicle_name}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>{l.date} · {l.fuel_type}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ color:C.green, fontWeight:800, fontSize:14 }}>${Number(l.total_cost).toFixed(2)}</span>
                  <IconBtn icon={Trash2} color={C.red} bg={C.redL} onClick={()=>del(l.log_id)} size={15}/>
                </div>
              </Row>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[
                  [`${Number(l.liters).toFixed(2)} L`, 'Volume',     '#3B82F6'],
                  [l.station||'—',                      'Station',   C.muted  ],
                  [consump?`${consump} L/100`:'—',       'Efficiency',cColor   ],
                ].map(([v,lab,c])=>(
                  <div key={lab} style={{ background:C.bg, borderRadius:8, padding:'7px 5px', textAlign:'center' }}>
                    <div style={{ color:c, fontWeight:700, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                    <div style={{ color:C.faint, fontSize:9, marginTop:2 }}>{lab}</div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
        {!loading && logs.length===0 && (
          <div style={{ textAlign:'center', padding:48 }}>
            <Droplets size={38} color={C.faint} style={{ margin:'0 auto 12px' }}/>
            <div style={{ color:C.navy, fontWeight:600, fontSize:16, marginBottom:6 }}>No Fuel Records</div>
            <div style={{ color:C.faint, fontSize:13 }}>Tap + to log your first fill-up</div>
          </div>
        )}
      </div>

      {open && (
        <Sheet title="Log Fuel Fill-up" onClose={()=>setOpen(false)}>
          <Field label="Vehicle *">
            <TSelect value={form.vehicle_id} onChange={v=>{ const veh=vehicles.find(x=>String(x.vehicle_id)===v); fld('vehicle_id',v); if(veh)fld('vehicle_name',veh.name) }}>
              <option value="">Select vehicle…</option>
              {vehicles.map(v=><option key={v.vehicle_id} value={String(v.vehicle_id)}>{v.name} — {v.plate}</option>)}
            </TSelect>
          </Field>
          <Field label="Date *"><TInput value={form.date} onChange={v=>fld('date',v)} type="date"/></Field>

          <div style={{ background:'#F0FDF4', borderRadius:12, padding:'14px', marginBottom:16, border:'1px solid #A7F3D0' }}>
            <div style={{ color:C.green, fontWeight:700, fontSize:13, marginBottom:12 }}>⛽ Fuel Details</div>
            <Field label="Liters *"><TInput value={form.liters} onChange={handleLiters} placeholder="45.5" type="number"/></Field>
            <Field label="Cost per Liter ($)"><TInput value={form.cost_per_liter} onChange={handleCPL} placeholder="1.050" type="number"/></Field>
            <div style={{ marginBottom:0 }}>
              <label style={{ display:'block', color:C.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>Total Cost ($) — auto-calc</label>
              <input value={form.total_cost} onChange={e=>fld('total_cost',e.target.value)} placeholder="auto" type="number"
                style={{ width:'100%', padding:'13px 14px', border:`1px solid ${C.green}`, borderRadius:10, fontSize:15, fontWeight:700, color:C.green, outline:'none', boxSizing:'border-box', background:'white' }}/>
            </div>
          </div>

          <Field label="Odometer (km)"><TInput value={form.odometer} onChange={v=>fld('odometer',v)} placeholder="45000" type="number"/></Field>
          <Field label="Fuel Type">
            <TSelect value={form.fuel_type} onChange={v=>fld('fuel_type',v)}>
              {['Gasoline','Diesel','Electric'].map(t=><option key={t}>{t}</option>)}
            </TSelect>
          </Field>
          <Field label="Gas Station"><TInput value={form.station} onChange={v=>fld('station',v)} placeholder="PTT, Caltex, Total…"/></Field>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14, color:C.navy, marginBottom:20 }}>
            <input type="checkbox" checked={form.full_tank} onChange={e=>fld('full_tank',e.target.checked)} style={{ width:18, height:18 }}/>
            Full tank fill-up
          </label>
          <div style={{ display:'flex', gap:10 }}>
            <GhostBtn label="Cancel" onClick={()=>setOpen(false)}/>
            <PrimaryBtn label={saving?'Saving...':'Log Fuel'} onClick={save} disabled={saving||!form.vehicle_id||!form.date||!form.liters}/>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   MORE MENU
════════════════════════════════════════════════════════════ */
function MoreScreen({ user, onLogout, onNav }) {
  const groups = [
    { title:t('mobile.fleet'),     items:[
        { l:t('nav.drivers'),     I:User,     n:'drivers'     },
        { l:t('nav.devices'),     I:Cpu,      n:'devices'     },
        { l:t('nav.geofences'),   I:Hexagon,  n:'geofences'   },
        { l:t('nav.maintenance'), I:Wrench,   n:'maintenance' },
        { l:t('nav.fuel'),        I:Droplets, n:'fuel'        },
      ]
    },
    { title:t('mobile.analytics'), items:[
        { l:t('nav.reports'), I:BarChart2, n:'reports' },
        { l:t('nav.history'), I:Activity,  n:'history' },
      ]
    },
    { title:t('mobile.system'), items:[
        { l:t('nav.users'),    I:Shield,   n:'users',    a:true },
        { l:t('nav.settings'), I:Settings, n:'settings'         },
      ]
    },
  ]
  return (
    <Screen>
      <div style={{ background:'linear-gradient(150deg,'+C.blueD+','+C.blue+')', margin:14, borderRadius:18, padding:'18px 16px', color:'white', display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
        <img src="/kvh-logo.png" alt="" style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'55%', maxWidth:200, opacity:.08, filter:'brightness(0) invert(1)', pointerEvents:'none' }}/>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
          {user?.role==='admin'?<Shield size={24} color="white"/>:<User size={24} color="white"/>}
        </div>
        <div style={{ position:'relative', minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:17, marginBottom:2, textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name||'Admin'}</div>
          <div style={{ opacity:.65, fontSize:12, marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email||user?.username}</div>
          <span style={{ background:'rgba(255,255,255,.2)', padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700 }}>{user?.role==='admin'?t('mobile.administrator'):t('mobile.staff')}</span>
        </div>
      </div>
      {groups.map(g=>{
        const items=g.items.filter(i=>!i.a||user?.role==='admin')
        if(!items.length)return null
        return (
          <div key={g.title} style={{ margin:'0 14px 14px' }}>
            <div style={{ color:C.faint, fontSize:11, fontWeight:700, marginBottom:8, paddingLeft:4, letterSpacing:.5 }}>{g.title.toUpperCase()}</div>
            <Card>
              {items.map(({l,I,n},i)=>(
                <button key={n} onClick={()=>onNav(n)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px', border:'none', background:'none', cursor:'pointer', borderBottom:i<items.length-1?'1px solid '+C.border:'none', textAlign:'left' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:C.blueL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><I size={17} color={C.blue}/></div>
                  <span style={{ flex:1, color:C.navy, fontWeight:600, fontSize:14 }}>{l}</span>
                  <ChevronRight size={17} color={C.faint}/>
                </button>
              ))}
            </Card>
          </div>
        )
      })}
      <div style={{ margin:'0 14px 14px' }}>
        <button onClick={onLogout} style={{ width:'100%', padding:'14px', background:C.redL, border:'1px solid #FECACA', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', color:C.red, fontWeight:700, fontSize:15 }}>
          <LogOut size={18}/> {t('sidebar.signOut')}
        </button>
      </div>
    </Screen>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════ */
export default function MobileApp({ user, onLogout, lang, onToggleLanguage }) {
  const { data:alerts } = useApi(api.alerts.list)
  const [page, setPage] = useState('home')
  const unread = alerts.filter(a=>a.status==='unread').length

  useEffect(()=>{
    const s=document.createElement('style')
    s.textContent='*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}::-webkit-scrollbar{display:none}body{margin:0;padding:0;overscroll-behavior:none}'+PULSE_CSS
    document.head.appendChild(s)
    return()=>document.head.removeChild(s)
  },[])

  const renderPage = () => {
    switch(page){
      case 'home':        return <HomeScreen        user={user} onNav={setPage}/>
      case 'tracking':    return <TrackingScreen/>
      case 'vehicles':    return <VehiclesScreen/>
      case 'alerts':      return <AlertsScreen/>
      case 'more':        return <MoreScreen        user={user} onLogout={onLogout} onNav={setPage}/>
      case 'drivers':     return <DriversScreen     onBack={()=>setPage('more')}/>
      case 'devices':     return <DevicesScreen     onBack={()=>setPage('more')}/>
      case 'geofences':   return <GeofencesScreen   onBack={()=>setPage('more')}/>
      case 'reports':     return <ReportsScreen     onBack={()=>setPage('more')}/>
      case 'history':     return <HistoryScreen     onBack={()=>setPage('more')}/>
      case 'users':       return <UsersScreen       onBack={()=>setPage('more')} user={user}/>
      case 'settings':    return <SettingsScreen    onBack={()=>setPage('more')} user={user} lang={lang} onToggleLanguage={onToggleLanguage}/>
      case 'maintenance': return <MaintenanceScreen onBack={()=>setPage('more')}/>
      case 'fuel':        return <FuelScreen        onBack={()=>setPage('more')}/>
      default:            return <HomeScreen        user={user} onNav={setPage}/>
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, fontFamily:"'Inter',system-ui,-apple-system,sans-serif", display:'flex', flexDirection:'column', overflow:'hidden', paddingTop:'env(safe-area-inset-top)' }}>
      {renderPage()}
      <Nav active={page} onNav={setPage} unread={unread}/>
    </div>
  )
}