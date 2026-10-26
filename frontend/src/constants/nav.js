import {
  LayoutDashboard, Map, Car, Clock, AlertTriangle,
  User, Hexagon, FileText, Cpu, Users, Settings,
  Wrench, Droplets,
} from 'lucide-react'

export const NAV = [
  { id:'dashboard',   label:'Dashboard',          Icon:LayoutDashboard },
  { id:'live',        label:'Live Tracking',      Icon:Map             },
  { id:'history',     label:'History / Playback', Icon:Clock           },
  { id:'alerts',      label:'Alerts',             Icon:AlertTriangle   },
  { id:'geofences',   label:'Geofences',          Icon:Hexagon         },
  { id:'reports',     label:'Reports',            Icon:FileText        },
  { id:'drivers',     label:'Drivers',            Icon:User            },
  { id:'devices',     label:'GPS Devices',        Icon:Cpu             },
  { id:'vehicles',    label:'Vehicles',           Icon:Car             },
  { id:'maintenance', label:'Maintenance',        Icon:Wrench          },
  { id:'fuel',        label:'Fuel Log',           Icon:Droplets        },
  { id:'users',       label:'Users',              Icon:Users           },
  { id:'settings',    label:'Settings',           Icon:Settings        },
]

export const PAGE_TITLES = {
  dashboard:   'Dashboard',
  live:        'Live Tracking',
  vehicles:    'Vehicles',
  history:     'History / Playback',
  alerts:      'Alerts',
  drivers:     'Drivers',
  geofences:   'Geofences',
  reports:     'Reports',
  devices:     'GPS Devices',
  maintenance: 'Maintenance',
  fuel:        'Fuel Log',
  users:       'Users',
  settings:    'Settings',
}