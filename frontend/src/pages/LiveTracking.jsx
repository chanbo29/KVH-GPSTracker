import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Car, Navigation, Wifi, WifiOff, Battery, Gauge,
  MapPin, X, RefreshCw, Users, Search,
  ChevronLeft, ChevronRight, ChevronDown, User, Layers, Clock,
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
  moving:      { color:T.green, bg:T.greenL, dot:'#22C55E', label:'Moving'      },
  stopped:     { color:T.amber, bg:T.amberL, dot:'#F59E0B', label:'Stopped'     },
  stopped_long:{ color:T.red,   bg:'#FEE2E2', dot:'#EF4444', label:'Stopped 24h+' },
  offline:     { color:T.grey,  bg:T.greyL,  dot:'#CBD5E1', label:'Offline'     },
}
const st = s => STATUS[s] || STATUS.offline

// How long a "stopped" vehicle has to have held that status before its
// color escalates from yellow to red -- a quick roadside stop looks very
// different from a vehicle that's been sitting for over a day.
const STOPPED_LONG_HOURS = 24

// The single color-coded status key every part of this page uses for
// display: green while actually moving, grey the moment the backend has no
// recent ping (live_status, computed server-side from GPS freshness --
// falls back to the raw `status` field for any older API response that
// doesn't have it yet), amber for a recent stop, escalating to red once
// that stop has lasted STOPPED_LONG_HOURS or more.
function dispStatus(v) {
  const live = v.live_status || v.status
  if (live === 'offline') return 'offline'
  if (live === 'moving')  return 'moving'
  const ms = v.status_since ? Date.now() - new Date(v.status_since).getTime() : 0
  return (isFinite(ms) && ms >= STOPPED_LONG_HOURS * 3600000) ? 'stopped_long' : 'stopped'
}

// "Stopped 7s" / "Stopped 23m" / "Stopped 1h 12m" / "Stopped 2d 4h" — how
// long the vehicle has held its current status, from Vehicle.status_since.
// Real seconds under a minute (not a vague "<1m") so it visibly ticks up
// live, second by second, right after a vehicle stops.
function sinceLabel(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (!isFinite(ms) || ms < 0) return ''
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
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

// GPS noise: a parked device still reports a few meters of drift on every
// fix, which used to make the "stationary" pin visibly wobble left/right on
// every 5s sync. Below this radius, and only while not actually moving, we
// just keep showing the last displayed point instead of chasing the noise.
const JITTER_METERS = 15
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Reverse geocoding: turns a vehicle's raw lat/lng into a short human
// address ("Street, City") using the same Google Maps JS API already
// loaded for the map, via its client-side Geocoder. Cached by a coarse
// (~11m) rounding of the coordinates so a stationary vehicle's tiny GPS
// jitter doesn't trigger a fresh lookup on every poll.
const geocodeCache = {}
function reverseGeocode(lat, lng, cb) {
  if (lat == null || lng == null || !window.google?.maps?.Geocoder) return
  const key = `${(+lat).toFixed(4)},${(+lng).toFixed(4)}`
  if (geocodeCache[key]) { cb(geocodeCache[key]); return }
  if (geocodeCache[key] === null) return // lookup already in flight / failed, don't hammer it
  geocodeCache[key] = null
  const geocoder = new window.google.maps.Geocoder()
  geocoder.geocode({ location: { lat: +lat, lng: +lng } }, (results, status) => {
    if (status === 'OK' && results?.[0]) {
      // Prefer a short, human result over the full formatted address --
      // skip the "plus code"/plain country-only results Google sometimes
      // returns first.
      const best = results.find(r => !/^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/.test(r.formatted_address)) || results[0]
      geocodeCache[key] = best.formatted_address
      cb(best.formatted_address)
    } else {
      delete geocodeCache[key]
    }
  })
}

// Arrow-shaped marker icon, rotated to the vehicle's heading via an SVG
// `transform="rotate(...)"` attribute (works reliably even as a standalone
// data-URI image, unlike a CSS transform on the root <svg>).
function mkIcon(status, course = 0, type = 'car') {
  const color = st(status).color
  const size  = status === 'moving' ? 28 : 22
  const isMoto = /moto|scooter|bike/i.test(type || '')
  // Top-down silhouettes so the marker reads as "a car" or "a motorbike"
  // at a glance, independent of the status color it's painted in.
  const shape = isMoto
    ? `<g transform="rotate(${course} 12 12)">
         <ellipse cx="12" cy="5.5" rx="2.1" ry="2.6" fill="${color}" stroke="white" stroke-width="1.2"/>
         <path d="M10.2 7.5 L8.7 18 M13.8 7.5 L15.3 18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
         <ellipse cx="9.2" cy="19.2" rx="2.3" ry="2.3" fill="${color}" stroke="white" stroke-width="1.2"/>
         <ellipse cx="14.8" cy="19.2" rx="2.3" ry="2.3" fill="${color}" stroke="white" stroke-width="1.2"/>
       </g>`
    : `<g transform="rotate(${course} 12 12)">
         <rect x="6.5" y="2.5" width="11" height="19" rx="3.5" fill="${color}" stroke="white" stroke-width="1.4"/>
         <rect x="8.2" y="5" width="7.6" height="5" rx="1.2" fill="white" fill-opacity="0.55"/>
       </g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${shape}</svg>`
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
  const ds = dispStatus(v)
  const s = st(ds)
  const title = (v.owner && v.owner !== 'Unassigned') ? v.owner : (v.name || 'Vehicle')
  // Only stopped/offline vehicles get a duration; a moving vehicle shows its
  // live speed instead — whichever is the one number that matters right now.
  const info = ds === 'moving'
    ? `${Math.round(v.speed || 0)} km/h`
    : sinceLabel(v.status_since)
  // Small, two-line card: name + status pill, then plate + the one live
  // number (speed or stopped/offline duration) — no coordinates, no second
  // "vehicle name" repeat, so a stacked pair stays compact.
  return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px">
        <span style="font-weight:800;font-size:12px;color:#0F172A;letter-spacing:-.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${title}">${title}</span>
        <span style="display:flex;align-items:center;gap:4px;background:${s.bg};padding:2px 6px;border-radius:20px;flex-shrink:0">
          <span class="${ds==='moving'?'kvh-dot-live':''}" style="width:5px;height:5px;border-radius:50%;background:${s.dot}"></span>
          <span style="font-size:8px;font-weight:700;color:${s.color};text-transform:uppercase;letter-spacing:.4px">${s.label}</span>
        </span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px" title="${v.plate || ''} · ${info}">
        <span style="font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#64748B;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.plate || ''}</span>
        <span style="font-size:10.5px;font-weight:700;color:${s.color};flex-shrink:0">${info}</span>
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
    constructor(map, position, html, color) {
      super()
      this.position = position
      this.div   = null   // positioned wrapper (no visual style)
      this.card  = null   // persistent .kvh-bubble element — created once,
                           // so its entrance animation plays only on first
                           // fix for this vehicle, not on every data refresh
      this.html  = html
      this.color = color || '#1B6BB5'
      this.setMap(map)
    }
    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      // No transition by default — draw() fires on every map pan/zoom too
      // (Maps calls it whenever the projection changes), and animating that
      // makes the bubble visibly lag behind the pin while dragging the map.
      // Position only eases when update() hands it a genuinely new GPS fix.
      div.style.transition = 'none'
      div.style.zIndex = '45'

      const card = document.createElement('div')
      card.className = 'kvh-bubble'
      card.innerHTML = this.html
      div.appendChild(card)

      // Solid, color-matched line (with a white halo so it reads against any
      // map imagery) from the bubble down to its real pin, plus a small dot
      // right at the pin — only shown once this label has been lifted above
      // a neighboring one (see setLift). Makes it unmistakable which pin a
      // stacked label belongs to.
      const connector = document.createElement('div')
      connector.style.position = 'absolute'
      connector.style.width = '3px'
      connector.style.borderRadius = '2px'
      connector.style.background = this.color
      connector.style.boxShadow = '0 0 0 1.5px rgba(255,255,255,.95)'
      connector.style.pointerEvents = 'none'
      connector.style.zIndex = '44'
      connector.style.display = 'none'

      const anchorDot = document.createElement('div')
      anchorDot.style.position = 'absolute'
      anchorDot.style.width = '9px'
      anchorDot.style.height = '9px'
      anchorDot.style.borderRadius = '50%'
      anchorDot.style.background = this.color
      anchorDot.style.border = '2px solid white'
      anchorDot.style.boxShadow = '0 1px 4px rgba(0,0,0,.35)'
      anchorDot.style.pointerEvents = 'none'
      anchorDot.style.zIndex = '44'
      anchorDot.style.display = 'none'

      this.div       = div
      this.card      = card
      this.connector = connector
      this.anchorDot = anchorDot
      this.lift      = 0
      this.applyTransform()
      this.getPanes().floatPane.appendChild(connector)
      this.getPanes().floatPane.appendChild(anchorDot)
      this.getPanes().floatPane.appendChild(div)
      this.draw()
    }
    applyTransform() {
      if (!this.div) return
      this.div.style.transform = `translate(-50%, calc(-100% - ${15 + this.lift}px))`
    }
    draw() {
      if (!this.div) return
      const proj = this.getProjection()
      if (!proj) return
      const pt = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(this.position))
      if (!pt) return
      this.div.style.left = pt.x + 'px'
      this.div.style.top = pt.y + 'px'
      if (this.div) this.div.style.display = this.visible === false ? 'none' : ''
      const showStack = this.lift > 6 && this.visible !== false
      if (this.connector) {
        this.connector.style.left = pt.x + 'px'
        this.connector.style.transform = 'translateX(-50%)'
        if (showStack) {
          this.connector.style.display = 'block'
          this.connector.style.top = (pt.y - 15 - this.lift) + 'px'
          this.connector.style.height = (this.lift + 10) + 'px'
        } else {
          this.connector.style.display = 'none'
        }
      }
      if (this.anchorDot) {
        this.anchorDot.style.left = pt.x + 'px'
        this.anchorDot.style.top  = pt.y + 'px'
        this.anchorDot.style.transform = 'translate(-50%, -50%)'
        this.anchorDot.style.display = showStack ? 'block' : 'none'
      }
    }
    // Raises this label `px` above its normal spot (stacking it clear of a
    // neighboring label at the same screen position) and grows the dashed
    // connector down to the real pin to match.
    setLift(px) {
      if (this.lift === px) return
      this.lift = px
      this.applyTransform()
      this.draw()
    }
    update(position, html) {
      this.position = position
      if (this.card) this.card.innerHTML = html
      if (this.div) {
        this.div.style.transition = 'left .45s cubic-bezier(.4,0,.2,1), top .45s cubic-bezier(.4,0,.2,1)'
        clearTimeout(this._transTimer)
        this._transTimer = setTimeout(() => { if (this.div) this.div.style.transition = 'none' }, 480)
      }
      this.draw()
    }
    // Lightweight text-only refresh for the once-a-second "stopped Xs" tick
    // -- unlike update(), doesn't touch position or restart the move
    // transition, since nothing but the duration text actually changed.
    retext(html) {
      if (this.card) this.card.innerHTML = html
    }
    // Show/hide the floating bubble without destroying it -- used by the
    // sidebar's per-vehicle checkboxes so unchecked vehicles keep their map
    // pin but stop cluttering the map with a label.
    setVisible(visible) {
      this.visible = visible
      this.draw()
    }
    onRemove() {
      clearTimeout(this._transTimer)
      if (this.div?.parentNode) this.div.parentNode.removeChild(this.div)
      if (this.connector?.parentNode) this.connector.parentNode.removeChild(this.connector)
      if (this.anchorDot?.parentNode) this.anchorDot.parentNode.removeChild(this.anchorDot)
      this.div = null
      this.card = null
      this.connector = null
      this.anchorDot = null
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
  // Reverse-geocoded address for whichever vehicle is selected -- re-looked
  // up only when its (rounded) position actually changes, not on every 5s
  // poll, to keep from spamming the Geocoder API.
  const [selAddress, setSelAddress] = useState('')
  useEffect(() => {
    if (!selected?.lat || !selected?.lng || parseFloat(selected.lat) === 0) {
      setSelAddress('')
      return
    }
    reverseGeocode(selected.lat, selected.lng, addr => setSelAddress(addr))
  }, [selected?.imei, selected?.lat && (+selected.lat).toFixed(4), selected?.lng && (+selected.lng).toFixed(4)])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  // Which vehicles' floating map labels are checked "on" in the sidebar
  // (Traccar-style multi-select) -- unchecking a vehicle hides its label
  // clutter on the map while leaving its colored pin in place. Empty set
  // means "show every label", so a fresh session looks exactly as before.
  const [hiddenLabels, setHiddenLabels] = useState(() => new Set())
  const hiddenLabelsRef = useRef(hiddenLabels)
  useEffect(() => {
    hiddenLabelsRef.current = hiddenLabels
    Object.keys(infoWins.current).forEach(imei => {
      infoWins.current[imei]?.setVisible(!hiddenLabels.has(imei))
    })
  }, [hiddenLabels])
  const toggleLabel = (imei) => {
    setHiddenLabels(prev => {
      const next = new Set(prev)
      if (next.has(imei)) next.delete(imei); else next.add(imei)
      return next
    })
  }
  // Fleet groups/folders (Vehicle.group) collapsed in the sidebar -- empty
  // set means every group starts expanded.
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())
  const toggleGroupCollapsed = (name) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }
  // Ticks once a second so every on-screen "stopped Xs"/"moving Xs" duration
  // visibly counts up in real time, independent of the 5s data-poll cycle.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mapRef     = useRef(null)
  const gmap       = useRef(null)
  const markers    = useRef({})
  const pulses     = useRef({})
  const infoWins   = useRef({})   // one VehicleLabel overlay per vehicle, always visible
  const trailLines = useRef({})   // one forward-only route polyline per currently-moving vehicle
  const trailPoints = useRef({})  // accumulated live points per vehicle, keyed by imei
  const vehiclesRef = useRef([])  // latest fleet data, read from map event listeners/timers
  useEffect(() => { vehiclesRef.current = vehicles }, [vehicles])

  // Re-stamp every floating label's text once a second so a stopped/offline
  // vehicle's "Xs"/"Xm" duration visibly ticks up live, without waiting for
  // the next 5s GPS poll and without re-animating the pin's position.
  useEffect(() => {
    vehiclesRef.current.forEach(v => {
      const win = infoWins.current[v.imei]
      if (win) win.retext(mkInfoHtml(v))
    })
  }, [tick])

  // Route trail: every vehicle gets its own trail automatically the instant
  // it's moving -- no click needed, so it's already there the moment you
  // open the app. It starts EMPTY the moment a vehicle starts moving (no
  // earlier history) and is built up live, point by point, in syncMarkers
  // as fresh GPS fixes arrive. The instant that vehicle stops, its trail is
  // removed, so the next time it moves it starts a clean new line rather
  // than reusing an old route.

  // When two or more vehicles are close enough together on screen that their
  // always-on labels would collide, don't hide anyone's info — stack the
  // labels instead, each one lifted clear of the last, so every vehicle's
  // real details stay visible no matter how far you zoom out. A dashed
  // line ties a lifted label back down to its actual pin.
  const declutterLabels = useCallback(() => {
    const entries = Object.entries(infoWins.current)
    if (entries.length === 0) return
    const proj = entries[0][1]?.getProjection?.()
    if (!proj) return

    const pts = entries.map(([imei, label]) => {
      const v = vehiclesRef.current.find(v => v.imei === imei)
      if (!v || !v.lat || parseFloat(v.lat) === 0) return null
      const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(parseFloat(v.lat), parseFloat(v.lng)))
      return p ? { imei, v, x: p.x, y: p.y } : null
    }).filter(Boolean)

    // Union-find: group any vehicles whose pins are within CLUSTER_PX of
    // each other on screen (chains through intermediate members too).
    const CLUSTER_PX = 70
    const parent = {}
    pts.forEach(p => { parent[p.imei] = p.imei })
    const find  = id => parent[id] === id ? id : (parent[id] = find(parent[id]))
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < CLUSTER_PX) union(pts[i].imei, pts[j].imei)
      }
    }
    const groups = {}
    pts.forEach(p => { const r = find(p.imei); (groups[r] = groups[r] || []).push(p) })

    // Roughly one bubble's height + a small gap — enough vertical room
    // that a stacked label clears the one below it.
    const LIFT_STEP = 58
    Object.values(groups).forEach(members => {
      // Stable order (by imei) so stacking order doesn't flicker between refreshes
      members.sort((a, b) => a.imei.localeCompare(b.imei))
      members.forEach((m, i) => infoWins.current[m.imei]?.setLift(i * LIFT_STEP))
    })
  }, [])
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
      const rawLat = parseFloat(v.lat||0), rawLng = parseFloat(v.lng||0)
      if (!rawLat && !rawLng) return
      const isMoving = dispStatus(v) === 'moving'

      // Smooth out GPS jitter while stationary: only adopt the new fix if
      // it's actually moving, or it moved more than the noise floor.
      let lat = rawLat, lng = rawLng
      const existing = markers.current[v.imei]
      if (existing && !isMoving) {
        const cur = existing.getPosition()
        const movedMeters = haversineMeters(cur.lat(), cur.lng(), rawLat, rawLng)
        if (movedMeters < JITTER_METERS) { lat = cur.lat(); lng = cur.lng() }
      }

      // Route trail: automatic for every moving vehicle, no selection
      // needed. Start a fresh empty line the moment a vehicle begins
      // moving; feed it live points (skipping near-identical fixes so it
      // doesn't fill up with overlapping points); remove it the instant
      // the vehicle stops, so the next move starts a clean new trail.
      if (isMoving) {
        if (!trailLines.current[v.imei]) {
          const color = st('moving').color
          trailLines.current[v.imei] = new window.google.maps.Polyline({
            path: [], map: gmap.current,
            strokeColor: color, strokeOpacity: 0.9, strokeWeight: 4,
            icons: [{ icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4, strokeColor: color }, offset: '100%' }],
          })
          trailPoints.current[v.imei] = []
        }
        const pts = trailPoints.current[v.imei]
        const last = pts[pts.length - 1]
        if (!last || haversineMeters(last.lat, last.lng, lat, lng) >= 5) {
          pts.push({ lat, lng })
          trailLines.current[v.imei].setPath(pts)
        }
      } else if (trailLines.current[v.imei]) {
        trailLines.current[v.imei].setMap(null)
        delete trailLines.current[v.imei]
        delete trailPoints.current[v.imei]
      }

      const icon = mkIcon(dispStatus(v), v.course||0, v.type)
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
        infoWins.current[v.imei] = new LabelCls(gmap.current, { lat, lng }, mkInfoHtml(v), st(dispStatus(v)).color)
        infoWins.current[v.imei].setVisible(!hiddenLabelsRef.current.has(v.imei))
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
  useEffect(()=>{
    if (!gmap.current) return
    const id = gmap.current.addListener('idle', () => setTimeout(declutterLabels, 30))
    return () => id.remove()
  }, [mapReady, declutterLabels])
  useEffect(()=>{
    if (!mapReady) return
    syncMarkers(vehicles)
    setTimeout(declutterLabels, 60)
  }, [mapReady, vehicles, declutterLabels])
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
    const id=setInterval(async()=>{const d=await fetch();syncMarkers(d);setTimeout(declutterLabels,60)},5000)
    return()=>clearInterval(id)
  },[fetch,syncMarkers,declutterLabels])

  const focus = v => {
    setSelected(v)
    if(gmap.current&&v.lat&&parseFloat(v.lat)!==0){
      gmap.current.panTo({ lat:parseFloat(v.lat), lng:parseFloat(v.lng) })
      gmap.current.setZoom(16)
    }
  }

  // Zoom/pan to frame every vehicle that currently has a GPS fix, so the
  // whole fleet is visible in one glance instead of hunting around the map.
  const fitAll = () => {
    if (!gmap.current || !window.google?.maps) return
    const withFix = vehicles.filter(v => v.lat && parseFloat(v.lat) !== 0)
    if (withFix.length === 0) return
    if (withFix.length === 1) {
      gmap.current.panTo({ lat:parseFloat(withFix[0].lat), lng:parseFloat(withFix[0].lng) })
      gmap.current.setZoom(16)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    withFix.forEach(v => bounds.extend({ lat:parseFloat(v.lat), lng:parseFloat(v.lng) }))
    gmap.current.fitBounds(bounds, { top:60, right:60, bottom:60, left:open?60:60 })
  }

  const list        = vehicles.filter(v=>(filter==='all'||dispStatus(v)===filter)&&(!search||v.name?.toLowerCase().includes(search.toLowerCase())||v.plate?.toLowerCase().includes(search.toLowerCase())||v.owner?.toLowerCase().includes(search.toLowerCase())))
  // Fleet groups/folders, in first-seen order with "Ungrouped" always last
  // so a fleet that hasn't set up custom groups yet looks unchanged.
  const groupNames = (() => {
    const seen = []
    list.forEach(v => { const g = v.group || 'Ungrouped'; if (!seen.includes(g)) seen.push(g) })
    seen.sort((a,b) => a==='Ungrouped' ? 1 : b==='Ungrouped' ? -1 : a.localeCompare(b))
    return seen
  })()
  const moving      = vehicles.filter(v=>dispStatus(v)==='moving').length
  const stopped     = vehicles.filter(v=>dispStatus(v)==='stopped').length
  const stoppedLong = vehicles.filter(v=>dispStatus(v)==='stopped_long').length
  const offline     = vehicles.filter(v=>dispStatus(v)==='offline').length

  // One vehicle-list row — shared by the flat list (a status filter is
  // active) and the grouped view (Moving/Stopped/Offline sections, shown
  // when filter is "All" so a busy fleet is easier to scan at a glance).
  const renderRow = v => {
    const ds   = dispStatus(v)
    const s    = st(ds)
    const isSel= selected?.imei === v.imei
    const hasDriver = v.owner && v.owner !== 'Unassigned'
    return (
      <div key={v.imei}
        className={isSel?'':'kvh-vrow'}
        onClick={()=>focus(v)}
        style={{ padding:'12px 12px', marginBottom:5, borderRadius:12, cursor:'pointer',
          background: isSel ? T.blueL : 'white',
          border:     isSel ? `1.5px solid ${T.blue}` : '1.5px solid '+T.border,
          boxShadow:  isSel ? `0 2px 12px rgba(27,107,181,.12)` : '0 1px 2px rgba(0,0,0,.04)',
        }}>

        <div style={{ display:'flex', alignItems:'center', gap:11 }}>

          {/* Show/hide this vehicle's floating map label -- pin stays put
              either way, this just declutters the map on request. */}
          <input
            type="checkbox"
            checked={!hiddenLabels.has(v.imei)}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleLabel(v.imei)}
            title="Show label on map"
            style={{ flexShrink:0, width:16, height:16, cursor:'pointer', accentColor:T.blue }}
          />

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
            {s.label}{ds !== 'moving' && sinceLabel(v.status_since) ? ' · ' + sinceLabel(v.status_since) : ''}
          </span>
          {v.lat && parseFloat(v.lat) !== 0
            ? <span style={{ fontSize:11, color:T.faint, fontFamily:'monospace' }}>{Number(v.lat).toFixed(4)}, {Number(v.lng).toFixed(4)}</span>
            : <span style={{ fontSize:11, color:'#CBD5E1' }}>No GPS signal</span>
          }
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', fontFamily:"'Inter','Kantumruy Pro',system-ui,-apple-system,sans-serif", overflow:'hidden', display:'flex' }}>
      <style>{`
        @keyframes kvhP    { 0%{transform:scale(.4);opacity:.8} 100%{transform:scale(2.6);opacity:0} }
        @keyframes kvhSpin { to{transform:rotate(360deg)} }
        @keyframes kvhSlide{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .kvh-sc::-webkit-scrollbar{width:3px}
        .kvh-sc::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        .kvh-vrow:hover{ background:#F8FAFC !important; border-color:#E2E8F0 !important; transform:translateY(-1px); box-shadow:0 4px 14px rgba(15,23,42,.08) !important; }
        .kvh-vrow{ transition:all .15s ease; }

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
          font-family:'Inter','Kantumruy Pro',system-ui,-apple-system,sans-serif;
          min-width:128px;
          background:#fff;
          border-radius:10px;
          padding:7px 9px 6px;
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {[
                ['MOVING',  moving,      T.green, T.greenL, '#BBF7D0', 'moving'      ],
                ['STOPPED', stopped,     T.amber, T.amberL, '#FDE68A', 'stopped'     ],
                ['24H+',    stoppedLong, T.red,   '#FEE2E2', '#FECACA','stopped_long'],
                ['OFFLINE', offline,     T.grey,  T.greyL,  '#E2E8F0', 'offline'     ],
              ].map(([l,v,c,bg,bd,id])=>(
                <button key={l} onClick={()=>setFilter(filter===id?'all':id)}
                  style={{ borderRadius:10, padding:'10px 4px', textAlign:'center', border:`1.5px solid ${filter===id?c:bd}`, cursor:'pointer', background:filter===id?c:bg, transition:'all .15s' }}>
                  <div style={{ fontWeight:800, fontSize:18, lineHeight:1, color:filter===id?'white':c }}>{v}</div>
                  <div style={{ fontSize:8.5, color:filter===id?'rgba(255,255,255,.75)':T.muted, marginTop:4, fontWeight:700, letterSpacing:.3 }}>{l}</div>
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
              {[['all','All'],['moving','Moving'],['stopped','Stopped'],['stopped_long','24h+'],['offline','Offline']].map(([id,l])=>(
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
            ) : (
              groupNames.map(gname => {
                const groupList = list.filter(v => (v.group || 'Ungrouped') === gname)
                if (groupList.length === 0) return null
                const collapsed = collapsedGroups.has(gname)
                return (
                  <div key={gname} style={{ marginBottom:6 }}>
                    {/* Fleet group/folder header -- click to collapse/expand */}
                    <div onClick={()=>toggleGroupCollapsed(gname)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 6px', cursor:'pointer', userSelect:'none', borderRadius:8 }}>
                      {collapsed ? <ChevronRight size={13} color={T.muted}/> : <ChevronDown size={13} color={T.muted}/>}
                      <Layers size={12} color={T.muted}/>
                      <span style={{ fontSize:11.5, fontWeight:800, color:T.navy }}>{gname}</span>
                      <span style={{ fontSize:11, color:T.faint }}>({groupList.length})</span>
                    </div>
                    {!collapsed && (filter !== 'all' ? groupList.map(renderRow) : (
                      [['moving','Moving'],['stopped','Stopped'],['stopped_long','Stopped 24h+'],['offline','Offline']].map(([key,label]) => {
                        const sub = groupList.filter(v => dispStatus(v) === key)
                        if (sub.length === 0) return null
                        return (
                          <div key={key} style={{ marginBottom:4, paddingLeft:6 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 4px 6px' }}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:st(key).dot, flexShrink:0 }}/>
                              <span style={{ fontSize:10, fontWeight:700, color:T.faint, letterSpacing:.6, textTransform:'uppercase' }}>{label}</span>
                              <span style={{ fontSize:10, color:T.faint }}>· {sub.length}</span>
                            </div>
                            {sub.map(renderRow)}
                          </div>
                        )
                      })
                    ))}
                  </div>
                )
              })
            )}
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

        {/* ── Map toolbar: satellite toggle + fit-all-vehicles ──── */}
        {mapReady && (
          <div style={{ position:'absolute', left:16, bottom:20, zIndex:40, display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={toggleSat} title={sat?'Satellite view on':'Switch to satellite view'}
              style={{ width:42, height:42, borderRadius:10, border:'none', background:sat?T.blue:'white', color:sat?'white':T.navy, boxShadow:'0 2px 10px rgba(0,0,0,.18)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'transform .15s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <Layers size={17}/>
            </button>
            <button onClick={fitAll} title="Fit all vehicles in view"
              style={{ width:42, height:42, borderRadius:10, border:'none', background:'white', color:T.navy, boxShadow:'0 2px 10px rgba(0,0,0,.18)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'transform .15s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <Navigation size={16}/>
            </button>
          </div>
        )}

        {/* ── Selected vehicle card ─────────────────────── */}
        {selected && (() => {
          const selDs = dispStatus(selected)
          const s = st(selDs)
          const hasDriver = selected.owner && selected.owner !== 'Unassigned'
          return (
            <div style={{ position:'absolute', bottom:20, right:20, zIndex:40, width:340, maxWidth:'calc(100vw - 360px)', animation:'kvhSlide .22s ease' }}>
              <div style={{ background:'white', borderRadius:18, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,.16)', border:'1px solid '+T.border }}>

                {/* Navy header */}
                <div style={{ background:T.navy, padding:'14px 16px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>

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
                      {/* Car name + plate — secondary. minWidth:0 + ellipsis on the
                          name/plate text (instead of letting it wrap) is what keeps this
                          row on one line even when the plate + status pill are long. */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, minWidth:0 }}>
                        <Car size={11} color="rgba(255,255,255,.4)" style={{ flexShrink:0 }}/>
                        <span style={{ color:'rgba(255,255,255,.5)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>{selected.name} · {selected.plate}</span>
                        <span style={{ background:`${s.color}22`, color:s.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>{s.label}{selDs !== 'moving' && sinceLabel(selected.status_since) ? ' · ' + sinceLabel(selected.status_since) : ''}</span>
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
                    <span style={{ marginLeft:'auto', fontSize:12, color:T.muted }}>{selDs==='moving'?'En route':'Stationary'}</span>
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

                  {/* Address / Time / Stop duration -- Traccar-style detail rows */}
                  {selected.lat && parseFloat(selected.lat) !== 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'9px 12px', background:T.blueL, borderRadius:10, border:`1px solid ${T.blue}22` }}>
                        <MapPin size={13} color={T.blue} style={{ marginTop:2, flexShrink:0 }}/>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:.4, marginBottom:2 }}>Address</div>
                          <div style={{ fontSize:12.5, color:T.navy, fontWeight:600 }}>
                            {selAddress || `${Number(selected.lat).toFixed(6)}, ${Number(selected.lng).toFixed(6)}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:T.bg, borderRadius:10, border:'1px solid '+T.border }}>
                        <Clock size={13} color={T.muted} style={{ flexShrink:0 }}/>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:.4, marginBottom:2 }}>Time</div>
                          <div style={{ fontSize:12.5, color:T.navy, fontWeight:600 }}>
                            {selected.last_update ? new Date(selected.last_update).toLocaleString() : '—'}
                          </div>
                        </div>
                      </div>
                      {selDs !== 'moving' && (
                        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:s.bg, borderRadius:10, border:`1px solid ${s.color}33` }}>
                          <Navigation size={13} color={s.color} style={{ flexShrink:0 }}/>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.4, marginBottom:2 }}>Stop duration</div>
                            <div style={{ fontSize:12.5, color:s.color, fontWeight:700 }}>
                              {sinceLabel(selected.status_since) || '—'}
                            </div>
                          </div>
                        </div>
                      )}
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