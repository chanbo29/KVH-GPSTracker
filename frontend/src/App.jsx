import { useState, useEffect, useCallback, useRef } from 'react'
import { NAV } from './constants/nav.js'
import { api }  from './api/client.js'
import { C } from './constants/colors.js'
import { applyLanguage, getSavedLanguage, saveLanguage } from './constants/i18n.js'
import { UIProvider } from './components/ui/UIProvider.jsx'

import Login        from './pages/Login.jsx'
import MobileApp    from './components/MobileApp.jsx'
import Sidebar      from './components/layout/Sidebar.jsx'
import Header       from './components/layout/Header.jsx'

import Dashboard    from './pages/Dashboard.jsx'
import LiveTracking from './pages/LiveTracking.jsx'
import Vehicles     from './pages/Vehicles.jsx'
import History      from './pages/History.jsx'
import Alerts       from './pages/Alerts.jsx'
import Drivers      from './pages/Drivers.jsx'
import Geofences    from './pages/Geofences.jsx'
import Reports      from './pages/Reports.jsx'
import GPSDevices   from './pages/GPSDevices.jsx'
import Users        from './pages/Users.jsx'
import Settings     from './pages/Settings.jsx'
import Maintenance  from './pages/Maintenance.jsx'
import FuelTracking from './pages/FuelTracking.jsx'

/* ── Admin fallback ──────────────────────────────────────────── */
const ADMIN_USER = {
  client_id:   0,
  username:    'admin',
  name:        'Admin KVH',
  email:       'admin@kvh.com',
  role:        'admin',
  status:      'active',
  permissions: [
    'dashboard','live','vehicles','history','alerts',
    'geofences','reports','devices','users','settings',
    'maintenance','fuel',
  ],
}

const canAccess   = (user, id) => !user ? false : user.role === 'admin' ? true : Array.isArray(user.permissions) && user.permissions.includes(id)
const firstPage   = (user) => NAV.find(({ id }) => canAccess(user, id))?.id ?? 'dashboard'
const isMobileNow = () => window.innerWidth < 768

/* ── Page renderer ───────────────────────────────────────────── */
function Page({ id, navigate }) {
  switch (id) {
    case 'dashboard':   return <Dashboard/>
    case 'live':        return <LiveTracking/>
    case 'vehicles':    return <Vehicles onNavigate={navigate}/>
    case 'history':     return <History/>
    case 'alerts':      return <Alerts/>
    case 'drivers':     return <Drivers/>
    case 'geofences':   return <Geofences/>
    case 'reports':     return <Reports/>
    case 'devices':     return <GPSDevices/>
    case 'maintenance': return <Maintenance/>
    case 'fuel':        return <FuelTracking/>
    case 'users':       return <Users/>
    case 'settings':    return <Settings/>
    default:            return <Dashboard/>
  }
}

/* ════════════════════════════════════════════════════════════
   APP
════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── State ─────────────────────────────────────────────── */
  const [user,     setUser]     = useState(null)       // null = not logged in
  const [page,     setPage]     = useState('dashboard')
  const mainRef = useRef(null)

  // English / Khmer — mutate the shared dictionary (constants/i18n.js)
  // then flip a bit of state to force one re-render so every component
  // re-reads the mutated dictionary.
  const [lang, setLangState] = useState(() => {
    const saved = getSavedLanguage()
    applyLanguage(saved)
    return saved
  })
  const toggleLanguage = useCallback(() => {
    const next = lang === 'km' ? 'en' : 'km'
    applyLanguage(next)
    saveLanguage(next)
    setLangState(next)
  }, [lang])

  // Every page shares this one scroll container — without this, switching pages
  // keeps whatever scroll position the previous page was at, which can look like
  // an unwanted jump (most noticeable on pages with a chart, like Fuel Log).
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [page])
  const [mobile,   setMobile]   = useState(isMobileNow)
  const [loginErr, setLoginErr] = useState('')
  const [loginBusy,setLoginBusy]= useState(false)

  /* ── Restore session ───────────────────────────────────── */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('kvh_user')
      if (saved) {
        const u = JSON.parse(saved)
        setUser(u)
        setPage(firstPage(u))
      }
    } catch {}
  }, [])

  /* ── Persist session ───────────────────────────────────── */
  useEffect(() => {
    if (user) sessionStorage.setItem('kvh_user', JSON.stringify(user))
    else      sessionStorage.removeItem('kvh_user')
  }, [user])

  /* ── Responsive detection ──────────────────────────────── */
  useEffect(() => {
    const handler = () => setMobile(isMobileNow())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  /* ── Permission polling every 5 s (non-admin only) ─────── */
  useEffect(() => {
    if (!user || user.role === 'admin' || !user.client_id) return
    const poll = async () => {
      try {
        const fresh = await api.clients.get(user.client_id)
        if (fresh.status === 'inactive') { handleLogout(); return }
        setUser(prev => {
          const next = { ...prev, permissions: fresh.permissions ?? prev.permissions, name: fresh.name ?? prev.name }
          sessionStorage.setItem('kvh_user', JSON.stringify(next))
          return next
        })
        if (!canAccess(fresh, page)) setPage(firstPage(fresh))
      } catch {}
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [user?.client_id, page]) // eslint-disable-line

  /* ── LOGIN ─────────────────────────────────────────────── */
  const handleLogin = async (username, password) => {
    setLoginErr('')
    setLoginBusy(true)

    try {
      /* 1 — Admin fallback (no DB needed) */
      if (username.trim() === 'admin' && password === 'admin1234') {
        setUser(ADMIN_USER)
        setPage('dashboard')
        return   // ← App re-renders, Login unmounts automatically
      }

      /* 2 — Django DB login */
      const res = await api.clients.login({ username: username.trim(), password })

      // client_login returns a FLAT object:
      // { client_id, name, username, email, role, status, permissions }
      // (still tolerate { client: {...} } / { user: {...} } in case the API shape ever changes)
      const u = res?.client ?? res?.user ?? (res?.client_id !== undefined ? res : null)

      if (u) {
        const normalised = {
          ...u,
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
        }
        setUser(normalised)
        setPage(firstPage(normalised))
        return   // ← App re-renders, Login unmounts automatically
      }

      setLoginErr('Invalid username or password.')
    } catch (err) {
      setLoginErr(err.message || 'Login failed. Check your connection.')
    } finally {
      setLoginBusy(false)
    }
  }

  /* ── LOGOUT ────────────────────────────────────────────── */
  const handleLogout = useCallback(() => {
    setUser(null)
    setPage('dashboard')
    sessionStorage.removeItem('kvh_user')
  }, [])

  /* ── Navigate with guard ───────────────────────────────── */
  const navigate = useCallback((id) => {
    if (canAccess(user, id)) setPage(id)
  }, [user])

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */

  /* Not logged in */
  if (!user) {
    return (
      <UIProvider>
        <Login
          onLogin={handleLogin}
          loading={loginBusy}
          error={loginErr}
        />
      </UIProvider>
    )
  }

  /* Mobile */
  if (mobile) {
    return (
      <UIProvider>
        <MobileApp user={user} onLogout={handleLogout} lang={lang} onToggleLanguage={toggleLanguage}/>
      </UIProvider>
    )
  }

  /* Desktop */
  const visibleNav = NAV.filter(({ id }) => canAccess(user, id))
  const safePage   = canAccess(user, page) ? page : firstPage(user)

  return (
    <UIProvider>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:C.bg, fontFamily:"'Inter',system-ui,-apple-system,sans-serif" }}>
        <Sidebar nav={visibleNav} active={safePage} onNav={navigate} user={user} onLogout={handleLogout}/>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <Header page={safePage} user={user} onLogout={handleLogout} lang={lang} onToggleLanguage={toggleLanguage}/>
          <main ref={mainRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden', background:C.bg }}>
            <Page id={safePage} navigate={navigate}/>
          </main>
        </div>
      </div>
    </UIProvider>
  )
}
