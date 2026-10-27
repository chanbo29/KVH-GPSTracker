import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { C } from '../../constants/colors.js'
import { NAV } from '../../constants/nav.js'
import { t } from '../../constants/i18n.js'

const EASE = 'cubic-bezier(.4,0,.2,1)'

/* Console-style accent — a warm "beacon" amber instead of generic SaaS blue, so the
   active state reads like a dispatch/ops console rather than a stock admin template. */
const ACCENT        = '#F2A93B'
const ACCENT_DARK   = '#1A1306'   // icon fill color sitting on top of the solid accent badge
const ACCENT_TINT   = 'rgba(242,169,59,.12)'
const ACCENT_TINT_H = 'rgba(242,169,59,.20)'
const HAIRLINE      = 'rgba(255,255,255,.07)'
const HOVER_BG       = 'rgba(255,255,255,.045)'
const ONLINE         = '#34D399'

/* Group nav items by category so a 14-item list becomes 4 short, scannable groups. */
/* Any id not listed here falls into "More" automatically, so nothing breaks if the */
/* NAV array changes or gains new items later. Section labels are translated via t(). */
const SECTIONS = [
  { labelKey: 'sidebar.section.overview',   ids: ['dashboard', 'live'] },
  { labelKey: 'sidebar.section.fleet',      ids: ['vehicles', 'devices', 'drivers', 'geofences'] },
  { labelKey: 'sidebar.section.operations', ids: ['history', 'alerts', 'reports', 'maintenance', 'fuel'] },
  { labelKey: 'sidebar.section.admin',      ids: ['users', 'settings', 'sms'] },
]

/* Label that fades + shrinks smoothly instead of popping in/out when the sidebar collapses */
function FadeLabel({ collapsed, maxWidth = 160, style, children }) {
  return (
    <span style={{
      display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap',
      opacity: collapsed ? 0 : 1,
      maxWidth: collapsed ? 0 : maxWidth,
      transition: `opacity .15s ${EASE}, max-width .22s ${EASE}`,
      transitionDelay: collapsed ? '0s' : '.05s',
      ...style,
    }}>
      {children}
    </span>
  )
}

export default function Sidebar({ current, active, onNav, unread = 0, user }) {
  const currentPage = current ?? active   // accepts either prop name, in case App.jsx passes 'active'
  const [collapsed, setCollapsed] = useState(false)
  const [mounted,   setMounted]   = useState(false)

  // Single floating tooltip, positioned with real screen coordinates (position: fixed)
  // so it always shows fully — never clipped by the sidebar's own overflow:hidden.
  const [tip, setTip] = useState(null) // { label, top, left } | null

  useEffect(() => { const id = setTimeout(() => setMounted(true), 10); return () => clearTimeout(id) }, [])

  const showTip = (e, label) => {
    if (!collapsed) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 })
  }
  const hideTip = () => setTip(null)

  const isAdmin = user?.role === 'admin'

  const perms = (() => {
    const p = user?.permissions
    if (Array.isArray(p) && p.length > 0) return p
    try {
      const parsed = JSON.parse(p)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()

  const visible = NAV.filter(item => {
    if (!user) return false
    if (isAdmin) return true
    if (item.id === 'dashboard') return true
    return perms.includes(item.id)
  })

  const byId = Object.fromEntries(visible.map(item => [item.id, item]))
  const grouped = SECTIONS
    .map(section => ({ labelKey: section.labelKey, items: section.ids.map(id => byId[id]).filter(Boolean) }))
    .filter(section => section.items.length > 0)

  const groupedIds = new Set(SECTIONS.flatMap(s => s.ids))
  const leftover = visible.filter(item => !groupedIds.has(item.id))
  if (leftover.length > 0) grouped.push({ labelKey: 'sidebar.section.more', items: leftover })

  const NavButton = ({ id, Icon }) => {
    const isActive = currentPage === id
    const [hover, setHover] = useState(false)
    const label = t(`nav.${id}`)
    const bg = isActive ? (hover ? ACCENT_TINT_H : ACCENT_TINT) : (hover ? HOVER_BG : 'transparent')
    return (
      <button
        onClick={() => onNav(id)}
        onMouseEnter={e => { setHover(true); showTip(e, label) }}
        onMouseLeave={() => { setHover(false); hideTip() }}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:11,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '7px 0' : '7px 10px 7px 7px', borderRadius:9, border:'none',
          cursor:'pointer', marginBottom:2, textAlign:'left',
          background: bg,
          transition: `background .15s ${EASE}`,
          position:'relative',
        }}
      >
        {/* Active page gets a solid-filled icon badge (dark glyph on amber) instead of a
            flat accent bar — reads as a selected console button, not a tinted list row. */}
        <div style={{
          width:28, height:28, borderRadius:7, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background: isActive ? ACCENT : 'transparent',
          boxShadow: isActive ? '0 2px 8px rgba(242,169,59,.35)' : 'none',
          transition: `background .18s ${EASE}, box-shadow .18s ${EASE}`,
        }}>
          <Icon size={15} color={isActive ? ACCENT_DARK : (hover ? '#B8C3D6' : '#7E8CA3')} style={{ transition: `color .15s ${EASE}` }} />
        </div>
        <FadeLabel collapsed={collapsed} style={{ flex: collapsed ? 'none' : 1 }}>
          <span style={{ color: isActive ? '#F8FAFC' : '#8B96A8', fontSize:13, fontWeight: isActive ? 600 : 400, transition: `color .15s ${EASE}` }}>
            {label}
          </span>
        </FadeLabel>
        {!collapsed && id === 'alerts' && unread > 0 && (
          <span style={{ background:'#DC2626', color:'white', borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:700, flexShrink:0 }}>
            {unread}
          </span>
        )}
        {collapsed && id === 'alerts' && unread > 0 && (
          <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#DC2626', border:'1.5px solid '+C.sidebar }}/>
        )}
      </button>
    )
  }

  return (
    <div style={{ position:'relative', width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240, flexShrink:0, zIndex:10, height:'100vh', transition: `width .24s ${EASE}, min-width .24s ${EASE}` }}>
      <style>{`@keyframes kvhLivePulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 6px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}`}</style>
      <div style={{
        width:'100%', height:'100%',
        background:`linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,0) 140px), ${C.sidebar}`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        borderRight:`1px solid ${HAIRLINE}`,
      }}>

        {/* ── Logo ───────────────────────────────────────────── */}
        <div style={{ padding: collapsed ? '20px 8px 16px' : '20px 18px 16px', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', transition: `padding .24s ${EASE}` }}>
          {collapsed
            ? <img src="/kvh-logo.png" alt="KVH" style={{ width:28, height:'auto', display:'block' }} />
            : <FadeLabel collapsed={collapsed} maxWidth={150}>
                <img src="/kvh-logo.png" alt="KVH Logo" style={{ width:132, height:'auto', display:'block' }} />
              </FadeLabel>}
        </div>

        <div style={{
          overflow: 'hidden',
          maxHeight: collapsed ? 0 : 36,
          opacity: collapsed ? 0 : 1,
          transition: `max-height .2s ${EASE}, opacity .15s ${EASE}`,
        }}>
          <div style={{ textAlign:'left', color:'#5B6678', fontSize:10.5, fontWeight:500, letterSpacing:.3, padding:'0 18px 14px', whiteSpace:'nowrap' }}>
            {t('sidebar.subtitle')}
          </div>
        </div>

        <div style={{ height:1, background:HAIRLINE, margin: collapsed ? '0 8px' : '0 18px', transition: `margin .24s ${EASE}` }}/>

        {/* ── Nav ────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: collapsed ? '14px 8px' : '14px 10px', transition: `padding .24s ${EASE}` }}>
          {grouped.map((section, i) => (
            <div key={section.labelKey} style={{
              marginBottom: i < grouped.length - 1 ? 16 : 0,
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(4px)',
              transition: `opacity .25s ${EASE} ${i * 0.04}s, transform .25s ${EASE} ${i * 0.04}s`,
            }}>
              <div style={{
                overflow:'hidden',
                maxHeight: collapsed ? 0 : 18,
                opacity: collapsed ? 0 : 1,
                transition: `max-height .18s ${EASE}, opacity .13s ${EASE}`,
              }}>
                <div style={{ padding:'0 10px 6px', color:'#5B6678', fontSize:10.5, fontWeight:600, letterSpacing:.4, whiteSpace:'nowrap' }}>
                  {t(section.labelKey)}
                </div>
              </div>
              {section.items.map(item => <NavButton key={item.id} id={item.id} Icon={item.Icon} />)}
            </div>
          ))}
        </div>

        {/* ── Live status strip — a dispatch-console signal that the fleet feed is up, ── */}
        {/* ── grounding the sidebar in what this app actually does rather than decoration ── */}
        <div style={{ padding: collapsed ? '0 8px 10px' : '0 14px 10px', transition: `padding .24s ${EASE}` }}>
          <div style={{
            display:'flex', alignItems:'center', gap: collapsed ? 0 : 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background:'rgba(52,211,153,.07)', border:'1px solid rgba(52,211,153,.16)',
            borderRadius:9, padding: collapsed ? '7px 0' : '7px 11px',
            transition: `padding .24s ${EASE}`,
          }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:ONLINE, flexShrink:0, animation:'kvhLivePulse 2s infinite' }}/>
            <FadeLabel collapsed={collapsed} maxWidth={140}>
              <span style={{ color:'#86EFC0', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>Fleet feed online</span>
            </FadeLabel>
          </div>
        </div>

        {/* ── Quiet footer — grounds the bottom now that the profile block has moved to the header ── */}
        <div style={{ borderTop:`1px solid ${HAIRLINE}`, padding: collapsed ? '12px 8px' : '12px 18px', textAlign: collapsed ? 'center' : 'left', transition: `padding .24s ${EASE}` }}>
          <FadeLabel collapsed={collapsed} maxWidth={160}>
            <span style={{ color:'#475569', fontSize:10, fontWeight:500, letterSpacing:.3, whiteSpace:'nowrap' }}>
              KVH Fleet Management
            </span>
          </FadeLabel>
          {collapsed && <span style={{ color:'#475569', fontSize:9, fontWeight:600 }}>KVH</span>}
        </div>
      </div>

      {/* ── Floating collapse toggle — sits on the sidebar's edge instead of competing ── */}
      {/* ── with the logo for space in the header row.                                ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        style={{
          position:'absolute', top:24, right:-12, width:24, height:24, borderRadius:'50%',
          background:C.sidebar, border:`1px solid ${HAIRLINE}`, color:'#7E8CA3',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          boxShadow:'0 2px 8px rgba(0,0,0,.3)', zIndex:50,
          transition: `background .15s ${EASE}, color .15s ${EASE}, border-color .15s ${EASE}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background='#1E293B'; e.currentTarget.style.color=ACCENT; e.currentTarget.style.borderColor='rgba(242,169,59,.35)' }}
        onMouseLeave={e => { e.currentTarget.style.background=C.sidebar; e.currentTarget.style.color='#7E8CA3'; e.currentTarget.style.borderColor=HAIRLINE }}
      >
        <span style={{ display:'flex', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform .24s ${EASE}` }}>
          <ChevronLeft size={13}/>
        </span>
      </button>

      {/* ── Floating tooltip — fixed to the viewport, so it's never clipped by the ── */}
      {/* ── sidebar's own overflow:hidden. Only ever shown while collapsed.        ── */}
      {tip && (
        <div style={{
          position:'fixed', top: tip.top, left: tip.left, transform:'translateY(-50%)',
          background:'#111827', color:'#F1F5F9', fontSize:12.5, fontWeight:500,
          padding:'6px 11px', borderRadius:7, whiteSpace:'nowrap',
          boxShadow:'0 8px 20px rgba(0,0,0,.4)', border:`1px solid ${HAIRLINE}`,
          pointerEvents:'none', zIndex:999,
        }}>
          {tip.label}
          <div style={{
            position:'absolute', left:-4, top:'50%', transform:'translateY(-50%) rotate(45deg)',
            width:7, height:7, background:'#111827', borderLeft:`1px solid ${HAIRLINE}`, borderBottom:`1px solid ${HAIRLINE}`,
          }}/>
        </div>
      )}
    </div>
  )
}
