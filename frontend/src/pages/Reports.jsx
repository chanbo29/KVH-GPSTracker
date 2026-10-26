import { useState, useEffect, useMemo } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import { C }       from '../constants/colors.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import { Spinner, LoadingBar } from '../components/Loading.jsx'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Download, Calendar, Car, AlertTriangle,
  TrendingUp, Clock, Gauge, MapPin,
  ChevronDown, Filter, RefreshCw,
} from 'lucide-react'

const BORDER = '1px solid #E2E8F0'
const RANGES = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom']

const ALERT_COLORS = {
  Overspeed:       '#DC2626',
  'Geofence Entry':'#F59E0B',
  'Geofence Exit': '#F59E0B',
  Offline:         '#6B7280',
  'Low Battery':   '#7C3AED',
  'Night Driving': '#0891B2',
}
const fallbackColor = '#94A3B8'

/* ── Date range helpers ───────────────────────────────────────── */
const fmtDate = d => d.toISOString().slice(0, 10)
const dayLabel = dateStr => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })

function getRangeDates(range, dateFrom, dateTo) {
  const today = new Date()
  const days = []
  if (range === 'Today') {
    days.push(fmtDate(today))
  } else if (range === 'Last 7 Days') {
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(fmtDate(d)) }
  } else if (range === 'Last 30 Days') {
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(fmtDate(d)) }
  } else if (range === 'This Month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) days.push(fmtDate(new Date(d)))
  } else if (range === 'Custom' && dateFrom && dateTo) {
    for (let d = new Date(dateFrom); d <= new Date(dateTo); d.setDate(d.getDate() + 1)) days.push(fmtDate(new Date(d)))
  }
  return days
}

/* ── Distance between two GPS points (km), haversine ─────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const MOVING_SPEED_THRESHOLD = 3   // km/h — below this counts as "stopped" (filters GPS jitter)
const STOP_GAP_POINTS        = 2   // consecutive stopped readings before a trip is considered ended

/* ── Turn a sorted list of raw GPS log points into discrete trips ── */
function computeTrips(logs) {
  const trips = []
  let movingSeconds = 0, stoppedSeconds = 0
  let current = null
  let stopStreak = 0

  for (let i = 0; i < logs.length; i++) {
    const p = logs[i]
    const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude), speed = parseFloat(p.speed) || 0
    const t = new Date(p.timestamp)
    const prev = logs[i-1]

    if (prev) {
      const dt = (t - new Date(prev.timestamp)) / 1000
      if (speed > MOVING_SPEED_THRESHOLD) movingSeconds += Math.max(dt, 0)
      else stoppedSeconds += Math.max(dt, 0)
    }

    if (speed > MOVING_SPEED_THRESHOLD) {
      stopStreak = 0
      if (!current) current = { start: t, end: t, distanceKm: 0, maxSpeed: speed, points: [p] }
      else {
        const last = current.points[current.points.length - 1]
        current.distanceKm += haversineKm(parseFloat(last.latitude), parseFloat(last.longitude), lat, lng)
        current.maxSpeed = Math.max(current.maxSpeed, speed)
        current.end = t
        current.points.push(p)
      }
    } else if (current) {
      stopStreak++
      if (stopStreak >= STOP_GAP_POINTS) {
        trips.push(current)
        current = null
        stopStreak = 0
      }
    }
  }
  if (current) trips.push(current)

  return { trips, movingSeconds, stoppedSeconds }
}

const fmtHours = seconds => {
  const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
const fmtTime = d => d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })

function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type:'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function StatBox({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{ flex:1, padding:'18px 20px', background:'white', borderRadius:12, border:BORDER }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ color:C.muted, fontSize:12, fontWeight:500 }}>{label}</div>
        <div style={{ width:34, height:34, borderRadius:8, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ color:C.navy, fontSize:26, fontWeight:800, marginBottom:3 }}>{value}</div>
      <div style={{ color:C.faint, fontSize:11 }}>{sub}</div>
    </div>
  )
}

export default function Reports() {
  const { data:vehicles } = useApi(api.vehicles.list)
  const { data:alerts }   = useApi(api.alerts.list)

  const [range,      setRange]      = useState('Last 7 Days')
  const [showRange,  setShowRange]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('overview')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [reloadKey,  setReloadKey]  = useState(0)

  const [loadingReport, setLoadingReport] = useState(false)
  const [tripsByVehicle, setTripsByVehicle] = useState({}) // imei -> { trips, movingSeconds, stoppedSeconds }

  const dates = useMemo(() => getRangeDates(range, dateFrom, dateTo), [range, dateFrom, dateTo])

  /* ── Fetch + reconstruct trips for every vehicle across the selected range ── */
  useEffect(() => {
    if (!vehicles.length || !dates.length) { setTripsByVehicle({}); return }
    let cancelled = false
    setLoadingReport(true)
    ;(async () => {
      const results = await Promise.all(vehicles.map(async v => {
        const dayLogs = await Promise.all(dates.map(d => api.vehicles.history(v.imei, d).catch(() => [])))
        const logs = dayLogs.flat().sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
        return [v.imei, computeTrips(logs)]
      }))
      if (!cancelled) {
        setTripsByVehicle(Object.fromEntries(results))
        setLoadingReport(false)
      }
    })()
    return () => { cancelled = true }
  }, [vehicles, dates.join(','), reloadKey]) // eslint-disable-line

  /* ── Alerts within the selected range ─────────────────────────── */
  const rangeAlerts = useMemo(() => {
    if (!dates.length) return []
    const start = dates[0], end = dates[dates.length - 1]
    return alerts.filter(a => {
      const d = (a.alert_time || '').slice(0, 10)
      return d >= start && d <= end
    })
  }, [alerts, dates])

  /* ── Aggregate stat boxes ──────────────────────────────────────── */
  const allTrips = useMemo(() =>
    Object.entries(tripsByVehicle).flatMap(([imei, r]) =>
      r.trips.map(t => ({ ...t, imei }))
    ), [tripsByVehicle])

  const totalTrips    = allTrips.length
  const totalDistance = Math.round(allTrips.reduce((a,t) => a + t.distanceKm, 0))
  const totalMoving   = Object.values(tripsByVehicle).reduce((a,r) => a + r.movingSeconds, 0)
  const allSpeeds     = allTrips.map(t => t.maxSpeed).filter(s => s > 0)
  const avgSpeed      = allSpeeds.length ? Math.round(allSpeeds.reduce((a,s)=>a+s,0) / allSpeeds.length) : 0

  /* ── Daily chart data ──────────────────────────────────────────── */
  const dailyData = useMemo(() => dates.map(d => {
    const dayTrips  = allTrips.filter(t => fmtDate(t.start) === d)
    const dayAlerts = rangeAlerts.filter(a => (a.alert_time||'').slice(0,10) === d)
    return {
      day: dayLabel(d),
      trips: dayTrips.length,
      distance: Math.round(dayTrips.reduce((a,t)=>a+t.distanceKm,0)),
      alerts: dayAlerts.length,
    }
  }), [dates, allTrips, rangeAlerts])

  /* ── Alert type breakdown ──────────────────────────────────────── */
  const alertBreakdown = useMemo(() => {
    const counts = {}
    rangeAlerts.forEach(a => { counts[a.type] = (counts[a.type]||0) + 1 })
    return Object.entries(counts)
      .map(([type,count]) => ({ type, count, color: ALERT_COLORS[type] || fallbackColor }))
      .sort((a,b) => b.count - a.count)
  }, [rangeAlerts])
  const maxAlertCount = Math.max(1, ...alertBreakdown.map(a=>a.count))

  /* ── Vehicle report rows ───────────────────────────────────────── */
  const vehicleReport = useMemo(() => vehicles.map(v => {
    const r = tripsByVehicle[v.imei] || { trips:[], movingSeconds:0, stoppedSeconds:0 }
    const vAlerts = rangeAlerts.filter(a => a.imei === v.imei).length
    return {
      imei: v.imei, name: v.name, plate: v.plate,
      driver: v.owner && v.owner !== 'Unassigned' ? v.owner : 'Unassigned',
      trips: r.trips.length,
      distance: Math.round(r.trips.reduce((a,t)=>a+t.distanceKm,0)) + ' km',
      moving: fmtHours(r.movingSeconds),
      stopped: fmtHours(r.stoppedSeconds),
      alerts: vAlerts,
      status: v.status,
    }
  }), [vehicles, tripsByVehicle, rangeAlerts])

  /* ── Trip history (flattened, newest first, capped) ─────────────── */
  const tripHistory = useMemo(() => {
    const vByImei = Object.fromEntries(vehicles.map(v => [v.imei, v]))
    return allTrips
      .map(t => ({ ...t, vehicleName: vByImei[t.imei]?.name || t.imei, driver: vByImei[t.imei]?.owner || 'Unassigned' }))
      .sort((a,b) => b.start - a.start)
      .slice(0, 50)
  }, [allTrips, vehicles])

  const tabs = [
    { id:'overview',  label:'Overview'         },
    { id:'vehicles',  label:'Vehicle Report'   },
    { id:'alerts',    label:'Alert Summary'    },
    { id:'trips',     label:'Trip History'     },
  ]

  return (
    <div style={{ padding:24, minHeight:'100%', background:'#F1F5F9' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ color:C.navy, fontSize:22, fontWeight:800 }}>Reports</div>
            {loadingReport && <Spinner size={18}/>}
          </div>
          <div style={{ color:C.muted, fontSize:13, marginTop:3 }}>Fleet performance and analytics</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Date range picker */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setShowRange(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'white', border:BORDER, borderRadius:9, fontSize:13, color:C.navy, cursor:'pointer', fontWeight:500 }}
            >
              <Calendar size={14} color={C.muted} />
              {range}
              <ChevronDown size={13} color={C.muted} />
            </button>
            {showRange && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'white', border:BORDER, borderRadius:10, overflow:'hidden', zIndex:100, minWidth:160, boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}>
                {RANGES.map(r => (
                  <div key={r}
                    onClick={() => { setRange(r); setShowRange(false) }}
                    style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', color: range===r ? C.accent : C.navy, background: range===r ? C.accentL : 'transparent', fontWeight: range===r ? 600 : 400 }}
                    onMouseEnter={e => { if (range!==r) e.currentTarget.style.background=C.bg }}
                    onMouseLeave={e => { if (range!==r) e.currentTarget.style.background='transparent' }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {range === 'Custom' && (
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                style={{ padding:'9px 10px', border:BORDER, borderRadius:8, fontSize:12, color:C.navy, outline:'none' }} />
              <span style={{ color:C.muted, fontSize:12 }}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                style={{ padding:'9px 10px', border:BORDER, borderRadius:8, fontSize:12, color:C.navy, outline:'none' }} />
            </div>
          )}

          <button onClick={() => setReloadKey(k => k+1)} title="Refresh"
            style={{ width:36, height:36, border:BORDER, borderRadius:9, background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
            <RefreshCw size={14} style={{ animation: loadingReport ? 'kvh-spin .8s linear infinite' : 'none' }}/>
          </button>

          <Btn onClick={() => downloadCSV('fleet_report.csv',
            vehicleReport.map(v => [v.name, v.plate, v.driver, v.trips, v.distance, v.moving, v.stopped, v.alerts, v.status]),
            ['Vehicle','Plate','Driver','Trips','Distance','Moving','Stopped','Alerts','Status'])}>
            <Download size={14} /> Export
          </Btn>
        </div>
      </div>
      <LoadingBar show={loadingReport}/>

      {/* Stat boxes */}
      <div style={{ display:'flex', gap:14, marginBottom:24, marginTop: loadingReport ? 12 : 0 }}>
        <StatBox label="Total Trips"     value={totalTrips}            sub={range}              icon={Car}           color={C.accent} />
        <StatBox label="Total Distance"  value={totalDistance + ' km'} sub="All vehicles"       icon={MapPin}        color={C.blue}   />
        <StatBox label="Avg Speed"       value={avgSpeed + ' km/h'}    sub="Fleet average"      icon={Gauge}         color="#7C3AED"  />
        <StatBox label="Active Hours"    value={fmtHours(totalMoving)} sub="Engine on time"     icon={Clock}         color={C.green}  />
        <StatBox label="Total Alerts"    value={rangeAlerts.length}    sub="Requires attention" icon={AlertTriangle} color={C.red}    />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:20, background:'white', padding:4, borderRadius:10, width:'fit-content', border:BORDER }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'7px 18px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight: activeTab===t.id ? 700 : 400, background: activeTab===t.id ? C.accent : 'transparent', color: activeTab===t.id ? 'white' : C.muted, transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
            <Card style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div>
                  <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>Daily Trips</div>
                  <div style={{ color:C.muted, fontSize:12 }}>Number of trips per day</div>
                </div>
                <TrendingUp size={16} color={C.green} />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:8, border:BORDER, fontSize:12 }} />
                  <Bar dataKey="trips" fill={C.accent} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ padding:20 }}>
              <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:4 }}>Alert Types</div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:18 }}>{range}</div>
              {alertBreakdown.length === 0 ? (
                <div style={{ color:'#CBD5E1', fontSize:13, textAlign:'center', padding:'20px 0' }}>No alerts in this range</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {alertBreakdown.map(a => (
                    <div key={a.type}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ color:C.navy, fontSize:13, fontWeight:500 }}>{a.type}</span>
                        <span style={{ color:a.color, fontWeight:700, fontSize:13 }}>{a.count}</span>
                      </div>
                      <div style={{ height:6, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width: (a.count / maxAlertCount * 100) + '%', background:a.color, borderRadius:4, transition:'width .5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>Distance Traveled</div>
                <div style={{ color:C.muted, fontSize:12 }}>Total km per day across all vehicles</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius:8, border:BORDER, fontSize:12 }} />
                <Line type="monotone" dataKey="distance" stroke={C.accent} strokeWidth={2.5} dot={{ r:4, fill:C.accent }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── VEHICLE REPORT TAB ────────────────────────────────── */}
      {activeTab === 'vehicles' && (
        <Card>
          <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>Vehicle Performance — {range}</div>
            <Btn onClick={() => downloadCSV('vehicle_report.csv',
              vehicleReport.map(v => [v.name, v.plate, v.driver, v.trips, v.distance, v.moving, v.stopped, v.alerts, v.status]),
              ['Vehicle','Plate','Driver','Trips','Distance','Moving Time','Stop Time','Alerts','Status'])}>
              <Download size={13} /> Export CSV
            </Btn>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Vehicle','Plate','Driver','Trips','Distance','Moving Time','Stop Time','Alerts','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.muted, fontSize:11, fontWeight:600, borderBottom:BORDER, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleReport.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#94A3B8' }}>No vehicles registered</td></tr>
                ) : vehicleReport.map((v, i) => (
                  <tr key={i} style={{ borderBottom:BORDER }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Car size={15} color={C.accent} />
                        </div>
                        <span style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{v.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', color:C.muted, fontSize:12 }}>{v.plate}</td>
                    <td style={{ padding:'12px 16px', color:C.navy, fontSize:13 }}>{v.driver}</td>
                    <td style={{ padding:'12px 16px', color:C.navy, fontWeight:600, fontSize:13 }}>{v.trips}</td>
                    <td style={{ padding:'12px 16px', color:C.navy, fontSize:13 }}>{v.distance}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'#ECFDF5', color:C.green, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{v.moving}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'#FEF2F2', color:C.red, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{v.stopped}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {v.alerts > 0
                        ? <span style={{ background:'#FEF2F2', color:C.red, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{v.alerts} alerts</span>
                        : <span style={{ color:C.green, fontSize:11, fontWeight:600 }}>No alerts</span>
                      }
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background: v.status==='moving'?'#ECFDF5':v.status==='stopped'?'#FFFBEB':'#F8FAFC', color: v.status==='moving'?C.green:v.status==='stopped'?'#D97706':C.muted }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background: v.status==='moving'?C.green:v.status==='stopped'?'#D97706':C.muted, display:'inline-block' }} />
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── ALERT SUMMARY TAB ─────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card style={{ padding:20 }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:4 }}>Alerts by Day</div>
            <div style={{ color:C.muted, fontSize:12, marginBottom:18 }}>Number of alerts triggered per day</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius:8, border:BORDER, fontSize:12 }} />
                <Bar dataKey="alerts" fill="#DC2626" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ padding:20 }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14, marginBottom:4 }}>Alert Breakdown</div>
            <div style={{ color:C.muted, fontSize:12, marginBottom:18 }}>By type — {range}</div>
            {alertBreakdown.length === 0 ? (
              <div style={{ color:'#CBD5E1', fontSize:13, textAlign:'center', padding:'30px 0' }}>No alerts in this range</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {alertBreakdown.map(a => (
                  <div key={a.type} style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:a.color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <AlertTriangle size={18} color={a.color} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ color:C.navy, fontSize:13, fontWeight:600 }}>{a.type}</span>
                        <span style={{ color:a.color, fontWeight:700, fontSize:14 }}>{a.count}</span>
                      </div>
                      <div style={{ height:6, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:(a.count/maxAlertCount*100)+'%', background:a.color, borderRadius:4 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rangeAlerts.length > 0 && (
              <div style={{ marginTop:20, padding:14, background:'#FEF2F2', borderRadius:10, border:'1px solid #FECACA' }}>
                <div style={{ color:'#DC2626', fontWeight:700, fontSize:13, marginBottom:3 }}>Total Alerts: {rangeAlerts.length}</div>
                <div style={{ color:'#DC2626', fontSize:12 }}>{alertBreakdown[0]?.type} is the most common alert in this range</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TRIP HISTORY TAB ──────────────────────────────────── */}
      {activeTab === 'trips' && (
        <Card>
          <div style={{ padding:'14px 18px', borderBottom:BORDER, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:14 }}>Trip History — {range} (latest 50)</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={() => downloadCSV('trip_history.csv',
                tripHistory.map(t => [t.vehicleName, t.driver, fmtDate(t.start), fmtTime(t.start), fmtTime(t.end), Math.round(t.distanceKm)+' km', Math.round(t.maxSpeed)+' km/h', t.maxSpeed>80?'Over Speed':'Completed']),
                ['Vehicle','Driver','Date','Start','End','Distance','Max Speed','Status'])}>
                <Download size={13} /> Export
              </Btn>
            </div>
          </div>

          {tripHistory.length === 0 ? (
            <div style={{ textAlign:'center', padding:50, color:'#94A3B8' }}>
              {loadingReport ? 'Loading trips…' : 'No trips found in this range'}
            </div>
          ) : tripHistory.map((trip, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom:BORDER, gap:16 }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

              <div style={{ flex:2 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <Car size={14} color={C.accent} />
                  <span style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{trip.vehicleName}</span>
                </div>
                <div style={{ color:C.muted, fontSize:11 }}>Driver: {trip.driver}</div>
              </div>

              <div style={{ flex:1.5 }}>
                <div style={{ color:C.navy, fontSize:12, fontWeight:500 }}>{fmtDate(trip.start)}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{fmtTime(trip.start)} — {fmtTime(trip.end)}</div>
              </div>

              <div style={{ display:'flex', gap:20, flex:2 }}>
                <div>
                  <div style={{ color:C.faint, fontSize:10 }}>Distance</div>
                  <div style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{Math.round(trip.distanceKm)} km</div>
                </div>
                <div>
                  <div style={{ color:C.faint, fontSize:10 }}>Max Speed</div>
                  <div style={{ color: trip.maxSpeed > 80 ? C.red : C.navy, fontWeight:600, fontSize:13 }}>{Math.round(trip.maxSpeed)} km/h</div>
                </div>
              </div>

              <div>
                {trip.maxSpeed > 80
                  ? <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FEF2F2', color:C.red, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, border:'1px solid #FECACA' }}>
                      <AlertTriangle size={11} /> Over Speed
                    </span>
                  : <span style={{ background:'#ECFDF5', color:C.green, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, border:'1px solid #BBF7D0' }}>
                      Completed
                    </span>
                }
              </div>
            </div>
          ))}
        </Card>
      )}

      <style>{`@keyframes kvh-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}