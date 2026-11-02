import { C } from '../constants/colors.js'
import { t } from '../constants/i18n.js'
import {
  Map, Car, Cpu, User, Hexagon,
  Clock, AlertTriangle, FileText,
  Wrench, Droplets,
  Users, Settings,
} from 'lucide-react'

/* Grouped icon-tile launcher -- mirrors a classic ops-console "Menu" screen:
   gray section bars, a uniform grid of square tiles, icon on top / label below.
   Each tile reuses the real sidebar destinations, so Menu is a visual
   shortcut-board on top of the same navigation the sidebar already has. */
const GROUPS = [
  {
    titleKey: 'menu.section.fleet',
    tiles: [
      { id: 'live',      labelKey: 'nav.live',      Icon: Map,      color: C.accent, bg: C.accentL },
      { id: 'vehicles',  labelKey: 'nav.vehicles',  Icon: Car,      color: C.green,  bg: C.greenL  },
      { id: 'drivers',   labelKey: 'nav.drivers',   Icon: User,     color: C.blue,   bg: C.blueL   },
      { id: 'devices',   labelKey: 'nav.devices',   Icon: Cpu,      color: C.mid,    bg: '#F8FAFC' },
      { id: 'geofences', labelKey: 'nav.geofences', Icon: Hexagon,  color: C.purple, bg: C.purpleL },
    ],
  },
  {
    titleKey: 'menu.section.operations',
    tiles: [
      { id: 'history', labelKey: 'nav.history', Icon: Clock,         color: C.accent, bg: C.accentL },
      { id: 'alerts',  labelKey: 'nav.alerts',  Icon: AlertTriangle, color: C.red,    bg: C.redL    },
      { id: 'reports', labelKey: 'nav.reports', Icon: FileText,      color: C.mid,    bg: '#F8FAFC' },
    ],
  },
  {
    titleKey: 'menu.section.maintenance',
    tiles: [
      { id: 'maintenance', labelKey: 'nav.maintenance', Icon: Wrench,   color: C.amber, bg: C.amberL },
      { id: 'fuel',        labelKey: 'nav.fuel',        Icon: Droplets, color: C.blue,  bg: C.blueL  },
    ],
  },
  {
    titleKey: 'menu.section.admin',
    tiles: [
      { id: 'users',    labelKey: 'nav.users',    Icon: Users,    color: C.mid, bg: '#F8FAFC' },
      { id: 'settings', labelKey: 'nav.settings', Icon: Settings, color: C.mid, bg: '#F8FAFC' },
    ],
  },
]

function Tile({ id, labelKey, Icon, color, bg, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(id)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
        padding: '16px 6px 12px', background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, cursor: 'pointer', textAlign: 'center',
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,.08)'; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} color={color} strokeWidth={2}/>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.navy, lineHeight: 1.25 }}>
        {t(labelKey)}
      </div>
    </button>
  )
}

export default function Menu({ navigate, onNavigate }) {
  const nav = onNavigate || navigate || (() => {})

  return (
    <div style={{ padding: 24, minHeight: '100%', background: C.bg }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{t('nav.menu')}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{t('menu.subtitle')}</div>
      </div>

      {GROUPS.map(group => (
        <div key={group.titleKey} style={{ marginBottom: 22 }}>
          <div style={{
            background: '#E9EDF3', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '7px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.4px',
            color: C.mid, textTransform: 'uppercase', marginBottom: 12,
          }}>
            {t(group.titleKey)}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
            gap: 12,
          }}>
            {group.tiles.map(tile => (
              <Tile key={tile.id} {...tile} onNavigate={nav}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
