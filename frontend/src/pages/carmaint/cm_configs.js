import {
  ClipboardList, Truck, Wrench, BellRing, Receipt, Landmark, Droplets, Fuel,
  Cog, Settings2, Hammer, Construction, MapPin, UserPlus, Repeat,
  FileWarning, Coins, Wallet, Phone,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────
   Config for every "Car Maintenance" feature page — one entry per tile
   in the reference screenshot. CarMaintPage.jsx renders a working
   list + Add/Edit page from whichever config it's given, so these 18
   features share one component instead of 18 near-identical files.

   `slug` must match backend/carmaint/registry.py's REGISTRY url slugs
   and the matching key under api.carmaint in api/client.js.
   `id` must match the model's lowercase Django field names exactly —
   everything here lives in its own database (see carmaint app), never
   touching the existing Vehicles/Drivers tables.
   ────────────────────────────────────────────────────────────────── */

const DATE   = { type: 'date' }
const NUM    = { type: 'number' }
const DEC    = { type: 'decimal' }
const TEXT   = { type: 'text' }
const AREA   = { type: 'textarea' }
const CHK    = { type: 'checkbox' }
const URL    = { type: 'url' }
const sel = (options) => ({ type: 'select', options })

export const CONFIGS = {
  otherWork: {
    slug: 'other-work', apiKey: 'otherWork', icon: ClipboardList, color: '#2563EB',
    titleKm: 'តារាងការងារផ្សេងៗ', titleEn: 'Other Work',
    fields: [
      { key: 'work_name',   label: 'Work Name',    ...TEXT, required: true },
      { key: 'vehicle_name',label: 'Vehicle',       ...TEXT },
      { key: 'date',        label: 'Date',          ...DATE, required: true },
      { key: 'cost',        label: 'Cost',          ...DEC },
      { key: 'status',      label: 'Status',        ...sel(['pending','in_progress','done']) },
      { key: 'notes',       label: 'Notes',         ...AREA },
    ],
    columns: ['work_name','vehicle_name','date','cost','status'],
  },

  vehicleRoster: {
    slug: 'vehicle-roster', apiKey: 'vehicleRoster', icon: Truck, color: '#059669',
    titleKm: 'តារាងរថយន្ត', titleEn: 'Vehicle Table',
    fields: [
      { key: 'plate_number', label: 'Plate Number', ...TEXT, required: true },
      { key: 'brand',        label: 'Brand',         ...TEXT },
      { key: 'model_name',   label: 'Model',         ...TEXT },
      { key: 'year',         label: 'Year',          ...NUM },
      { key: 'color',        label: 'Color',         ...TEXT },
      { key: 'vehicle_type', label: 'Type',          ...TEXT },
      { key: 'owner_name',   label: 'Owner',         ...TEXT },
      { key: 'status',       label: 'Status',        ...sel(['active','inactive']) },
      { key: 'notes',        label: 'Notes',         ...AREA },
    ],
    columns: ['plate_number','brand','model_name','vehicle_type','owner_name','status'],
  },

  maintenanceRecords: {
    slug: 'maintenance-records', apiKey: 'maintenanceRecords', icon: Wrench, color: '#D97706',
    titleKm: 'តារាងការថែទាំ', titleEn: 'Maintenance Table',
    fields: [
      { key: 'vehicle_name',      label: 'Vehicle',  ...TEXT, required: true },
      { key: 'maintenance_type',  label: 'Type',      ...TEXT },
      { key: 'date',              label: 'Date',      ...DATE, required: true },
      { key: 'cost',              label: 'Cost',      ...DEC },
      { key: 'garage',            label: 'Garage',    ...TEXT },
      { key: 'next_due_date',     label: 'Next Due',  ...DATE },
      { key: 'notes',             label: 'Notes',     ...AREA },
    ],
    columns: ['vehicle_name','maintenance_type','date','cost','garage','next_due_date'],
  },

  reminders: {
    slug: 'reminders', apiKey: 'reminders', icon: BellRing, color: '#7C3AED',
    titleKm: 'តារាងរំលឹក', titleEn: 'Reminders',
    fields: [
      { key: 'title',       label: 'Title',        ...TEXT, required: true },
      { key: 'vehicle_name',label: 'Vehicle',       ...TEXT },
      { key: 'remind_date', label: 'Remind On',     ...DATE, required: true },
      { key: 'status',      label: 'Status',        ...sel(['pending','done']) },
      { key: 'notes',       label: 'Notes',         ...AREA },
    ],
    columns: ['title','vehicle_name','remind_date','status'],
  },

  feePayments: {
    slug: 'fee-payments', apiKey: 'feePayments', icon: Receipt, color: '#DC2626',
    titleKm: 'តារាងថ្ងៃបង់ឈាក', titleEn: 'Fee Payment Dates',
    fields: [
      { key: 'vehicle_name',       label: 'Vehicle',            type: 'vehicleSelect', required: true },
      { key: 'responsible_person', label: 'Responsible Person', ...TEXT },
      { key: 'prev_due_date',      label: 'Previous Due Date',  ...DATE },
      { key: 'next_due_date',      label: 'Next Due Date',      ...DATE, required: true },
      { key: 'notes',              label: 'Notes',              ...AREA },
    ],
    columns: ['vehicle_name','responsible_person','next_due_date','prev_due_date','notes'],
    showRowNumber: true, rowNumberLabel: 'ល.រ',
  },

  taxPayments: {
    slug: 'tax-payments', apiKey: 'taxPayments', icon: Landmark, color: '#0EA5E9',
    titleKm: 'តារាងថ្ងៃបង់ពន្ធ', titleEn: 'Tax Payment Dates',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',   ...TEXT },
      { key: 'tax_type',     label: 'Tax Type',  ...TEXT },
      { key: 'due_date',     label: 'Due Date',  ...DATE, required: true },
      { key: 'amount',       label: 'Amount',    ...DEC },
      { key: 'paid',         label: 'Paid',      ...CHK },
      { key: 'paid_date',    label: 'Paid On',   ...DATE },
      { key: 'notes',        label: 'Notes',     ...AREA },
    ],
    columns: ['vehicle_name','tax_type','due_date','amount','paid'],
  },

  oilChanges: {
    slug: 'oil-changes', apiKey: 'oilChanges', icon: Droplets, color: '#0EA5E9',
    titleKm: 'តារាងថ្ងៃប្តូរប្រេង', titleEn: 'Oil Change Dates',
    fields: [
      { key: 'vehicle_name',  label: 'Vehicle',       ...TEXT, required: true },
      { key: 'oil_type',      label: 'Oil Type',      ...TEXT },
      { key: 'change_date',   label: 'Change Date',   ...DATE, required: true },
      { key: 'next_due_km',   label: 'Next Due (km)', ...NUM },
      { key: 'next_due_date', label: 'Next Due Date', ...DATE },
      { key: 'cost',          label: 'Cost',          ...DEC },
      { key: 'notes',         label: 'Notes',         ...AREA },
    ],
    columns: ['vehicle_name','oil_type','change_date','next_due_date','cost'],
  },

  fuelRefills: {
    slug: 'fuel-refills', apiKey: 'fuelRefills', icon: Fuel, color: '#D97706',
    titleKm: 'តារាងការចាក់ប្រេង', titleEn: 'Fuel Refills',
    fields: [
      { key: 'vehicle_name',    label: 'Vehicle',        ...TEXT, required: true },
      { key: 'date',            label: 'Date',           ...DATE, required: true },
      { key: 'liters',          label: 'Liters',         ...DEC },
      { key: 'price_per_liter', label: 'Price / Liter',  ...DEC },
      { key: 'total_cost',      label: 'Total Cost',     ...DEC },
      { key: 'station',         label: 'Station',        ...TEXT },
      { key: 'notes',           label: 'Notes',          ...AREA },
    ],
    columns: ['vehicle_name','date','liters','total_cost','station'],
  },

  gearboxOilChanges: {
    slug: 'gearbox-oil-changes', apiKey: 'gearboxOilChanges', icon: Cog, color: '#059669',
    titleKm: 'តារាងប្តូរប្រេងប្រអប់លេខ', titleEn: 'Gearbox Oil Changes',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',       ...TEXT, required: true },
      { key: 'date',         label: 'Date',          ...DATE, required: true },
      { key: 'oil_type',     label: 'Oil Type',      ...TEXT },
      { key: 'cost',         label: 'Cost',          ...DEC },
      { key: 'next_due_km',  label: 'Next Due (km)', ...NUM },
      { key: 'notes',        label: 'Notes',         ...AREA },
    ],
    columns: ['vehicle_name','date','oil_type','cost','next_due_km'],
  },

  differentialOilChanges: {
    slug: 'differential-oil-changes', apiKey: 'differentialOilChanges', icon: Settings2, color: '#059669',
    titleKm: 'តារាងប្តូរប្រេងប៉ុង', titleEn: 'Differential Oil Changes',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',       ...TEXT, required: true },
      { key: 'date',         label: 'Date',          ...DATE, required: true },
      { key: 'oil_type',     label: 'Oil Type',      ...TEXT },
      { key: 'cost',         label: 'Cost',          ...DEC },
      { key: 'next_due_km',  label: 'Next Due (km)', ...NUM },
      { key: 'notes',        label: 'Notes',         ...AREA },
    ],
    columns: ['vehicle_name','date','oil_type','cost','next_due_km'],
  },

  miscRepairCosts: {
    slug: 'misc-repair-costs', apiKey: 'miscRepairCosts', icon: Hammer, color: '#DC2626',
    titleKm: 'តារាងថ្លៃជួសជុលផ្សេងៗ', titleEn: 'Misc Repair Costs',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',      ...TEXT, required: true },
      { key: 'repair_item',  label: 'Repair Item',  ...TEXT, required: true },
      { key: 'date',         label: 'Date',         ...DATE, required: true },
      { key: 'cost',         label: 'Cost',         ...DEC },
      { key: 'garage',       label: 'Garage',       ...TEXT },
      { key: 'notes',        label: 'Notes',        ...AREA },
    ],
    columns: ['vehicle_name','repair_item','date','cost','garage'],
  },

  vehiclesUnderRepair: {
    slug: 'vehicles-under-repair', apiKey: 'vehiclesUnderRepair', icon: Construction, color: '#D97706',
    titleKm: 'តារាងរថយន្តកំពុងជួសជុល', titleEn: 'Vehicles Under Repair',
    fields: [
      { key: 'vehicle_name',       label: 'Vehicle',       ...TEXT, required: true },
      { key: 'issue',              label: 'Issue',         ...TEXT, required: true },
      { key: 'garage',             label: 'Garage',        ...TEXT },
      { key: 'date_in',            label: 'Date In',       ...DATE, required: true },
      { key: 'expected_date_out',  label: 'Expected Out',  ...DATE },
      { key: 'status',             label: 'Status',        ...sel(['in_progress','done']) },
      { key: 'cost',               label: 'Cost',          ...DEC },
      { key: 'notes',              label: 'Notes',         ...AREA },
    ],
    columns: ['vehicle_name','issue','garage','date_in','status'],
  },

  fuelStations: {
    slug: 'fuel-stations', apiKey: 'fuelStations', icon: MapPin, color: '#DC2626',
    titleKm: 'តារាងស្ថានីយ៍ប្រេងឥន្ធនៈ', titleEn: 'Fuel Stations',
    fields: [
      { key: 'code',         label: 'Code',         ...TEXT },
      { key: 'station_name', label: 'Station Name', ...TEXT, required: true },
      { key: 'location',     label: 'Location',     ...TEXT },
      { key: 'phone',        label: 'Phone',        ...TEXT },
      { key: 'maps_link',    label: 'Google Maps Link', ...URL },
      { key: 'notes',        label: 'Notes',        ...AREA },
    ],
    columns: ['code','station_name','location','phone'],
    mapLinkKey: 'maps_link',
  },

  vehicleUsers: {
    slug: 'vehicle-users', apiKey: 'vehicleUsers', icon: UserPlus, color: '#2563EB',
    titleKm: 'តារាងអ្នកប្រើប្រាស់រថយន្ត', titleEn: 'Vehicle Users',
    showRowNumber: true, rowNumberLabel: 'ល.រ',
    fields: [
      { key: 'user_name', label: 'ឈ្មោះអ្នកប្រើប្រាស់', ...TEXT, required: true },
      { key: 'phone',     label: 'លេខទូរស័ព្ទ', ...TEXT },
      { key: 'address',   label: 'អស័យដ្ឋាន', ...TEXT },
      { key: 'notes',     label: 'ផ្សេងៗ', ...TEXT },
    ],
    columns: ['user_name','phone','address','notes'],
  },

  vehicleUserChanges: {
    slug: 'vehicle-user-changes', apiKey: 'vehicleUserChanges', icon: Repeat, color: '#7C3AED',
    titleKm: 'តារាងផ្លាស់ប្ដូរអ្នកប្រើប្រាស់រថយន្ត', titleEn: 'Vehicle User Changes',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',        ...TEXT, required: true },
      { key: 'old_user',     label: 'Previous User',  ...TEXT },
      { key: 'new_user',     label: 'New User',       ...TEXT, required: true },
      { key: 'change_date',  label: 'Change Date',    ...DATE, required: true },
      { key: 'reason',       label: 'Reason',         ...TEXT },
      { key: 'notes',        label: 'Notes',          ...AREA },
    ],
    columns: ['vehicle_name','old_user','new_user','change_date'],
  },

  outstandingInvoices: {
    slug: 'outstanding-invoices', apiKey: 'outstandingInvoices', icon: FileWarning, color: '#DC2626',
    titleKm: 'តារាងវិក្កយបត្រជំពាក់', titleEn: 'Outstanding Invoices',
    fields: [
      { key: 'vehicle_name', label: 'Vehicle',      ...TEXT },
      { key: 'invoice_no',   label: 'Invoice No.',  ...TEXT },
      { key: 'vendor',       label: 'Vendor',       ...TEXT },
      { key: 'amount',       label: 'Amount',       ...DEC, required: true },
      { key: 'due_date',     label: 'Due Date',     ...DATE },
      { key: 'status',       label: 'Status',       ...sel(['unpaid','paid']) },
      { key: 'notes',        label: 'Notes',        ...AREA },
    ],
    columns: ['vehicle_name','invoice_no','vendor','amount','due_date','status'],
  },

  exchangeRates: {
    slug: 'exchange-rates', apiKey: 'exchangeRates', icon: Coins, color: '#D97706',
    titleKm: 'អត្រាប្តូរប្រាក់', titleEn: 'Exchange Rate',
    fields: [
      { key: 'date',          label: 'Date',          ...DATE, required: true },
      { key: 'currency_from', label: 'From Currency', ...TEXT },
      { key: 'currency_to',   label: 'To Currency',   ...TEXT },
      { key: 'rate',          label: 'Rate',          ...DEC, required: true },
      { key: 'notes',         label: 'Notes',         ...AREA },
    ],
    columns: ['date','currency_from','currency_to','rate'],
  },

  expensePersons: {
    slug: 'expense-persons', apiKey: 'expensePersons', icon: Wallet, color: '#059669',
    titleKm: 'តារាងអ្នកចំណាយ', titleEn: 'Expense / Spenders',
    fields: [
      { key: 'name',    label: 'Name',    ...TEXT, required: true },
      { key: 'phone',   label: 'Phone',   ...TEXT },
      { key: 'address', label: 'Address', ...TEXT },
      { key: 'notes',   label: 'Notes',   ...AREA },
    ],
    columns: ['name','phone','address'],
    showRowNumber: true, rowNumberLabel: 'ល.ខ',
  },
}
