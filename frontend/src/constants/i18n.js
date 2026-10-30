/* ──────────────────────────────────────────────────────────────────
   English / Khmer language system.

   Same pattern as the theme system in colors.js: `T` is a MUTABLE
   dictionary object. Components call `t('some.key')` fresh at every
   render instead of importing a frozen string, so when `applyLanguage()`
   mutates the dictionary's contents in place, the very next render
   anywhere in the app picks up the new language — no React Context
   plumbing required.

   Call `applyLanguage('en' | 'km')` once at app start (see App.jsx)
   and again whenever the user flips the toggle; then force one
   top-level re-render (a `lang` state change in App.jsx) so every
   component re-reads the mutated dictionary.

   This file currently covers the app chrome — navigation, header,
   sidebar, and the login page — which is what appears on literally
   every screen. Individual pages (Dashboard, Vehicles, Drivers, …)
   still render their own English text; add keys here and swap the
   page's hardcoded strings for `t('key')` calls to extend coverage,
   one page at a time.
   ────────────────────────────────────────────────────────────────── */

const EN = {
  // Navigation (Sidebar + Header title + PAGE_TITLES)
  'nav.dashboard':   'Dashboard',
  'nav.live':        'Live Tracking',
  'nav.history':     'History / Playback',
  'nav.historyTab':  'History',
  'nav.alerts':      'Alerts',
  'nav.geofences':   'Geofences',
  'nav.reports':     'Reports',
  'nav.drivers':     'Drivers',
  'nav.devices':     'GPS Devices',
  'nav.vehicles':    'Vehicles',
  'nav.maintenance': 'Maintenance',
  'nav.fuel':        'Fuel Log',
  'nav.users':       'Users',
  'nav.settings':    'Settings',
  'nav.sms':         'SMS',

  // Sidebar chrome
  'sidebar.subtitle':       'GPS Fleet Management System',
  'sidebar.section.overview':   'Overview',
  'sidebar.section.fleet':      'Fleet',
  'sidebar.section.operations': 'Operations',
  'sidebar.section.admin':      'Admin',
  'sidebar.section.more':       'More',
  'sidebar.collapse': 'Collapse sidebar',
  'sidebar.expand':   'Expand sidebar',
  'sidebar.signOut':  'Sign Out',

  // Header chrome
  'header.trackingLive':   'tracking live',
  'header.toLightMode':    'Switch to light mode',
  'header.toDarkMode':     'Switch to dark mode',
  'header.toKhmer':        'Switch to Khmer',
  'header.toEnglish':      'Switch to English',

  // Login page
  'login.brand':            'KVH GPS Fleet',
  'login.subtitle':         'Sign in to your account',
  'login.username':         'Username',
  'login.usernamePlaceholder': 'Enter your username',
  'login.password':         'Password',
  'login.passwordPlaceholder': 'Enter your password',
  'login.signingIn':        'Signing in…',
  'login.signIn':           'Sign In',
  'login.footer':           'Kong Veng Heng Co., Ltd. © 2026',

  // Common action words — shared across many pages
  'common.save':    'Save',
  'common.cancel':  'Cancel',
  'common.edit':    'Edit',
  'common.delete':  'Delete',
  'common.add':     'Add',
  'common.search':  'Search',
  'common.actions': 'Actions',
  'common.status':  'Status',
  'common.loading': 'Loading…',
  'common.noRecords': 'No records found',
  'common.close':   'Close',
  'common.seeAll':  'See all',
  'common.optional':'Optional',

  // Vehicle / device status words (shown on pills, filter chips, badges)
  'status.moving':   'Moving',
  'status.stopped':  'Stopped',
  'status.offline':  'Offline',
  'status.online':   'Online',
  'status.active':   'Active',
  'status.inactive': 'Inactive',
  'status.all':      'All',

  // Mobile app chrome (bottom nav, home screen, Settings, More menu)
  'mobile.home':        'Home',
  'mobile.tracking':     'Tracking',
  'mobile.map':          'Map',
  'mobile.more':         'More',
  'mobile.quickAccess':  'Quick Access',
  'mobile.fleetStatus':  'Fleet Status',
  'mobile.fleet':        'Fleet',
  'mobile.recentAlerts': 'Recent alerts',
  'mobile.moving':       'Moving',
  'mobile.account':      'Account',
  'mobile.system':       'System',
  'mobile.analytics':    'Analytics',
  'mobile.appearance':   'Appearance',
  'mobile.theme':        'Theme',
  'mobile.language':     'Language',
  'mobile.light':        'Light',
  'mobile.dark':         'Dark',
  'mobile.english':      'English',
  'mobile.khmer':        'Khmer',
  'mobile.administrator':'Administrator',
  'mobile.staff':        'Staff',

  // Live tracking / vehicle cards
  'mobile.speed':         'Speed',
  'mobile.battery':       'Battery',
  'mobile.signal':        'Signal',
  'mobile.searchVehicles':'Search vehicles...',
  'mobile.noVehiclesYet': 'No vehicles yet',
  'mobile.noVehiclesFound':'No vehicles found',
  'mobile.googleMapsKey': 'Google Maps Key',
  'mobile.enterApiKey':   'Enter your API key to enable maps',
  'mobile.loadMap':       'Load Map',
  'mobile.vehiclesWord':  'Vehicles',
  'mobile.unassigned':    'Unassigned',
  'mobile.driver':        'Driver',
  'mobile.vehicle':       'Vehicle',

  // Drivers screen
  'mobile.searchDrivers':   'Search drivers...',
  'mobile.noDrivers':       'No Drivers',
  'mobile.noDriversFound':  'No drivers found',
  'mobile.tapAddDriver':    'Tap + to add a driver',
  'mobile.tryDifferentSearch':'Try a different search or filter',
  'mobile.driverName':      'Driver Name',
  'mobile.phoneNumber':     'Phone Number',
  'mobile.licenseNumber':   'License Number',
  'mobile.noPhone':         'No phone',
  'mobile.addDriver':       'Add Driver',
  'mobile.editDriver':      'Edit Driver',
  'mobile.total':           'Total',
  'mobile.withVehicle':     'With Vehicle',
  'mobile.phone':           'Phone',
  'mobile.license':         'License',
  'mobile.vehicleAssignHint':'Set from the Vehicles page — change it there',
  'mobile.confirmDeleteDriver':'This driver will be permanently removed. Continue?',
};

const KM = {
  'nav.dashboard':   'ផ្ទាំងគ្រប់គ្រង',
  'nav.live':        'តាមដានផ្ទាល់',
  'nav.history':     'ប្រវត្តិ / លេងឡើងវិញ',
  'nav.historyTab':  'ប្រវត្តិ',
  'nav.alerts':      'ការជូនដំណឹង',
  'nav.geofences':   'ព្រំដែនភូមិសាស្ត្រ',
  'nav.reports':     'របាយការណ៍',
  'nav.drivers':     'អ្នកបើកបរ',
  'nav.devices':     'ឧបករណ៍ GPS',
  'nav.vehicles':    'យានយន្ត',
  'nav.maintenance': 'ការថែទាំ',
  'nav.fuel':        'កំណត់ត្រាប្រេងឥន្ធនៈ',
  'nav.users':       'អ្នកប្រើប្រាស់',
  'nav.settings':    'ការកំណត់',
  'nav.sms':         'សារ SMS',

  'sidebar.subtitle':       'ប្រព័ន្ធគ្រប់គ្រងយានយន្ត GPS',
  'sidebar.section.overview':   'ទិដ្ឋភាពទូទៅ',
  'sidebar.section.fleet':      'យានយន្ត',
  'sidebar.section.operations': 'ប្រតិបត្តិការ',
  'sidebar.section.admin':      'អ្នកគ្រប់គ្រង',
  'sidebar.section.more':       'ផ្សេងៗ',
  'sidebar.collapse': 'បង្រួមផ្ទាំងចំហៀង',
  'sidebar.expand':   'ពង្រីកផ្ទាំងចំហៀង',
  'sidebar.signOut':  'ចាកចេញ',

  'header.trackingLive':   'កំពុងតាមដានផ្ទាល់',
  'header.toLightMode':    'ប្តូរទៅពន្លឺ',
  'header.toDarkMode':     'ប្តូរទៅងងឹត',
  'header.toKhmer':        'ប្តូរទៅភាសាខ្មែរ',
  'header.toEnglish':      'ប្តូរទៅភាសាអង់គ្លេស',

  'login.brand':            'KVH GPS Fleet',
  'login.subtitle':         'ចូលទៅគណនីរបស់អ្នក',
  'login.username':         'ឈ្មោះអ្នកប្រើប្រាស់',
  'login.usernamePlaceholder': 'បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់',
  'login.password':         'ពាក្យសម្ងាត់',
  'login.passwordPlaceholder': 'បញ្ចូលពាក្យសម្ងាត់',
  'login.signingIn':        'កំពុងចូល…',
  'login.signIn':           'ចូល',
  'login.footer':           'Kong Veng Heng Co., Ltd. © 2026',

  'common.save':    'រក្សាទុក',
  'common.cancel':  'បោះបង់',
  'common.edit':    'កែសម្រួល',
  'common.delete':  'លុប',
  'common.add':     'បញ្ចូល',
  'common.search':  'ស្វែងរក',
  'common.actions': 'សកម្មភាព',
  'common.status':  'ស្ថានភាព',
  'common.loading': 'កំពុងផ្ទុក…',
  'common.noRecords': 'រកមិនឃើញទិន្នន័យ',
  'common.close':   'បិទ',
  'common.seeAll':  'មើលទាំងអស់',
  'common.optional':'ស្រេចចិត្ត',

  'status.moving':   'កំពុងបើក',
  'status.stopped':  'ឈប់',
  'status.offline':  'គ្មានសញ្ញា',
  'status.online':   'មានសញ្ញា',
  'status.active':   'សកម្ម',
  'status.inactive': 'អសកម្ម',
  'status.all':      'ទាំងអស់',

  'mobile.home':        'ទំព័រដើម',
  'mobile.tracking':     'តាមដាន',
  'mobile.map':          'ផែនទី',
  'mobile.more':         'ច្រើនទៀត',
  'mobile.quickAccess':  'ចំណុចចូលរហ័ស',
  'mobile.fleetStatus':  'ស្ថានភាពយានយន្ត',
  'mobile.fleet':        'យានយន្ត',
  'mobile.recentAlerts': 'ការជូនដំណឹងថ្មីៗ',
  'mobile.moving':       'កំពុងបើក',
  'mobile.account':      'គណនី',
  'mobile.system':       'ប្រព័ន្ធ',
  'mobile.analytics':    'វិភាគទិន្នន័យ',
  'mobile.appearance':   'រូបរាង',
  'mobile.theme':        'រចនាបថ',
  'mobile.language':     'ភាសា',
  'mobile.light':        'ពន្លឺ',
  'mobile.dark':         'ងងឹត',
  'mobile.english':      'អង់គ្លេស',
  'mobile.khmer':        'ខ្មែរ',
  'mobile.administrator':'អ្នកគ្រប់គ្រង',
  'mobile.staff':        'បុគ្គលិក',

  'mobile.speed':         'ល្បឿន',
  'mobile.battery':       'ថ្ម',
  'mobile.signal':        'សញ្ញា',
  'mobile.searchVehicles':'ស្វែងរកយានយន្ត...',
  'mobile.noVehiclesYet': 'មិនទាន់មានយានយន្តនៅឡើយ',
  'mobile.noVehiclesFound':'រកមិនឃើញយានយន្ត',
  'mobile.googleMapsKey': 'លេខសម្ងាត់ Google Maps',
  'mobile.enterApiKey':   'បញ្ចូលលេខសម្ងាត់ API ដើម្បីបើកផែនទី',
  'mobile.loadMap':       'ផ្ទុកផែនទី',
  'mobile.vehiclesWord':  'យានយន្ត',
  'mobile.unassigned':    'មិនទាន់កំណត់',
  'mobile.driver':        'អ្នកបើកបរ',
  'mobile.vehicle':       'យានយន្ត',

  'mobile.searchDrivers':   'ស្វែងរកអ្នកបើកបរ...',
  'mobile.noDrivers':       'មិនមានអ្នកបើកបរ',
  'mobile.noDriversFound':  'រកមិនឃើញអ្នកបើកបរ',
  'mobile.tapAddDriver':    'ចុច + ដើម្បីបញ្ចូលអ្នកបើកបរ',
  'mobile.tryDifferentSearch':'សាកល្បងស្វែងរក ឬតម្រងផ្សេង',
  'mobile.driverName':      'ឈ្មោះអ្នកបើកបរ',
  'mobile.phoneNumber':     'លេខទូរស័ព្ទ',
  'mobile.licenseNumber':   'លេខប័ណ្ណបើកបរ',
  'mobile.noPhone':         'គ្មានលេខទូរស័ព្ទ',
  'mobile.addDriver':       'បញ្ចូលអ្នកបើកបរ',
  'mobile.editDriver':      'កែសម្រួលអ្នកបើកបរ',
  'mobile.total':           'សរុប',
  'mobile.withVehicle':     'មានយានយន្ត',
  'mobile.phone':           'ទូរស័ព្ទ',
  'mobile.license':         'ប័ណ្ណបើកបរ',
  'mobile.vehicleAssignHint':'កំណត់ពីទំព័រយានយន្ត — ផ្លាស់ប្តូរនៅទីនោះ',
  'mobile.confirmDeleteDriver':'អ្នកបើកបរនេះនឹងត្រូវលុបជាអចិន្ត្រៃយ៍។ បន្ត?',
};

const DICTS = { en: EN, km: KM };

export const T = { ...EN };

const LANG_KEY = 'kvh_lang';

/** Looks up a translated string for the current language; falls back to the key itself. */
export function t(key) {
  return T[key] ?? key;
}

/** Mutates T in place to the given language's dictionary. */
export function applyLanguage(lang) {
  const dict = DICTS[lang] || DICTS.en;
  // Clear keys not present in the new dict (keeps T in sync if dictionaries ever diverge)
  Object.keys(T).forEach(k => { if (!(k in dict)) delete T[k]; });
  Object.assign(T, dict);
}

export function getSavedLanguage() {
  try { return localStorage.getItem(LANG_KEY) === 'km' ? 'km' : 'en'; }
  catch { return 'en'; }
}

export function saveLanguage(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}
