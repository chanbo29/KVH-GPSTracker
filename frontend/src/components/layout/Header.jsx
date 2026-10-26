import { useState, useEffect, useRef } from 'react'
import { Bell, Languages, ChevronDown, LogOut } from 'lucide-react'
import { C } from '../../constants/colors.js'
import { t } from '../../constants/i18n.js'

/* ── Profile image ──────────────────────────────────────────────
   Put your image in  frontend/public/  and set the file name here.
   Files in /public are served from the site root, same as /kvh-logo.png.
   A user can also carry their own image via user.photo (a URL or /path).
   If the file is missing, the initials badge is shown instead.
   Use 'cover' to fill the circle (photos) or 'contain' to show a whole logo. */
const DEFAULT_AVATAR = 'pf.png'
const AVATAR_FIT     = 'cover'

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Header({ page, unread, onAlerts, user, onLogout, lang, onToggleLanguage }) {
  const [now, setNow] = useState(() => new Date())
  const avatarSrc = user?.photo || DEFAULT_AVATAR
  const [imgFailed, setImgFailed] = useState(false)
  const isKhmer = lang === 'km'
  const title = page ? t(`nav.${page}`) : ''

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // If a different user (or image path) comes in, try loading the image again
  useEffect(() => { setImgFailed(false) }, [avatarSrc])

  // Close the dropdown on an outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey   = e => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  return (
    <div style={{
      background: C.card,
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      borderBottom: `1px solid ${C.border}`,
    }}>

      {/* ── Left: page title + quiet live indicator ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: C.navy, fontSize: 16, fontWeight: 700, letterSpacing: .1 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22C55E', animation: 'kvh-pulse-dark 2s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22C55E' }} />
          </span>
          <span style={{ color: C.faint, fontSize: 11.5 }}>{t('header.trackingLive')}</span>
        </div>
      </div>

      {/* ── Right: flat, evenly-spaced row — no pills, no dividers ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        <span style={{ color: C.faint, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString('en-US', { hour12: true })}
        </span>

        <button
          onClick={onToggleLanguage}
          aria-label={isKhmer ? t('header.toEnglish') : t('header.toKhmer')}
          title={isKhmer ? t('header.toEnglish') : t('header.toKhmer')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 4, color: C.faint, fontSize: 12, fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.color = C.mid }}
          onMouseLeave={e => { e.currentTarget.style.color = C.faint }}
        >
          <Languages size={15} />
          {isKhmer ? 'KM' : 'EN'}
        </button>

        <button
          onClick={onAlerts}
          aria-label="Alerts"
          style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: C.faint }}
          onMouseEnter={e => { e.currentTarget.style.color = C.mid }}
          onMouseLeave={e => { e.currentTarget.style.color = C.faint }}
        >
          <Bell size={17} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', color: 'white', borderRadius: '50%', minWidth: 15, height: 15, padding: '0 3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 700 }}>
              {unread}
            </span>
          )}
        </button>

        {/* Profile — click to open the account dropdown (sign-out lives here now) */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              border: `1px solid ${C.border}`, background: imgFailed ? C.accent : C.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11.5, fontWeight: 700,
            }}>
              {imgFailed ? (
                initials(user?.name || user?.username || 'Admin KVH')
              ) : (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  onError={() => setImgFailed(true)}
                  style={{ width: '100%', height: '100%', objectFit: AVATAR_FIT, display: 'block' }}
                />
              )}
            </div>
            <div style={{ color: C.navy, fontSize: 12.5, fontWeight: 600 }}>
              {user?.name || 'Admin KVH'}
            </div>
            <ChevronDown size={13} color={C.faint} style={{ transition: 'transform .15s ease', transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 190,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              boxShadow: '0 10px 28px rgba(15,23,42,.12)',
              overflow: 'hidden', zIndex: 50, animation: 'kvh-menu-pop .14s ease-out',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ color: C.navy, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'Admin KVH'}
                </div>
                <div style={{ color: C.faint, fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email || user?.username || 'admin'}
                </div>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onLogout?.() }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 12.5, fontWeight: 600, transition: 'background .12s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={14} />
                {t('sidebar.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes kvh-pulse-dark {
          0%   { transform: scale(1);   opacity: .7; }
          100% { transform: scale(2.8); opacity: 0;  }
        }
        @keyframes kvh-menu-pop {
          from { opacity: 0; transform: translateY(-4px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
