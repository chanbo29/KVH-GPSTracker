"""
Single source of truth mapping each Car Maintenance feature to its model,
URL slug, and DRF basename. serializers.py, views.py and urls.py all build
off this list instead of repeating 18 near-identical class definitions.
"""
from . import models as m

# (url_slug, model, basename)
REGISTRY = [
    ('other-work',            m.OtherWork,              'otherwork'),
    ('vehicle-roster',        m.VehicleRoster,          'vehicleroster'),
    ('maintenance-records',   m.MaintenanceRecord,      'maintenancerecord'),
    ('reminders',             m.Reminder,               'reminder'),
    ('fee-payments',          m.FeePayment,             'feepayment'),
    ('tax-payments',          m.TaxPayment,              'taxpayment'),
    ('oil-changes',           m.OilChange,              'oilchange'),
    ('fuel-refills',          m.FuelRefill,             'fuelrefill'),
    ('gearbox-oil-changes',   m.GearboxOilChange,       'gearboxoilchange'),
    ('differential-oil-changes', m.DifferentialOilChange, 'differentialoilchange'),
    ('misc-repair-costs',     m.MiscRepairCost,         'miscrepaircost'),
    ('vehicles-under-repair', m.VehicleUnderRepair,     'vehicleunderrepair'),
    ('fuel-stations',         m.FuelStation,            'fuelstation'),
    ('vehicle-users',         m.VehicleUser,            'vehicleuser'),
    ('vehicle-user-changes',  m.VehicleUserChange,      'vehicleuserchange'),
    ('outstanding-invoices',  m.OutstandingInvoice,     'outstandinginvoice'),
    ('exchange-rates',        m.ExchangeRate,           'exchangerate'),
    ('expense-persons',       m.ExpensePerson,          'expenseperson'),
    ('card-names',            m.CardName,               'cardname'),
    ('driver-names',          m.DriverName,             'drivername'),
]
