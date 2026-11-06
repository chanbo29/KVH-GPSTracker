import { C } from '../constants/colors.js'
import { t } from '../constants/i18n.js'
import {
  Map, Car, Cpu, User, Hexagon, Plus, List,
  Clock, AlertTriangle, FileText,
  Wrench, Droplets,
  Users, Settings,
  Package, ShieldCheck, Receipt,
  BellRing, ClipboardList, Cog, Coins, Construction, FileWarning, Fuel, Hammer, Landmark, MapPin, Repeat, Settings2, Truck, UserPlus, Wallet,
} from 'lucide-react'

/* Grouped icon-tile launcher -- mirrors a classic ops-console "Menu" screen:
   gray section bars, a uniform grid of square tiles, icon on top / label below.
   Pages that combine "Add" + "List" in one screen (Vehicles, Drivers,
   Maintenance, Fuel, Spare Parts, Documents, Expenses) get split into two
   tiles here: the "Add ..." tile sets a one-shot sessionStorage flag that
   the target page reads on mount to auto-open its Add modal, so a single
   underlying page still powers both shortcuts. */
const GROUPS = [
  {
    titleKey: 'menu.section.carsMaintenanceRef',
    tiles: [
      { page: 'cmOtherWork', image: '/icons/other-work.png', labelKey: 'menu.tile.cmOtherWork', Icon: ClipboardList, color: C.accent, bg: C.accentL },
      { page: 'cmVehicleRoster', image: '/icons/vehicle-roster.png', labelKey: 'menu.tile.cmVehicleRoster', Icon: Truck, color: C.accent, bg: C.accentL },
      { page: 'cmMaintenanceRecords', image: '/icons/maintenance-records.png', labelKey: 'menu.tile.cmMaintenanceRecords', Icon: Wrench, color: C.accent, bg: C.accentL },
      { page: 'cmReminders', image: '/icons/reminders.png', labelKey: 'menu.tile.cmReminders', Icon: BellRing, color: C.accent, bg: C.accentL },
      { page: 'cmFeePayments', image: '/icons/fee-payments.png', labelKey: 'menu.tile.cmFeePayments', Icon: Receipt, color: C.accent, bg: C.accentL },
      { page: 'cmTaxPayments', image: '/icons/tax-payments.png', labelKey: 'menu.tile.cmTaxPayments', Icon: Landmark, color: C.accent, bg: C.accentL },
      { page: 'cmOilChanges', image: '/icons/oil-changes.png', labelKey: 'menu.tile.cmOilChanges', Icon: Droplets, color: C.accent, bg: C.accentL },
      { page: 'cmFuelRefills', image: '/icons/fuel-refills.png', labelKey: 'menu.tile.cmFuelRefills', Icon: Fuel, color: C.accent, bg: C.accentL },
      { page: 'cmGearboxOilChanges', image: '/icons/gearbox-oil-changes.png', labelKey: 'menu.tile.cmGearboxOilChanges', Icon: Cog, color: C.accent, bg: C.accentL },
      { page: 'cmDifferentialOilChanges', image: '/icons/differential-oil-changes.png', labelKey: 'menu.tile.cmDifferentialOilChanges', Icon: Settings2, color: C.accent, bg: C.accentL },
      { page: 'cmMiscRepairCosts', image: '/icons/misc-repair-costs.png', labelKey: 'menu.tile.cmMiscRepairCosts', Icon: Hammer, color: C.accent, bg: C.accentL },
      { page: 'cmVehiclesUnderRepair', image: '/icons/vehicles-under-repair.png', labelKey: 'menu.tile.cmVehiclesUnderRepair', Icon: Construction, color: C.accent, bg: C.accentL },
      { page: 'cmFuelStations', image: '/icons/fuel-stations.png', labelKey: 'menu.tile.cmFuelStations', Icon: MapPin, color: C.accent, bg: C.accentL },
      { page: 'cmVehicleUsers', image: '/icons/vehicle-users.png', labelKey: 'menu.tile.cmVehicleUsers', Icon: UserPlus, color: C.accent, bg: C.accentL },
      { page: 'cmVehicleUserChanges', image: '/icons/vehicle-user-changes.png', labelKey: 'menu.tile.cmVehicleUserChanges', Icon: Repeat, color: C.accent, bg: C.accentL },
      { page: 'cmOutstandingInvoices', image: '/icons/outstanding-invoices.png', labelKey: 'menu.tile.cmOutstandingInvoices', Icon: FileWarning, color: C.accent, bg: C.accentL },
      { page: 'cmExchangeRates', image: '/icons/exchange-rates.png', labelKey: 'menu.tile.cmExchangeRates', Icon: Coins, color: C.accent, bg: C.accentL },
      { page: 'cmExpensePersons', image: '/icons/expense-persons.png', labelKey: 'menu.tile.cmExpensePersons', Icon: Wallet, color: C.accent, bg: C.accentL },
      { page: 'cmVehicleSettings', image: '/icons/vehicle-settings.png', labelKey: 'menu.tile.cmVehicleSettings', Icon: Settings, color: C.accent, bg: C.accentL },
    ],
  },
  {
    /* One unified grid, like the reference app's unlabeled main menu --
       everything related to running and maintaining the fleet lives here,
       no Fleet Management / Operations split. */
    titleKey: 'menu.section.carMaintenance',
    tiles: [
      { page: 'live',        labelKey: 'menu.tile.liveTracking', Icon: Map,           color: C.accent, bg: C.accentL },
      { page: 'vehicles',    addKey: 'vehicles',    labelKey: 'menu.tile.addVehicle',       Icon: Plus,  color: C.green,  bg: C.greenL },
      { page: 'vehicles',    labelKey: 'menu.tile.vehicleList',                              Icon: List,  color: C.green,  bg: C.greenL },
      { page: 'drivers',     addKey: 'drivers',     labelKey: 'menu.tile.addDriver',         Icon: Plus,  color: C.blue,   bg: C.blueL  },
      { page: 'drivers',     labelKey: 'menu.tile.driverList',                                Icon: List,  color: C.blue,   bg: C.blueL  },
      { page: 'maintenance', addKey: 'maintenance', labelKey: 'menu.tile.addMaintenance',    Icon: Plus,  color: C.amber,  bg: C.amberL },
      { page: 'maintenance', labelKey: 'menu.tile.maintenanceHistory',                         Icon: List,  color: C.amber,  bg: C.amberL },
      { page: 'fuel',        addKey: 'fuel',        labelKey: 'menu.tile.addFuel',           Icon: Plus,  color: C.blue,   bg: C.blueL  },
      { page: 'fuel',        labelKey: 'menu.tile.fuelHistory',                                Icon: List,  color: C.blue,   bg: C.blueL  },
      { page: 'devices',     labelKey: 'nav.devices',   Icon: Cpu,            color: C.mid,    bg: '#F8FAFC' },
      { page: 'geofences',   labelKey: 'nav.geofences', Icon: Hexagon,        color: C.purple, bg: C.purpleL },
      { page: 'history',     labelKey: 'nav.history',   Icon: Clock,          color: C.accent, bg: C.accentL },
      { page: 'alerts',      labelKey: 'nav.alerts',    Icon: AlertTriangle,  color: C.red,    bg: C.redL    },
      { page: 'reports',     labelKey: 'nav.reports',   Icon: FileText,       color: C.mid,    bg: '#F8FAFC' },
    ],
  },
  {
    titleKey: 'menu.section.inventory',
    tiles: [
      { page: 'spareparts', addKey: 'spareparts', labelKey: 'menu.tile.addPart',    Icon: Plus, color: C.green, bg: C.greenL },
      { page: 'spareparts', labelKey: 'menu.tile.partsList',                          Icon: Package, color: C.green, bg: C.greenL },
      { page: 'documents',  addKey: 'documents',  labelKey: 'menu.tile.addDocument', Icon: Plus, color: C.blue,  bg: C.blueL  },
      { page: 'documents',  labelKey: 'menu.tile.documentsList',                      Icon: ShieldCheck, color: C.blue, bg: C.blueL },
      { page: 'expenses',   addKey: 'expenses',   labelKey: 'menu.tile.addExpense',  Icon: Plus, color: C.red,   bg: C.redL   },
      { page: 'expenses',   labelKey: 'menu.tile.expenseList',                        Icon: Receipt, color: C.red, bg: C.redL },
    ],
  },
  {
    titleKey: 'menu.section.admin',
    tiles: [
      { page: 'users',    labelKey: 'nav.users',    Icon: Users,    color: C.mid, bg: '#F8FAFC' },
      { page: 'settings', labelKey: 'nav.settings', Icon: Settings, color: C.mid, bg: '#F8FAFC' },
    ],
  },
]

function Tile({ page, addKey, labelKey, Icon, image, color, bg, onNavigate }) {
  return (
    <button
      onClick={() => {
        if (addKey) sessionStorage.setItem('kvh_menu_add', addKey)
        onNavigate(page)
      }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '28px 12px 20px', background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 18, cursor: 'pointer', textAlign: 'center',
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,.08)'; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border }}
    >
      <div style={{
        width: 88, height: 88, borderRadius: 20, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {image
          ? <img src={image} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }}
              onError={e => { e.currentTarget.style.display = 'none' }}/>
          : <Icon size={36} color={color} strokeWidth={2}/>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, lineHeight: 1.3 }}>
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
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 16,
          }}>
            {group.tiles.map((tile, i) => (
              <Tile key={tile.page + '-' + (tile.addKey || tile.labelKey) + '-' + i} {...tile} onNavigate={nav}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
