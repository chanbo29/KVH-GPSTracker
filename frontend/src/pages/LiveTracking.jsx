import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Car, Navigation, Wifi, WifiOff, Battery, Gauge,
  MapPin, X, RefreshCw, Users, Search,
  ChevronLeft, ChevronRight, User, Layers,
} from 'lucide-react'
import { api } from '../api/client.js'
import { loadGoogleMaps } from '../lib/googleMapsLoader.js'

const T = {
  sidebarBg: '#FFFFFF',
  blue:      '#1B6BB5',
  blueD:     '#0F3460',
  blueL:     '#EFF6FF',
  green:     '#16A34A',
  greenL:    '#DCFCE7',
  amber:     '#D97706',
  amberL:    '#FEF3C7',
  grey:      '#94A3B8',
  greyL:     '#F1F5F9',
  red:       '#DC2626',
  navy:      '#0F172A',
  muted:     '#64748B',
  faint:     '#94A3B8',
  border:    '#E2E8F0',
  bg:        '#F8FAFC',
}

const STATUS = {
  moving:  { color:T.green, bg:T.greenL, dot:'#22C55E', label:'Moving'  },
  stopped: { color:T.amber, bg:T.amberL, dot:'#F59E0B', label:'Stopped' },
  offline: { color:T.grey,  bg:T.greyL,  dot:'#CBD5E1', label:'Offline' },
}
const st = s => STATUS[s] || STATUS.offline

// "Stopped 23m" / "Stopped 1h 12m" / "Stopped 2d 4h" — how long the vehicle
// has held its current status, from Vehicle.status_since.
function sinceLabel(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (!isFinite(ms) || ms < 0) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}

function animateMarker(marker, lat, lng, ms = 450) {
  const cur  = marker.getPosition()
  const from = { lat: cur.lat(), lng: cur.lng() }
  const t0   = performance.now()
  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t
  const step = now => {
    const p = Math.min((now-t0)/ms, 1)
    marker.setPosition({ lat: from.lat+(lat-from.lat)*ease(p), lng: from.lng+(lng-from.lng)*ease(p) })
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// Arrow-shaped marker icon, rotated to the vehicle's heading via an SVG
// `transform="rotate(...)"` attribute (works reliably even as a standalone
// data-URI image, unlike a CSS transform on the root <svg>).
function mkIcon(status, course = 0) {
  const color = st(status).color
  const size  = status === 'moving' ? 26 : 20
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <g transform="rotate(${course} 12 12)">
      <path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </g>
  </svg>`
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  }
}

// HTML content for the on-map info bubble that floats above a vehicle's pin
// at all times — driver name, status, vehicle + plate, and live
// coordinates, right where the user is looking instead of only in the
// sidebar / bottom-right card. This is the *inner* card only; VehicleLabel
// (below) wraps it in a positioned, animated container with a pointer tail
// — it deliberately does NOT use google.maps.InfoWindow, whose fixed white
// chrome and oversized default close button can't be restyled away.
function mkInfoHtml(v) {
  const s = st(v.status)
  const hasDriver = v.owner && v.owner !== 'Unassigned'
  const hasFix = v.lat && parseFloat(v.lat) !== 0
  const coords = hasFix
    ? `${Number(v.lat).toFixed(5)}, ${Number(v.lng).toFixed(5)}`
    : 'No GPS signal'
  const coordColor = hasFix ? '#1B6BB5' : '#D97706'
  // Only stopped/offline vehicles get a duration — a moving vehicle's
  // "since" timer isn't meaningful here.
  const since = v.status !== 'moving' ? sinceLabel(v.status_since) : ''
  // Just the inner rows — VehicleLabel wraps this once in a persistent
  // .kvh-bubble card on creation, and only swaps this inner HTML on later
  // updates, so the bouncy entrance animation plays once per vehicle
  // (on first fix) rather than replaying on every 5s refresh.
  return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px">
        <span style="font-weight:800;font-size:12.5px;color:#0F172A;letter-spacing:-.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${hasDriver ? v.owner : '— No driver —'}</span>
        <span style="display:flex;align-items:center;gap:4px;background:${s.bg};padding:3px 7px;border-radius:20px;flex-shrink:0">
          <span class="${v.status==='moving'?'kvh-dot-live':''}" style="width:5px;height:5px;border-radius:50%;background:${s.dot}"></span>
          <span style="font-size:8px;font-weight:700;color:${s.color};text-transform:uppercase;letter-spacing:.4px">${s.label}</span>${since ? `<span style="font-size:8px;font-weight:600;color:${s.color};opacity:.78;margin-left:3px">· ${since}</span>` : ''}
        </span>
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
          <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/>
          <rect x="3" y="11" width="18" height="6" rx="1.5"/>
          <circle cx="7.5" cy="17.5" r="1.4"/>
          <circle cx="16.5" cy="17.5" r="1.4"/>
        </svg>
        <span style="font-size:10.5px;color:#64748B;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name || ''}${v.plate ? ' · ' + v.plate : ''}</span>
      </div>

      <div style="display:flex;align-items:center;gap:6px;padding-top:6px;border-top:1px dashed #E2E8F0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${coordColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
          <path d="M12 22s7-7.5 7-12.5A7 7 0 0 0 5 9.5C5 14.5 12 22 12 22z"/>
          <circle cx="12" cy="9.5" r="2.3"/>
        </svg>
        <span style="font-size:10px;color:${coordColor};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;white-space:nowrap">${coords}</span>
      </div>
  `
}

// Custom floating label overlay — replaces google.maps.InfoWindow so we get
// full control of the look (rounded card, drop shadow, pointer tail, no
// default close button) and smooth animated repositioning as the vehicle
// moves. Built lazily since google.maps.OverlayView only exists once the
// Maps JS API has loaded.
let VehicleLabelClass = null
function getVehicleLabelClass() {
  if (VehicleLabelClass) return VehicleLabelClass
  class VehicleLabel extends window.google.maps.OverlayView {
    constructor(map, position, html) {
      super()
      this.position = position
      this.div  = null   // positioned wrapper (no visual style)
      this.card = null   // persistent .kvh-bubble element — created once,
                          // so its entrance animation plays only on first
                          // fix for this vehicle, not on every data refresh
      this.html = html
      this.setMap(map)
    }
    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.transform = 'translate(-50%, calc(-100% - 15px))'
      div.style.transition = 'left .45s cubic-bezier(.4,0,.2,1), top .45s cubic-bezier(.4,0,.2,1)'
      div.style.zIndex = '45'

      const card = document.createElement('div')
      card.className = 'kvh-bubble'
      card.innerHTML = this.html
      div.appendChild(card)

      this.div  = div
      this.card = card
      this.getPanes().floatPane.appendChild(div)
      this.draw()
    }
    draw() {
      if (!this.div) return
      const proj = this.getProjection()
      if (!proj) return
      const pt = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(this.position))
      if (!pt) return
      this.div.style.left = pt.x + 'px'
      this.div.style.top = pt.y + 'px'
    }
    update(position, html) {
      this.position = position
      if (this.card) this.card.innerHTML = html
      this.draw()
    }
    onRemove() {
      if (this.div?.parentNode) this.div.parentNode.removeChild(this.div)
      this.div = null
      this.card = null
    }
  }
  VehicleLabelClass = VehicleLabel
  return VehicleLabelClass
}

// Pulsing green ring behind a moving vehicle — a google.maps.Circle whose
// radius/opacity we animate manually (CSS keyframes don't apply to Maps'
// canvas-rendered overlays like they did to Leaflet's DOM-based markers).
function makePulse(map, lat, lng) {
  const circle = new window.google.maps.Circle({
    map, center: { lat, lng }, radius: 15,
    fillColor: '#16A34A', fillOpacity: 0.22, strokeOpacity: 0, clickable: false, zIndex: 1,
  })
  const t0 = performance.now()
  const DUR = 1800
  let raf
  const tick = now => {
    const p = ((now - t0) % DUR) / DUR
    circle.setRadius(15 + p * 55)
    circle.setOptions({ fillOpacity: 0.22 * (1 - p) })
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return {
    setCenter: (lat, lng) => circle.setCenter({ lat, lng }),
    stop: () => { cancelAnimationFrame(raf); circle.setMap(null) },
  }
}

export default function LiveTracking() {
  const [vehicles, setVehicles] = useState([])
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  const mapRef     = useRef(null)
  const gmap       = useRef(null)
  const markers    = useRef({})
  const pulses     = useRef({})
  const infoWins   = useRef({})   // one VehicleLabel overlay per vehicle, always visible
  // Remember the user's last map-type choice (satellite vs roadmap) per
  // browser, and default to satellite on first visit. Wrapped in try/catch
  // since localStorage can throw or be unavailable in some contexts.
  const [sat, setSat] = useState(() => {
    try {
      const saved = localStorage.getItem('kvh_map_sat')
      return saved === null ? true : saved === '1'
    } catch { return true }
  })
  const toggleSat = () => {
    setSat(s => {
      const next = !s
      try { localStorage.setItem('kvh_map_sat', next ? '1' : '0') } catch {}
      return next
    })
  }

  const fetch = useCallback(async () => {
    try {
      const d = await api.vehicles.list()
      setVehicles(d); setLastSync(new Date()); setLoading(false); return d
    } catch { setLoading(false); return [] }
  }, [])

  const syncMarkers = useCallback((data) => {
    if (!gmap.current || !window.google?.maps) return
    data.forEach(v => {
      const lat = parseFloat(v.lat||0), lng = parseFloat(v.lng||0)
      if (!lat && !lng) return
      const isMoving = v.status === 'moving'
      const icon     = mkIcon(v.status, v.course||0)
      if (markers.current[v.imei]) {
        animateMarker(markers.current[v.imei], lat, lng)
        markers.current[v.imei].setIcon(icon)
      } else {
        const m = new window.google.maps.Marker({ position:{lat,lng}, map:gmap.current, icon, title:v.name })
        m.addListener('click', ()=>{
          const cur = markers.current[v.imei].getPosition()
          setSelected(v)
          gmap.current.panTo({ lat: cur.lat(), lng: cur.lng() })
          gmap.current.setZoom(16)
        })
        markers.current[v.imei] = m

        // Custom floating label, shown automatically as soon as the marker
        // exists — no click needed — gliding smoothly with the pin.
        const LabelCls = getVehicleLabelClass()
        infoWins.current[v.imei] = new LabelCls(gmap.current, { lat, lng }, mkInfoHtml(v))
      }
      // Keep the always-visible label in sync with live position/data
      if (infoWins.current[v.imei]) {
        infoWins.current[v.imei].update({ lat, lng }, mkInfoHtml(v))
      }
      if (isMoving) {
        if (pulses.current[v.imei]) pulses.current[v.imei].setCenter(lat,lng)
        else pulses.current[v.imei] = makePulse(gmap.current, lat, lng)
      } else if (!isMoving && pulses.current[v.imei]) {
        pulses.current[v.imei].stop(); delete pulses.current[v.imei]
      }
    })
  }, [])

  const initMap = useCallback(() => {
    if (!mapRef.current || gmap.current || !window.google?.maps) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat:11.5564, lng:104.9282 }, zoom: 13,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
    })
    gmap.current = map
    setMapReady(true)
  }, [])

  useEffect(()=>{
    let cancelled = false
    loadGoogleMaps().then(()=>{ if(!cancelled) initMap() }).catch(err=>console.error(err))
    return ()=>{ cancelled = true }
  }, [initMap])
  useEffect(()=>{ if(mapReady) syncMarkers(vehicles) },   [mapReady,vehicles])
  // Map type: satellite/hybrid toggle button
  useEffect(()=>{
    if(!gmap.current) return
    gmap.current.setMapTypeId(sat?'hybrid':'roadmap')
  },[sat,mapReady])
  useEffect(()=>{
    if(!selected) return
    const f=vehicles.find(v=>v.imei===selected.imei)
    if(f) setSelected(f)
  },[vehicles])
  useEffect(()=>{
    fetch()
    const id=setInterval(async()=>{const d=await fetch();syncMarkers(d)},5000)
    return()=>clearInterval(id)
  },[fetch,syncMarkers])

  const focus = v => {
    setSelected(v)
    if(gmap.current&&v.lat&&parseFloat(v.lat)!==0){
      gmap.current.panTo({ lat:parseFloat(v.lat), lng:parseFloat(v.lng) })
      gmap.current.setZoom(16)
    }
  }

  const list    = vehicles.filter(v=>(filter==='all'||v.status===filter)&&(!search||v.name?.toLowerCase().includes(search.toLowerCase())||v.plate?.toLowerCase().includes(search.toLowerCase())||v.owner?.toLowerCase().includes(search.toLowerCase())))
  const moving  = vehicles.filter(v=>v.status==='moving').length
  const stopped = vehicles.filter(v=>v.status==='stopped').length
  const offline = vehicles.filter(v=>v.status==='offline').length

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', fontFamily:"'Inter',system-ui,-apple-system,sans-serif", overflow:'hidden', display:'flex' }}>
      <style>{`
        @keyframes kvhP    { 0%{transform:scale(.4);opacity:.8} 100%{transform:scale(2.6);opacity:0} }
        @keyframes kvhSpin { to{transform:rotate(360deg)} }
        @keyframes kvhSlide{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .kvh-sc::-webkit-scrollbar{width:3px}
        .kvh-sc::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        .kvh-vrow:hover{ background:#F8FAFC !important; border-color:#E2E8F0 !important; }

        /* Floating vehicle label (VehicleLabel overlay) — bouncy entrance,
           no Google chrome, a soft shadow + dashed divider, and a small
           pointer tail aimed straight at the pin below it. */
        @keyframes kvhBubbleIn {
          0%   { opacity:0; transform:scale(.7) translateY(8px); }
          55%  { opacity:1; transform:scale(1.06) translateY(-3px); }
          80%  { transform:scale(.98) translateY(0); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes kvhDotLive {
          0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,.5); }
          50%     { box-shadow:0 0 0 4px rgba(34,197,94,0); }
        }
        .kvh-bubble {
          position:relative;
          font-family:'Inter',system-ui,-apple-system,sans-serif;
          min-width:156px;
          background:#fff;
          border-radius:13px;
          padding:10px 12px 9px;
          border:1px solid rgba(226,232,240,.9);
          box-shadow:0 10px 28px rgba(15,23,42,.16), 0 2px 6px rgba(15,23,42,.07);
          animation:kvhBubbleIn .38s cubic-bezier(.34,1.56,.64,1);
          cursor:default;
        }
        .kvh-bubble::after{
          content:'';
          position:absolute; left:50%; bottom:-6px;
          width:11px; height:11px; margin-left:-5.5px;
          background:#fff;
          border-right:1px solid rgba(226,232,240,.9);
          border-bottom:1px solid rgba(226,232,240,.9);
          transform:rotate(45deg);
          border-radius:0 0 2px 0;
        }
        .kvh-dot-live{ animation:kvhDotLive 1.6s ease-out infinite; }
      `}</style>

      {/* ════════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════ */}
      <div style={{ width:open?300:0, flexShrink:0, transition:'width .28s cubic-bezier(.4,0,.2,1)', overflow:'hidden', zIndex:20, boxShadow:open?'2px 0 20px rgba(0,0,0,.07)':'' }}>
        <div style={{ width:300, height:'100%', background:'white', display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid '+T.border }}>

          {/* ── KVH Logo strip ───────────────────────────── */}
          <div style={{ padding:'16px 18px 10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, borderBottom:'1px solid '+T.border }}>
            <img
              src="/kvh-logo.png"
              alt="KVH GPS Fleet"
              style={{ height:38, objectFit:'contain' }}
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback if logo missing */}
            <div style={{ display:'none', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:T.blue, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Navigation size={18} color="white"/>
              </div>
              <span style={{ color:T.navy, fontWeight:800, fontSize:15, letterSpacing:.3 }}>KVH GPS Fleet</span>
            </div>
          </div>

          {/* ── Live Tracking header ──────────────────────── */}
          <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid '+T.border, flexShrink:0 }}>

            {/* Title + live dot — centered, no icon */}
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:16, color:T.navy, marginBottom:4 }}>Live Tracking</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {loading
                  ? <div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid #BFDBFE', borderTopColor:T.blue, animation:'kvhSpin .7s linear infinite' }}/>
                  : <div style={{ width:7, height:7, borderRadius:'50%', background:T.green }}/>
                }
                <span style={{ color:T.faint, fontSize:11 }}>
                  {loading?'Loading…':lastSync?lastSync.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Ready'}
                </span>
              </div>
            </div>

            {/* Status stat pills */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
              {[
                ['MOVING',  moving,  T.green, T.greenL, '#BBF7D0', 'moving' ],
                ['STOPPED', stopped, T.amber, T.amberL, '#FDE68A', 'stopped'],
                ['OFFLINE', offline, T.grey,  T.greyL,  '#E2E8F0', 'offline'],
              ].map(([l,v,c,bg,bd,id])=>(
                <button key={l} onClick={()=>setFilter(filter===id?'all':id)}
                  style={{ borderRadius:10, padding:'10px 6px', textAlign:'center', border:`1.5px solid ${filter===id?c:bd}`, cursor:'pointer', background:filter===id?c:bg, transition:'all .15s' }}>
                  <div style={{ fontWeight:800, fontSize:20, lineHeight:1, color:filter===id?'white':c }}>{v}</div>
                  <div style={{ fontSize:9, color:filter===id?'rgba(255,255,255,.75)':T.muted, marginTop:4, fontWeight:700, letterSpacing:.5 }}>{l}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Search + filter tabs ──────────────────────── */}
          <div style={{ padding:'12px 14px 10px', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:T.bg, borderRadius:10, padding:'9px 12px', border:'1.5px solid '+T.border, marginBottom:10 }}>
              <Search size={14} color={T.faint}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search driver, vehicle, plate…"
                style={{ flex:1, border:'none', outline:'none', fontSize:13, color:T.navy, background:'transparent' }}/>
              {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:T.faint, display:'flex' }}><X size={12}/></button>}
            </div>
            <div style={{ display:'flex', background:T.bg, borderRadius:9, padding:3, border:'1px solid '+T.border }}>
              {[['all','All'],['moving','Moving'],['stopped','Stopped'],['offline','Offline']].map(([id,l])=>(
                <button key={id} onClick={()=>setFilter(id)}
                  style={{ flex:1, padding:'6px 3px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:filter===id?700:400, background:filter===id?T.navy:'transparent', color:filter===id?'white':T.muted, transition:'all .15s', whiteSpace:'nowrap', boxShadow:filter===id?'0 1px 4px rgba(0,0,0,.15)':'none' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:T.border, flexShrink:0 }}/>

          {/* Label row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px 6px', flexShrink:0 }}>
            <span style={{ fontSize:10, fontWeight:700, color:T.faint, letterSpacing:1, textTransform:'uppercase' }}>Vehicles</span>
            <span style={{ fontSize:11, color:T.faint }}>{list.length} shown</span>
          </div>

          {/* ── Vehicle list ─────────────────────────────── */}
          <div className="kvh-sc" style={{ flex:1, overflowY:'auto', padding:'2px 10px 10px' }}>
            {loading && vehicles.length === 0 ? (
              [0,1,2,3].map(i=>(
                <div key={i} style={{ display:'flex', gap:10, padding:'12px 10px', marginBottom:4, borderRadius:10, background:T.bg, border:'1px solid '+T.border }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:'#E2E8F0', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ height:13, background:'#E2E8F0', borderRadius:5, marginBottom:8 }}/>
                    <div style={{ height:10, background:'#F1F5F9', borderRadius:5, width:'55%' }}/>
                  </div>
                </div>
              ))
            ) : list.length === 0 ? (
              <div style={{ textAlign:'center', padding:'36px 16px' }}>
                <User size={32} color="#CBD5E1" style={{ margin:'0 auto 10px' }}/>
                <div style={{ fontSize:13, color:T.faint }}>{search?`No results for "${search}"`:'No vehicles found'}</div>
              </div>
            ) : list.map(v=>{
              const s    = st(v.status)
              const isSel= selected?.imei === v.imei
              const hasDriver = v.owner && v.owner !== 'Unassigned'
              return (
                <div key={v.imei}
                  className={isSel?'':'kvh-vrow'}
                  onClick={()=>focus(v)}
                  style={{ padding:'12px 12px', marginBottom:5, borderRadius:12, cursor:'pointer', transition:'all .15s',
                    background: isSel ? T.blueL : 'white',
                    border:     isSel ? `1.5px solid ${T.blue}` : '1.5px solid '+T.border,
                    boxShadow:  isSel ? `0 2px 12px rgba(27,107,181,.12)` : '0 1px 2px rgba(0,0,0,.04)',
                  }}>

                  <div style={{ display:'flex', alignItems:'center', gap:11 }}>

                    {/* Avatar — driver initials or car icon */}
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:s.bg, border:`1.5px solid ${s.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:s.color }}>
                        {hasDriver
                          ? v.owner.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
                          : <Car size={20} color={s.color}/>
                        }
                      </div>
                      <div style={{ position:'absolute', bottom:-2, right:-2, width:11, height:11, borderRadius:'50%', background:s.dot, border:'2.5px solid white' }}/>
                    </div>

                    {/* ── Driver name (primary) + Car below ── */}
                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Driver name — primary label */}
                      <div style={{ fontWeight:700, fontSize:14, color:T.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {hasDriver ? v.owner : '— No driver —'}
                      </div>
                      {/* Car name + plate — secondary */}
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                        <Car size={11} color={T.faint}/>
                        <span style={{ fontSize:12, color:T.faint, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {v.name} · {v.plate}
                        </span>
                      </div>
                    </div>

                    {/* Speed */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:18, fontWeight:900, color:v.speed>0?s.color:'#CBD5E1', lineHeight:1 }}>{Math.round(v.speed||0)}</div>
                      <div style={{ fontSize:10, color:T.faint, marginTop:2 }}>km/h</div>
                    </div>
                  </div>

                  {/* Status + coords */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, paddingTop:8, borderTop:'1px solid '+T.border }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:s.color }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, display:'inline-block' }}/>
                      {s.label}{v.status !== 'moving' && sinceLabel(v.status_since) ? ' · ' + sinceLabel(v.status_since) : ''}
                    </span>
                    {v.lat && parseFloat(v.lat) !== 0
                      ? <span style={{ fontSize:11, color:T.faint, fontFamily:'monospace' }}>{Number(v.lat).toFixed(4)}, {Number(v.lng).toFixed(4)}</span>
                      : <span style={{ fontSize:11, color:'#CBD5E1' }}>No GPS signal</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Footer ───────────────────────────────────── */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid '+T.border, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:T.bg }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:T.green }}/>
              <span style={{ color:T.faint, fontSize:11 }}>Auto-sync every 5s</span>
            </div>
            <button onClick={()=>fetch()}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', background:T.navy, border:'none', borderRadius:9, cursor:'pointer', color:'white', fontSize:12, fontWeight:700 }}>
              <RefreshCw size={11}/> Sync
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MAP
      ════════════════════════════════════════════════════ */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapRef} style={{ position:'absolute', inset:0 }}/>

        {/* Sidebar toggle */}
        <button onClick={()=>setOpen(p=>!p)}
          style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)', zIndex:40, width:22, height:50, borderRadius:9, background:'white', border:'1px solid '+T.border, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.muted, boxShadow:'0 2px 10px rgba(0,0,0,.1)' }}>
          {open ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
        </button>

        {/* ── Satellite toggle ──────────────────────────── */}
        {mapReady && (
          <button onClick={toggleSat} title={sat?'Satellite view on':'Switch to satellite view'}
            style={{ position:'absolute', left:16, bottom:20, zIndex:40, width:42, height:42, borderRadius:10, border:'none', background:sat?T.blue:'white', color:sat?'white':T.navy, boxShadow:'0 2px 10px rgba(0,0,0,.18)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Layers size={17}/>
          </button>
        )}

        {/* ── Selected vehicle card ─────────────────────── */}
        {selected && (() => {
          const s = st(selected.status)
          const hasDriver = selected.owner && selected.owner !== 'Unassigned'
          return (
            <div style={{ position:'absolute', bottom:20, right:20, zIndex:40, width:340, animation:'kvhSlide .22s ease' }}>
              <div style={{ background:'white', borderRadius:18, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,.16)', border:'1px solid '+T.border }}>

                {/* Navy header */}
                <div style={{ background:T.navy, padding:'14px 16px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>

                    {/* Avatar */}
                    <div style={{ width:46, height:46, borderRadius:13, background:`${s.color}22`, border:`1.5px solid ${s.color}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, fontWeight:800, color:s.color, position:'relative' }}>
                      {hasDriver
                        ? selected.owner.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
                        : <Car size={22} color={s.color}/>
                      }
                      <div style={{ position:'absolute', bottom:-3, right:-3, width:12, height:12, borderRadius:'50%', background:s.dot, border:'2.5px solid '+T.navy }}/>
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Driver name — primary */}
                      <div style={{ color:'white', fontWeight:800, fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {hasDriver ? selected.owner : '— No driver assigned —'}
                      </div>
                      {/* Car name + plate — secondary */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                        <Car size={11} color="rgba(255,255,255,.4)"/>
                        <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>{selected.name} · {selected.plate}</span>
                        <span style={{ background:`${s.color}22`, color:s.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s.label}{selected.status !== 'moving' && sinceLabel(selected.status_since) ? ' · ' + sinceLabel(selected.status_since) : ''}</span>
                      </div>
                    </div>

                    <button onClick={()=>setSelected(null)}
                      style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,.6)', flexShrink:0 }}>
                      <X size={14}/>
                    </button>
                  </div>
                </div>

                {/* White content */}
                <div style={{ padding:'14px 16px' }}>

                  {/* Speed */}
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, padding:'10px 14px', background:selected.speed>0?T.greenL:T.greyL, borderRadius:12, marginBottom:12 }}>
                    <Gauge size={16} color={selected.speed>0?T.green:T.grey}/>
                    <span style={{ fontSize:32, fontWeight:900, color:selected.speed>0?T.green:T.muted, lineHeight:1 }}>{Math.round(selected.speed||0)}</span>
                    <span style={{ fontSize:13, color:T.muted }}>km/h</span>
                    <span style={{ marginLeft:'auto', fontSize:12, color:T.muted }}>{selected.status==='moving'?'En route':'Stationary'}</span>
                  </div>

                  {/* Battery + Signal */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div style={{ padding:'10px 12px', background:T.bg, borderRadius:10, border:'1px solid '+T.border }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <Battery size={13} color={selected.battery<20?T.red:T.green}/>
                        <span style={{ fontSize:11, color:T.muted }}>Battery</span>
                      </div>
                      <div style={{ fontWeight:800, fontSize:20, color:selected.battery<20?T.red:T.navy }}>{selected.battery||0}%</div>
                      <div style={{ height:3, background:T.border, borderRadius:2, marginTop:6 }}>
                        <div style={{ height:'100%', width:`${selected.battery||0}%`, background:selected.battery<20?T.red:T.green, borderRadius:2 }}/>
                      </div>
                    </div>
                    <div style={{ padding:'10px 12px', background:T.bg, borderRadius:10, border:'1px solid '+T.border }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <Wifi size={13} color={T.blue}/>
                        <span style={{ fontSize:11, color:T.muted }}>Signal</span>
                      </div>
                      <div style={{ fontWeight:800, fontSize:20, color:T.navy }}>{selected.signal||0}<span style={{ fontSize:13, fontWeight:400, color:T.faint }}>/5</span></div>
                      <div style={{ display:'flex', gap:2, marginTop:6 }}>
                        {[1,2,3,4,5].map(i=>(
                          <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=(selected.signal||0)?T.blue:T.border }}/>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Coordinates */}
                  {selected.lat && parseFloat(selected.lat) !== 0 ? (
                    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:T.blueL, borderRadius:10, border:`1px solid ${T.blue}22` }}>
                      <MapPin size={13} color={T.blue}/>
                      <span style={{ fontFamily:'monospace', fontSize:12, color:T.blue, fontWeight:600 }}>{Number(selected.lat).toFixed(6)}, {Number(selected.lng).toFixed(6)}</span>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:T.amberL, borderRadius:10, border:`1px solid ${T.amber}33` }}>
                      <WifiOff size={13} color={T.amber}/>
                      <span style={{ fontSize:12, color:T.amber, fontWeight:600 }}>Waiting for GPS signal…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}