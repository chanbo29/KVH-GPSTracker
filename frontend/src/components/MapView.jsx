import { useEffect, useRef, useState } from 'react'

const SC = { moving: '#22C55E', stopped: '#F59E0B', parked: '#EF4444' }
const SB = { moving: '#22C55E18', stopped: '#F59E0B18', parked: '#EF444418' }
const SI = { moving: '⚡', stopped: '⏸', parked: '🅿' }

const DARK_STYLE = [
  { featureType: 'water',     elementType: 'geometry',         stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'landscape', elementType: 'geometry',         stylers: [{ color: '#1a2535' }] },
  { featureType: 'road',      elementType: 'geometry',         stylers: [{ color: '#253448' }] },
  { featureType: 'road',      elementType: 'labels.text.fill', stylers: [{ color: '#6b7f99' }] },
  { featureType: 'poi',       elementType: 'geometry',         stylers: [{ color: '#1e2d3d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#12202f' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8899ab' }] },
]

function infoHTML(v) {
  const sc = SC[v.status]
  return `<div style="font-family:system-ui;padding:14px;min-width:210px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f0f0f0">
      <span style="font-size:22px">${v.type === 'car' ? '🚗' : '🏍️'}</span>
      <div>
        <div style="font-weight:700;font-size:14px;color:#0F172A">${v.name}</div>
        <div style="font-size:11px;color:#64748B">${v.plate} · ${v.owner}</div>
      </div>
    </div>
    <div style="background:#F8FAFC;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-family:monospace;font-size:11px;color:#475569">📡 ${v.imei}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <div style="background:#F8FAFC;border-radius:6px;padding:6px 8px"><div style="color:#94A3B8;font-size:10px">Speed</div><div style="font-weight:700;font-size:13px;color:#0F172A">${Math.round(v.speed ?? 0)} km/h</div></div>
      <div style="background:#F8FAFC;border-radius:6px;padding:6px 8px"><div style="color:#94A3B8;font-size:10px">Battery</div><div style="font-weight:700;font-size:13px;color:#0F172A">${v.battery}%</div></div>
    </div>
    <div style="text-align:center;padding:5px;border-radius:6px;background:${sc}15;color:${sc};font-size:11px;font-weight:700">${SI[v.status]} ${v.status?.toUpperCase()}</div>
  </div>`
}

export default function MapView({ vehicles, selected, onSelect, screen, onScreenChange }) {
  const mapEl   = useRef(null)
  const gmap    = useRef(null)
  const markers = useRef({})
  const infoWin = useRef(null)
  const [keyInput, setKeyInput] = useState('')

  useEffect(() => {
    vehicles.forEach(v => {
      if (markers.current[v.imei] && window.google?.maps && v.lat != null)
        markers.current[v.imei].setPosition({ lat: v.lat, lng: v.lng })
    })
  }, [vehicles])

  const initMap = (list) => {
    if (!mapEl.current || !window.google?.maps) return
    const g = new window.google.maps.Map(mapEl.current, {
      center: { lat: 11.5564, lng: 104.9282 }, zoom: 13,
      streetViewControl: false, styles: DARK_STYLE,
    })
    gmap.current  = g
    infoWin.current = new window.google.maps.InfoWindow()
    list.forEach(v => addMarker(v, g))
  }

  const addMarker = (v, mapInstance) => {
    if (!window.google?.maps || v.lat == null) return
    const map = mapInstance || gmap.current
    if (!map) return
    const marker = new window.google.maps.Marker({
      position: { lat: v.lat, lng: v.lng }, map, title: v.name,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 13, fillColor: v.type === 'car' ? '#3B82F6' : '#8B5CF6', fillOpacity: 1, strokeColor: v.status === 'moving' ? '#FFF' : '#94A3B8', strokeWeight: 2 },
      label: { text: v.type === 'car' ? 'C' : 'M', color: 'white', fontSize: '10px', fontWeight: 'bold' },
      animation: v.status === 'moving' ? window.google.maps.Animation.BOUNCE : null,
    })
    if (v.status === 'moving') setTimeout(() => marker.setAnimation(null), 1400)
    marker.addListener('click', () => { infoWin.current.setContent(infoHTML(v)); infoWin.current.open(map, marker); onSelect(v) })
    markers.current[v.imei] = marker
  }

  useEffect(() => {
    if (screen !== 'map' || !gmap.current) return
    vehicles.forEach(v => { if (!markers.current[v.imei]) addMarker(v) })
    Object.keys(markers.current).forEach(imei => {
      if (!vehicles.find(v => v.imei === imei)) { markers.current[imei].setMap(null); delete markers.current[imei] }
    })
  }, [vehicles, screen])

  const loadGoogleMaps = (key) => {
    if (window.google?.maps) { initMap(vehicles); return }
    window.__gpsInit = () => initMap(vehicles)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__gpsInit`
    s.async = true; s.defer = true
    s.onerror = () => alert('⚠️ Invalid API key or Maps API not enabled.')
    document.head.appendChild(s)
  }

  useEffect(() => {
    if (!selected || !gmap.current || !window.google?.maps || selected.lat == null) return
    gmap.current.panTo({ lat: selected.lat, lng: selected.lng })
    gmap.current.setZoom(16)
    if (markers.current[selected.imei]) { infoWin.current.setContent(infoHTML(selected)); infoWin.current.open(gmap.current, markers.current[selected.imei]) }
  }, [selected])

  const stats = { moving: vehicles.filter(v => v.status === 'moving').length, stopped: vehicles.filter(v => v.status === 'stopped').length, parked: vehicles.filter(v => v.status === 'parked').length }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

      {screen === 'key' && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#090E1A,#0D1525)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0D1525', borderRadius: '20px', padding: '36px', width: '380px', border: '1px solid #1E2D45' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '52px', marginBottom: '12px' }}>🗺️</div>
              <h2 style={{ color: '#E2E8F0', margin: '0 0 8px', fontSize: '20px', fontWeight: '700' }}>Connect Google Maps</h2>
              <p style={{ color: '#475569', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>Enter your <span style={{ color: '#3B82F6' }}>Google Maps API key</span> to display vehicle locations.</p>
            </div>
            <label style={{ color: '#475569', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '6px' }}>API KEY</label>
            <input type="text" placeholder="AIzaSy…" value={keyInput} onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && keyInput.trim()) { onScreenChange('map'); setTimeout(() => loadGoogleMaps(keyInput.trim()), 80) }}}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #1E2D45', background: '#060B15', color: '#CBD5E1', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            <button onClick={() => { if (keyInput.trim()) { onScreenChange('map'); setTimeout(() => loadGoogleMaps(keyInput.trim()), 80) }}}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', background: 'linear-gradient(135deg,#3B82F6,#6366F1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>
              🚀 Load Google Maps
            </button>
            <button onClick={() => onScreenChange('demo')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'transparent', color: '#475569', border: '1px solid #1E2D45', cursor: 'pointer', fontSize: '13px' }}>
              Skip → Demo Mode
            </button>
          </div>
        </div>
      )}

      {screen === 'demo' && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#090E1A,#0D1525)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '64px' }}>🛰️</div>
          <h2 style={{ color: '#94A3B8', fontWeight: '600' }}>Demo Mode</h2>
          <p style={{ color: '#334155', textAlign: 'center', lineHeight: '1.7' }}>Data is live from your KVH-GPSTracker SQL Server database.<br />Select a vehicle in the sidebar to see its details.</p>
          {selected && selected.lat != null && (
            <div style={{ background: '#0D1525', border: '1px solid #1E2D45', borderRadius: '14px', padding: '20px', width: '300px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '26px' }}>{selected.type === 'car' ? '🚗' : '🏍️'}</span>
                <div><div style={{ color: '#E2E8F0', fontWeight: '700' }}>{selected.name}</div><div style={{ color: '#475569', fontSize: '12px' }}>{selected.plate}</div></div>
              </div>
              <div style={{ background: '#060B15', borderRadius: '8px', padding: '7px 10px', marginBottom: '10px' }}>
                <div style={{ color: '#334155', fontSize: '9px', fontWeight: '700', marginBottom: '2px' }}>IMEI</div>
                <div style={{ color: '#64748B', fontSize: '12px', fontFamily: 'monospace' }}>{selected.imei}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[{ l: 'Speed', v: `${Math.round(selected.speed ?? 0)} km/h`, c: selected.status === 'moving' ? '#22C55E' : '#64748B' }, { l: 'Status', v: selected.status, c: SC[selected.status] }, { l: 'Latitude', v: selected.lat?.toFixed(5), c: '#64748B' }, { l: 'Longitude', v: selected.lng?.toFixed(5), c: '#64748B' }].map(i => (
                  <div key={i.l} style={{ background: '#060B15', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ color: '#334155', fontSize: '9px' }}>{i.l}</div>
                    <div style={{ color: i.c, fontWeight: '600', fontSize: '12px' }}>{i.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => onScreenChange('key')} style={{ padding: '11px 24px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            🗺️ Enter Google Maps API Key
          </button>
        </div>
      )}

      <div ref={mapEl} style={{ width: '100%', height: '100%', display: screen === 'map' ? 'block' : 'none' }} />

      {screen === 'map' && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', background: '#0D152590', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '10px 16px', border: '1px solid #1E2D45', display: 'flex', alignItems: 'center', gap: '14px' }}>
          {[{ dot: '#22C55E', l: `${stats.moving} Moving` }, { dot: '#F59E0B', l: `${stats.stopped} Stopped` }, { dot: '#EF4444', l: `${stats.parked} Parked` }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <div style={{ width: '1px', height: '14px', background: '#1E2D45', marginRight: '8px' }} />}
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
              <span style={{ color: '#94A3B8', fontSize: '12px' }}>{s.l}</span>
            </div>
          ))}
        </div>
      )}

      {selected && screen === 'map' && (
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', background: '#0D152595', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '20px', width: '250px', border: '1px solid #1E2D45' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '22px' }}>{selected.type === 'car' ? '🚗' : '🏍️'}</span>
              <div><div style={{ color: '#E2E8F0', fontWeight: '700', fontSize: '13px' }}>{selected.name}</div><div style={{ color: '#475569', fontSize: '11px' }}>{selected.owner}</div></div>
            </div>
            <button onClick={() => onSelect(null)} style={{ background: '#1E2D45', border: 'none', borderRadius: '6px', color: '#64748B', cursor: 'pointer', padding: '4px 7px' }}>✕</button>
          </div>
          <div style={{ background: '#060B1590', borderRadius: '8px', padding: '7px 10px', marginBottom: '10px' }}>
            <div style={{ color: '#334155', fontSize: '9px', fontWeight: '700', marginBottom: '2px' }}>IMEI</div>
            <div style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>{selected.imei}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
            {[{ l: 'Speed', v: `${Math.round(selected.speed ?? 0)} km/h`, c: selected.status === 'moving' ? '#22C55E' : '#94A3B8' }, { l: 'Plate', v: selected.plate, c: '#94A3B8' }, { l: 'Latitude', v: selected.lat?.toFixed(5), c: '#64748B' }, { l: 'Longitude', v: selected.lng?.toFixed(5), c: '#64748B' }].map(i => (
              <div key={i.l} style={{ background: '#060B1590', borderRadius: '8px', padding: '7px 8px' }}>
                <div style={{ color: '#334155', fontSize: '9px', marginBottom: '2px' }}>{i.l}</div>
                <div style={{ color: i.c, fontWeight: '600', fontSize: '11px' }}>{i.v}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '7px', borderRadius: '8px', background: SB[selected.status], color: SC[selected.status], fontSize: '11px', fontWeight: '700' }}>
            {SI[selected.status]} {selected.status?.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}
