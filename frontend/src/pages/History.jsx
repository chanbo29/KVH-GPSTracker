import { useState, useEffect, useRef } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import { C }       from '../constants/colors.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight,
  Car, Clock, Gauge, MapPin, Calendar,
  Navigation, Search, ChevronDown, X,
} from 'lucide-react'
import {
  LoadingStyles,
  Spinner,
  LoadingBar,
  Skel,
} from '../components/Loading.jsx'

const BORDER = '1px solid #E2E8F0'

const MOCK_HISTORY = {
  '865784056472668': {
    '2026-09-10': [
      { lat:11.5564, lng:104.9282, time:'07:30', speed:0,  event:'Start'     },
      { lat:11.5580, lng:104.9300, time:'07:33', speed:28, event:''          },
      { lat:11.5610, lng:104.9330, time:'07:38', speed:52, event:''          },
      { lat:11.5640, lng:104.9360, time:'07:43', speed:68, event:'Overspeed' },
      { lat:11.5660, lng:104.9400, time:'07:48', speed:55, event:''          },
      { lat:11.5680, lng:104.9430, time:'07:53', speed:42, event:''          },
      { lat:11.5700, lng:104.9460, time:'07:58', speed:0,  event:'Stop'      },
      { lat:11.5700, lng:104.9460, time:'08:10', speed:0,  event:''          },
      { lat:11.5720, lng:104.9480, time:'08:15', speed:35, event:'Start'     },
      { lat:11.5750, lng:104.9510, time:'08:20', speed:48, event:''          },
      { lat:11.5780, lng:104.9540, time:'08:25', speed:61, event:''          },
      { lat:11.5800, lng:104.9560, time:'08:30', speed:0,  event:'Stop'      },
    ],
    '2026-09-09': [
      { lat:11.5564, lng:104.9282, time:'13:00', speed:0,  event:'Start' },
      { lat:11.5540, lng:104.9250, time:'13:05', speed:38, event:''      },
      { lat:11.5510, lng:104.9220, time:'13:10', speed:52, event:''      },
      { lat:11.5490, lng:104.9200, time:'13:15', speed:45, event:''      },
      { lat:11.5470, lng:104.9180, time:'13:20', speed:60, event:''      },
      { lat:11.5450, lng:104.9160, time:'13:25', speed:0,  event:'Stop'  },
    ],
  },
}

const SPEEDS = [1, 2, 4, 8]

// ── Compass bearing from point a to point b, in degrees (0 = north) ────
function bearing(a, b) {
  const toRad = d => d * Math.PI / 180
  const toDeg = r => r * 180 / Math.PI
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// ── Arrow-shaped vehicle icon for the playback marker, rotated to face the
// direction of travel — same visual language as the Live Tracking markers.
function vehicleIcon(course = 0, color = '#1B6BB5') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
    <g transform="rotate(${course} 12 12)">
      <path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </g>
  </svg>`
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(30, 30),
    anchor: new window.google.maps.Point(15, 15),
  }
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/* ── Skeleton: route log list ─────────────────────────────────── */
function RouteLogSkeleton() {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid #F8FAFC' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
            <Skel w={10} h={10} r={5} style={{ marginTop:2 }}/>
            {i < 7 && <div style={{ width:2, height:22, background:'#E2E8F0', marginTop:3 }}/>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <Skel w={40} h={12} r={5}/>
              <Skel w={55} h={12} r={5}/>
            </div>
            <Skel w="65%" h={10} r={5}/>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Skeleton: stats pills ────────────────────────────────────── */
function StatsPillsSkeleton() {
  return (
    <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
      {[90, 70, 100].map((w, i) => (
        <Skel key={i} w={w} h={28} r={20}/>
      ))}
    </div>
  )
}

/* ── Searchable vehicle picker — search by name OR plate ───────── */
function VehiclePicker({ vehicles, value, onChange, loading }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const selected = vehicles.find(v => v.imei === value)

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    return !q || v.name?.toLowerCase().includes(q) || v.plate?.toLowerCase().includes(q) || v.owner?.toLowerCase().includes(q)
  })

  useEffect(() => {
    const onClickOutside = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => { if (open) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  if (loading) return <Skel h={34} r={8} style={{ flex:1 }}/>

  return (
    <div ref={wrapRef} style={{ position:'relative', flex:1, maxWidth:280 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8,
          padding:'8px 12px', border:BORDER, borderRadius:8, background:'white',
          cursor:'pointer', fontSize:13, color: selected ? C.navy : '#94A3B8', textAlign:'left',
        }}
      >
        <Car size={14} color={C.muted} style={{ flexShrink:0 }}/>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selected ? `${selected.name} — ${selected.plate}` : 'Select Vehicle'}
        </span>
        <ChevronDown size={14} color="#94A3B8" style={{ flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}/>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'white', border:BORDER, borderRadius:10, boxShadow:'0 12px 32px rgba(0,0,0,.14)', zIndex:50, overflow:'hidden' }}>
          <div style={{ padding:8, borderBottom:BORDER, display:'flex', alignItems:'center', gap:8, background:'#F8FAFC' }}>
            <Search size={13} color="#94A3B8" style={{ flexShrink:0 }}/>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, plate, or driver…"
              style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'none', color:C.navy }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', flexShrink:0 }}>
                <X size={13}/>
              </button>
            )}
          </div>

          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding:'16px 14px', color:'#94A3B8', fontSize:13, textAlign:'center' }}>
                No vehicles match "{search}"
              </div>
            ) : filtered.map(v => (
              <button
                key={v.imei}
                onClick={() => { onChange(v.imei); setOpen(false) }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
                  border:'none', background: v.imei === value ? '#EFF6FF' : 'white', cursor:'pointer', textAlign:'left',
                }}
                onMouseEnter={e => { if (v.imei !== value) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (v.imei !== value) e.currentTarget.style.background = 'white' }}
              >
                <div style={{ width:28, height:28, borderRadius:8, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Car size={13} color={C.accent}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                  <div style={{ fontSize:11, color:'#94A3B8' }}>
                    <span style={{ fontFamily:'monospace' }}>{v.plate}</span>
                    {v.owner && v.owner !== 'Unassigned' && <span> · {v.owner}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const { data:vehicles, loading:vehiclesLoading } = useApi(api.vehicles.list)

  const [selectedIMEI, setSelectedIMEI] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [route,        setRoute]        = useState([])
  const [routeIdx,     setRouteIdx]     = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [speed,        setSpeed]        = useState(1)
  const [apiKey,       setApiKey]       = useState(import.meta.env.VITE_GOOGLE_MAPS_KEY || '')
  const [keyInput,     setKeyInput]     = useState('')
  const [mapReady,     setMapReady]     = useState(false)
  const [mapLoading,   setMapLoading]   = useState(false)   // ← Google Maps script loading
  const [routeLoading, setRouteLoading] = useState(false)   // ← Route fetch loading

  const mapEl       = useRef(null)
  const gmapRef     = useRef(null)
  const markerRef   = useRef(null)
  const polyRef     = useRef(null)      // full route, dim/dashed
  const trailRef    = useRef(null)      // bright "traveled so far" overlay
  const pulseRef    = useRef(null)      // soft ring behind the marker while playing
  const timerRef    = useRef(null)
  const glideGenRef = useRef(0)         // cancels stale glide animations on seek
  const rowRefs     = useRef([])        // route-log rows, so playback can auto-scroll to the active one

  const cur = route[routeIdx]

  // ── Init Google Map ──────────────────────────────────────────
  const initMap = () => {
    if (!mapEl.current || !window.google?.maps || gmapRef.current) return
    gmapRef.current = new window.google.maps.Map(mapEl.current, {
      center: { lat:11.5564, lng:104.9282 },
      zoom: 13,
      mapTypeId: 'hybrid',
      streetViewControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
    })
    setMapReady(true)
    setMapLoading(false)
  }

  const loadMaps = (key) => {
    if (window.google?.maps) { initMap(); return }
    setMapLoading(true)
    window.__historyMapInit = () => initMap()
    const s = document.createElement('script')
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&callback=__historyMapInit'
    s.async = true; s.defer = true
    document.head.appendChild(s)
  }

  useEffect(() => { if (apiKey) loadMaps(apiKey) }, [apiKey])

  // ── Smoothly glide the playback marker from its current spot to `to`,
  // over `ms` milliseconds. A generation counter cancels any in-flight
  // glide if the user seeks elsewhere before it finishes.
  const glideMarker = (to, ms) => {
    const marker = markerRef.current
    if (!marker || !window.google?.maps) return
    const gen  = ++glideGenRef.current
    const cur  = marker.getPosition()
    const from = { lat: cur.lat(), lng: cur.lng() }
    const t0   = performance.now()
    const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t
    const step = now => {
      if (gen !== glideGenRef.current) return   // superseded by a newer seek
      const p = Math.min((now - t0) / ms, 1)
      const pos = { lat: from.lat+(to.lat-from.lat)*ease(p), lng: from.lng+(to.lng-from.lng)*ease(p) }
      marker.setPosition(pos)
      if (pulseRef.current) pulseRef.current.setCenter(pos)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // Redraw just the bright "traveled so far" trail up through index `idx`
  const updateTrail = (pts, idx) => {
    if (!trailRef.current) return
    trailRef.current.setPath(pts.slice(0, idx + 1))
  }

  // ── Draw route on map ────────────────────────────────────────
  const drawRoute = (pts) => {
    if (!gmapRef.current || !window.google?.maps || !pts.length) return
    if (polyRef.current)   polyRef.current.setMap(null)
    if (trailRef.current)  trailRef.current.setMap(null)
    if (pulseRef.current)  { pulseRef.current._stopTick?.(); pulseRef.current.setMap(null) }
    if (markerRef.current) markerRef.current.setMap(null)

    // Full route — dim, dashed, always visible as the "track ahead"
    polyRef.current = new window.google.maps.Polyline({
      path: pts, geodesic: true,
      strokeOpacity: 0,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: .55, strokeColor: C.accent, scale: 3 },
        offset: '0', repeat: '14px',
      }],
      map: gmapRef.current,
    })
    // Bright overlay — the portion already "driven" during playback
    trailRef.current = new window.google.maps.Polyline({
      path: pts.slice(0, 1), geodesic: true,
      strokeColor: C.accent, strokeOpacity: .95, strokeWeight: 5,
      map: gmapRef.current,
    })

    new window.google.maps.Marker({
      position: pts[0], map: gmapRef.current,
      label: { text:'A', color:'white', fontWeight:'bold', fontSize:'12px' },
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale:14, fillColor:C.green, fillOpacity:1, strokeColor:'white', strokeWeight:2 },
    })
    new window.google.maps.Marker({
      position: pts[pts.length-1], map: gmapRef.current,
      label: { text:'B', color:'white', fontWeight:'bold', fontSize:'12px' },
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale:14, fillColor:C.red, fillOpacity:1, strokeColor:'white', strokeWeight:2 },
    })
    pts.forEach(p => {
      if (p.event === 'Overspeed') {
        new window.google.maps.Marker({
          position: p, map: gmapRef.current,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale:8, fillColor:'#F59E0B', fillOpacity:1, strokeColor:'white', strokeWeight:2 },
          title: 'Overspeed at ' + p.time,
        })
      }
    })

    // Soft pulsing ring behind the marker — only shown while playing
    // (the [playing] effect below toggles its map)
    const pulse = new window.google.maps.Circle({
      map: null, center: pts[0], radius: 18,
      fillColor: C.accent, fillOpacity: .25, strokeOpacity: 0, clickable: false, zIndex: 1,
    })
    let raf
    const DUR = 1600
    const t0 = performance.now()
    const tick = now => {
      const p = ((now - t0) % DUR) / DUR
      pulse.setRadius(18 + p * 60)
      pulse.setOptions({ fillOpacity: .22 * (1 - p) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    pulse._stopTick = () => cancelAnimationFrame(raf)
    pulseRef.current = pulse

    const course0 = pts.length > 1 ? bearing(pts[0], pts[1]) : 0
    markerRef.current = new window.google.maps.Marker({
      position: pts[0], map: gmapRef.current,
      icon: vehicleIcon(course0, C.accent),
      zIndex: 999,
    })

    const bounds = new window.google.maps.LatLngBounds()
    pts.forEach(p => bounds.extend(p))
    gmapRef.current.fitBounds(bounds, { top:60, right:60, bottom:60, left:60 })
  }

  // ── Load Route (with loading state) ─────────────────────────
  const loadRoute = () => {
    setRouteLoading(true)
    api.vehicles.history(selectedIMEI, selectedDate)
      .then(logs => {
        const data = (logs || []).map((log, i, arr) => ({
          lat:   parseFloat(log.latitude),
          lng:   parseFloat(log.longitude),
          speed: parseFloat(log.speed) || 0,
          ts:    new Date(log.timestamp).getTime(),
          time:  new Date(log.timestamp).toLocaleTimeString('en-GB', {
                   hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Phnom_Penh',
                 }),
          event: i === 0 ? 'Start' : i === arr.length - 1 ? 'Stop' : '',
        }))
        setRoute(data)
        setRouteIdx(0)
        setPlaying(false)
        if (data.length > 0 && mapReady) drawRoute(data)
      })
      .catch(() => {
        setRoute([])
        setRouteIdx(0)
        setPlaying(false)
      })
      .finally(() => setRouteLoading(false))
  }

  // Auto-load when vehicle/date changes (existing behaviour)
  useEffect(() => {
    if (!selectedIMEI || !selectedDate) return
    loadRoute()
  }, [selectedIMEI, selectedDate, mapReady])

  // ── Playback animation ───────────────────────────────────────
  // The marker glides smoothly to each next point (instead of teleporting),
  // rotates to face the direction of travel, extends the bright "traveled"
  // trail, and the camera eases along with it.
  //
  // Real fixes aren't evenly spaced — gaps range from ~10s to several
  // minutes (signal loss, device sleep, etc). Stepping through them on a
  // flat timer made far-apart points "jump" rather than glide, since the
  // on-screen distance covered per tick had nothing to do with how far
  // apart (in time and space) those points actually were. Instead, each
  // step's on-screen duration scales with the real gap to the next fix
  // (compressed and clamped so a multi-minute gap doesn't stall playback,
  // and a near-instant gap still glides instead of flashing).
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (pulseRef.current) pulseRef.current.setMap(playing ? gmapRef.current : null)
    if (!playing || route.length < 2) return
    let cancelled = false
    const MIN_STEP = 350   // ms — floor, so even a 1s real gap still glides visibly
    const MAX_STEP = 2200  // ms — ceiling, so a multi-minute real gap doesn't stall playback
    const stepDuration = (prev, n) => {
      const realGapSec = route[prev]?.ts && route[n]?.ts
        ? Math.max(0, (route[n].ts - route[prev].ts) / 1000)
        : 10
      // ~55ms of on-screen playback per real second of gap, then speed-scaled
      return Math.min(Math.max((realGapSec * 55) / speed, MIN_STEP), MAX_STEP)
    }
    const advance = (prev) => {
      const n = prev + 1
      if (n >= route.length) { setPlaying(false); return }
      const dur = stepDuration(prev, n)
      if (window.google?.maps) {
        const course = bearing(route[prev], route[n])
        markerRef.current?.setIcon(vehicleIcon(course, route[n].speed > 60 ? '#F59E0B' : C.accent))
        glideMarker(route[n], Math.min(dur * .92, dur))
        updateTrail(route, n)
        gmapRef.current?.panTo(route[n])
      }
      setRouteIdx(n)
      if (!cancelled) timerRef.current = setTimeout(() => advance(n), dur)
    }
    timerRef.current = setTimeout(() => advance(routeIdx), stepDuration(routeIdx, routeIdx + 1))
    return () => { cancelled = true; clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, route])

  // Keep the route-log scrolled to the active point while playback runs
  useEffect(() => {
    if (!playing) return
    rowRefs.current[routeIdx]?.scrollIntoView({ behavior:'smooth', block:'nearest' })
  }, [routeIdx, playing])

  const moveTo = (n) => {
    const idx = Math.max(0, Math.min(route.length - 1, n))
    setRouteIdx(idx)
    if (markerRef.current && window.google?.maps && route[idx]) {
      glideGenRef.current++   // cancel any in-flight glide — this is an instant seek
      markerRef.current.setPosition(route[idx])
      if (pulseRef.current) pulseRef.current.setCenter(route[idx])
      const ref = route[idx+1] || route[idx-1]
      if (ref) {
        const course = idx < route.length-1 ? bearing(route[idx], route[idx+1]) : bearing(route[idx-1], route[idx])
        markerRef.current.setIcon(vehicleIcon(course, route[idx].speed > 60 ? '#F59E0B' : C.accent))
      }
      updateTrail(route, idx)
    }
  }

  // ── Stats ────────────────────────────────────────────────────
  const maxSpeed  = route.length ? Math.max(...route.map(r => r.speed)) : 0
  const tripDist  = route.length > 1 ? (route.length * 0.25).toFixed(1) : 0
  const startTime = route[0]?.time || '--'
  const endTime   = route[route.length-1]?.time || '--'

  const selectedVehicle = vehicles.find(v => v.imei === selectedIMEI)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 60px)', overflow:'hidden', background:'#F1F5F9' }}>
      <LoadingStyles/>
      <style>{`
        @keyframes kvhHistPop {
          0%   { opacity:0; transform:scale(.85) translateY(-6px); }
          60%  { opacity:1; transform:scale(1.03) translateY(0); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        .kvh-hist-pop{ animation:kvhHistPop .3s cubic-bezier(.34,1.56,.64,1); }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ background:'white', borderBottom:BORDER, flexShrink:0 }}>
        <div style={{ padding:'12px 20px', display:'flex', gap:12, alignItems:'center' }}>

          {/* Title */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:4 }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:15 }}>History / Playback</div>
            {(vehiclesLoading || routeLoading) && <Spinner size={16}/>}
          </div>

          {/* Searchable vehicle picker */}
          <VehiclePicker
            vehicles={vehicles}
            value={selectedIMEI}
            onChange={setSelectedIMEI}
            loading={vehiclesLoading}
          />

          {/* Date navigation — arrows + Today shortcut, so browsing day by day never needs the calendar picker */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Calendar size={15} color={C.muted}/>
            <button onClick={() => setSelectedDate(d => addDays(d, -1))} title="Previous day"
              style={{ width:30, height:30, border:BORDER, borderRadius:8, background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, flexShrink:0 }}>
              <ChevronLeft size={14}/>
            </button>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding:'8px 10px', border:BORDER, borderRadius:8, fontSize:13, color:C.navy, outline:'none' }}/>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))} title="Next day"
              disabled={selectedDate >= todayStr()}
              style={{ width:30, height:30, border:BORDER, borderRadius:8, background:'white', cursor: selectedDate >= todayStr() ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: selectedDate >= todayStr() ? '#CBD5E1' : C.muted, flexShrink:0 }}>
              <ChevronRight size={14}/>
            </button>
            {selectedDate !== todayStr() && (
              <button onClick={() => setSelectedDate(todayStr())}
                style={{ padding:'7px 12px', border:'none', borderRadius:8, background:'#EFF6FF', color:C.accent, cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0 }}>
                Today
              </button>
            )}
          </div>

          {/* Load button — shows spinner while loading */}
          <Btn onClick={loadRoute} disabled={!selectedIMEI || routeLoading}
            style={{ opacity: !selectedIMEI ? .5 : 1, display:'flex', alignItems:'center', gap:6 }}>
            {routeLoading
              ? <><Spinner size={14} color={C.accent}/> Loading…</>
              : <><Search size={14}/> Load Route</>
            }
          </Btn>

          {/* Stats pills — skeleton while route loading, real data after */}
          {routeLoading && <StatsPillsSkeleton/>}
          {!routeLoading && route.length > 0 && (
            <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
              {[
                [startTime + ' → ' + endTime, Clock,  C.accent                     ],
                [tripDist + ' km',             MapPin, C.blue                       ],
                ['Max ' + maxSpeed + ' km/h',  Gauge,  maxSpeed > 80 ? C.red : C.green],
              ].map(([label, Icon, color]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', background:color+'12', borderRadius:20, fontSize:12, color, fontWeight:600 }}>
                  <Icon size={12}/> {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading bar — shows while vehicles or route is loading */}
        <LoadingBar show={vehiclesLoading || routeLoading}/>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Left sidebar — route log */}
        <div style={{ width:260, minWidth:260, background:'white', borderRight:BORDER, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:C.navy, fontWeight:700, fontSize:13 }}>Route Log</span>
            {routeLoading
              ? <Spinner size={14}/>
              : <span style={{ color:C.faint, fontSize:11 }}>{route.length} points</span>
            }
          </div>

          {/* Skeleton while route is loading */}
          {routeLoading ? (
            <RouteLogSkeleton/>
          ) : route.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:C.faint, padding:20, textAlign:'center' }}>
              <Navigation size={32} color={C.accentB}/>
              <div style={{ fontSize:13 }}>Select a vehicle and date then click Load Route</div>
            </div>
          ) : (
            <div style={{ flex:1, overflowY:'auto' }}>
              {/* Chronological: earliest fix at top, latest at bottom
                  (e.g. 1:00pm ... 5:00pm reading down the list). */}
              {route.map((pt, i) => (
                <div key={i} ref={el => rowRefs.current[i] = el} onClick={() => moveTo(i)}
                  style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom: i < route.length - 1 ? '1px solid #F8FAFC' : 'none', cursor:'pointer', background: routeIdx===i ? C.accentL : 'transparent', borderLeft:'3px solid '+(routeIdx===i ? C.accent : 'transparent'), transition:'all .15s' }}
                  onMouseEnter={e => { if (routeIdx!==i) e.currentTarget.style.background=C.bg }}
                  onMouseLeave={e => { if (routeIdx!==i) e.currentTarget.style.background='transparent' }}>
                  {/* Timeline dot */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background: pt.event==='Start'?C.green:pt.event==='Stop'?C.red:pt.event==='Overspeed'?'#F59E0B':pt.speed===0?C.muted:C.accent, flexShrink:0, marginTop:2 }}/>
                    {i < route.length - 1 && <div style={{ width:2, flex:1, background:'#E2E8F0', marginTop:3, minHeight:16 }}/>}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                      <span style={{ color:C.navy, fontWeight:600, fontSize:12 }}>{pt.time}</span>
                      <span style={{ fontSize:12, color: pt.speed > 60 ? C.red : pt.speed === 0 ? C.muted : C.green, fontWeight:600 }}>
                        {pt.speed} km/h
                      </span>
                    </div>
                    {pt.event && (
                      <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, fontWeight:600, background: pt.event==='Start'?'#ECFDF5':pt.event==='Stop'?'#FEF2F2':pt.event==='Overspeed'?'#FFFBEB':'#F1F5F9', color: pt.event==='Start'?C.green:pt.event==='Stop'?C.red:pt.event==='Overspeed'?'#D97706':C.muted }}>
                        {pt.event}
                      </span>
                    )}
                    <div style={{ color:C.faint, fontSize:10, marginTop:2 }}>
                      {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Map ─────────────────────────────────────────────── */}
        <div style={{ flex:1, position:'relative' }}>
          <div ref={mapEl} style={{ width:'100%', height:'100%' }}/>

          {/* Google Maps script loading overlay */}
          {mapLoading && (
            <div style={{ position:'absolute', inset:0, background:'#F0F7FF', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, zIndex:5 }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(0,0,0,.08)' }}>
                <Spinner size={36}/>
              </div>
              <div>
                <div style={{ color:C.navy, fontWeight:700, fontSize:16, textAlign:'center', marginBottom:5 }}>Loading Google Maps…</div>
                <div style={{ color:C.muted, fontSize:13, textAlign:'center' }}>This may take a moment on slow connections</div>
              </div>
            </div>
          )}

          {/* Route loading overlay on map */}
          {routeLoading && !mapLoading && (
            <div style={{ position:'absolute', inset:0, background:'rgba(240,247,255,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, backdropFilter:'blur(2px)' }}>
              <div style={{ background:'white', borderRadius:16, padding:'20px 28px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 4px 24px rgba(0,0,0,.1)', border:BORDER }}>
                <Spinner size={24}/>
                <div>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>Loading Route…</div>
                  <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>Fetching GPS history data</div>
                </div>
              </div>
            </div>
          )}

          {/* No route selected */}
          {!routeLoading && route.length === 0 && !mapLoading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F7FF', pointerEvents:'none' }}>
              <div style={{ textAlign:'center', color:C.muted }}>
                <MapPin size={52} color={C.accentB} style={{ margin:'0 auto 14px' }}/>
                <div style={{ fontSize:18, fontWeight:700, color:C.navy, marginBottom:6 }}>No Route Loaded</div>
                <div style={{ fontSize:13 }}>Select a vehicle and date to view history</div>
              </div>
            </div>
          )}

          {/* API key prompt */}
          {!apiKey && (
            <div style={{ position:'absolute', inset:0, background:'rgba(240,247,255,.96)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
              <Card style={{ padding:28, width:380, textAlign:'center' }}>
                <Navigation size={40} color={C.accent} style={{ margin:'0 auto 14px' }}/>
                <div style={{ color:C.navy, fontSize:17, fontWeight:700, marginBottom:6 }}>Google Maps API Key</div>
                <div style={{ color:C.muted, fontSize:13, marginBottom:14 }}>Required to display the map and route</div>
                <input value={keyInput} onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && keyInput.trim()) { setApiKey(keyInput.trim()); loadMaps(keyInput.trim()) } }}
                  placeholder="AIzaSy..."
                  style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:8, fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box', fontFamily:'monospace', letterSpacing:1 }}/>
                <Btn variant="primary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => { if (keyInput.trim()) { setApiKey(keyInput.trim()); loadMaps(keyInput.trim()) } }}>
                  {mapLoading ? <><Spinner size={14} color="white"/> Loading…</> : 'Load Map'}
                </Btn>
              </Card>
            </div>
          )}

          {/* Current point info bubble — re-keyed on every step so its
              entrance animation plays each time playback advances */}
          {cur && route.length > 0 && !routeLoading && (
            <div key={routeIdx} className="kvh-hist-pop"
              style={{ position:'absolute', top:16, left:16, background:'white', borderRadius:12, padding:'12px 16px', boxShadow:'0 4px 20px rgba(0,0,0,.12)', border:BORDER, minWidth:200, borderLeft:`3px solid ${cur.speed > 60 ? '#F59E0B' : cur.speed === 0 ? C.muted : C.accent}` }}>
              <div style={{ color:C.faint, fontSize:10, marginBottom:6 }}>Current Position</div>
              <div style={{ display:'flex', gap:16 }}>
                <div>
                  <div style={{ color:C.faint, fontSize:10 }}>Time</div>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>{cur.time}</div>
                </div>
                <div>
                  <div style={{ color:C.faint, fontSize:10 }}>Speed</div>
                  <div style={{ color: cur.speed > 60 ? C.red : cur.speed === 0 ? C.muted : C.green, fontWeight:700, fontSize:14 }}>{cur.speed} km/h</div>
                </div>
                {cur.event && (
                  <div>
                    <div style={{ color:C.faint, fontSize:10 }}>Event</div>
                    <div style={{ color: cur.event==='Overspeed'?'#D97706':cur.event==='Stop'?C.red:C.green, fontWeight:700, fontSize:12 }}>{cur.event}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          {route.length > 0 && !routeLoading && (
            <div style={{ position:'absolute', bottom:80, right:16, background:'white', borderRadius:10, padding:'10px 14px', boxShadow:'0 2px 12px rgba(0,0,0,.1)', border:BORDER }}>
              <div style={{ color:C.navy, fontWeight:600, fontSize:11, marginBottom:8 }}>Legend</div>
              {[
                ['Start point', C.green ],
                ['End point',   C.red   ],
                ['Moving',      C.accent],
                ['Overspeed',   '#F59E0B'],
                ['Stopped',     C.muted ],
              ].map(([l, c]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }}/>
                  <span style={{ color:C.muted, fontSize:11 }}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Playback controls ─────────────────────────────────── */}
      {route.length > 0 && !routeLoading && (
        <div style={{ background:'white', borderTop:BORDER, padding:'12px 20px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>

            {/* Vehicle info */}
            <div style={{ minWidth:160, flexShrink:0 }}>
              <div style={{ color:C.navy, fontWeight:700, fontSize:13 }}>{selectedVehicle?.name || 'Vehicle'}</div>
              <div style={{ color:C.muted, fontSize:11 }}>{selectedDate}</div>
            </div>

            {/* Progress bar */}
            <div style={{ flex:1 }}>
              <div style={{ background:'#F1F5F9', borderRadius:4, height:6, cursor:'pointer', position:'relative' }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  moveTo(Math.round((e.clientX - rect.left) / rect.width * (route.length - 1)))
                }}>
                <div style={{ position:'absolute', inset:0, borderRadius:4, overflow:'hidden', display:'flex' }}>
                  {route.map((pt, i) => (
                    <div key={i} style={{ flex:1, background: pt.speed > 60 ? '#FEE2E2' : pt.speed === 0 ? '#F1F5F9' : '#DBEAFE' }}/>
                  ))}
                </div>
                <div style={{ position:'absolute', top:0, left:0, bottom:0, width: (routeIdx / Math.max(route.length-1,1) * 100) + '%', background:C.accent, borderRadius:4, transition:'width .15s' }}/>
                <div style={{ position:'absolute', top:'50%', left: (routeIdx / Math.max(route.length-1,1) * 100) + '%', transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'white', border:'2px solid '+C.accent, boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ color:C.faint, fontSize:10 }}>{route[0]?.time}</span>
                <span style={{ color:C.faint, fontSize:10 }}>Point {routeIdx+1} / {route.length}</span>
                <span style={{ color:C.faint, fontSize:10 }}>{route[route.length-1]?.time}</span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              <Btn onClick={() => moveTo(0)}            style={{ padding:'7px 10px' }}><SkipBack   size={15}/></Btn>
              <Btn onClick={() => moveTo(routeIdx - 1)} style={{ padding:'7px 10px' }}><ChevronLeft size={15}/></Btn>
              <button onClick={() => setPlaying(p => !p)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 22px', background: playing ? C.red : C.accent, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                {playing ? <><Pause size={15}/> Pause</> : <><Play size={15}/> Play</>}
              </button>
              <Btn onClick={() => moveTo(routeIdx + 1)}   style={{ padding:'7px 10px' }}><ChevronRight size={15}/></Btn>
              <Btn onClick={() => moveTo(route.length - 1)} style={{ padding:'7px 10px' }}><SkipForward size={15}/></Btn>

              {/* Speed selector */}
              <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:8, background:'#F8FAFC', borderRadius:8, padding:'4px', border:BORDER }}>
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    style={{ padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: speed===s ? C.accent : 'transparent', color: speed===s ? 'white' : C.muted, transition:'all .1s' }}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playback bar skeleton while route loading */}
      {routeLoading && (
        <div style={{ background:'white', borderTop:BORDER, padding:'16px 20px', flexShrink:0, display:'flex', alignItems:'center', gap:16 }}>
          <Skel w={140} h={36} r={8}/>
          <div style={{ flex:1 }}><Skel h={6} r={4} style={{ marginBottom:6 }}/><Skel w="30%" h={10} r={5}/></div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2,3,4].map(i => <Skel key={i} w={i===2?100:36} h={36} r={9}/>)}
          </div>
        </div>
      )}
    </div>
  )
}