"""
Car Maintenance models — standalone feature set mirroring the reference
Khmer "CARS MAINTENANCE" menu screen. Lives in its OWN database
(see gps_backend/settings.py DATABASES['carmaint'] + db_router.py) so it
never touches the existing kvh_gpstracker tables or data.

Every model uses a free-text `vehicle_name` (not a ForeignKey) so this
app stays fully decoupled from the Vehicles table in the other database.
"""
from django.db import models


class OtherWork(models.Model):
    """តារាងការងារផ្សេងៗ — Other Work / Misc Jobs"""
    STATUS = [('pending', 'Pending'), ('in_progress', 'In Progress'), ('done', 'Done')]
    id          = models.AutoField(primary_key=True)
    work_name   = models.CharField(max_length=150)
    vehicle_name= models.CharField(max_length=100, blank=True)
    date        = models.DateField()
    cost        = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status      = models.CharField(max_length=20, choices=STATUS, default='pending')
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'OtherWorks'
        ordering = ['-date', '-id']


class VehicleRoster(models.Model):
    """តារាងរថយន្ត — Vehicle Table (standalone roster, separate from Vehicles)"""
    STATUS = [('active', 'Active'), ('inactive', 'Inactive')]
    id            = models.AutoField(primary_key=True)
    plate_number  = models.CharField(max_length=30)
    brand         = models.CharField(max_length=80, blank=True)
    model_name    = models.CharField(max_length=80, blank=True)
    year          = models.IntegerField(null=True, blank=True)
    color         = models.CharField(max_length=40, blank=True)
    vehicle_type  = models.CharField(max_length=40, blank=True)
    owner_name    = models.CharField(max_length=100, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default='active')
    notes         = models.TextField(blank=True)
    photo         = models.TextField(null=True, blank=True)  # base64 data-URL, kept small client-side
    location      = models.CharField(max_length=150, blank=True)      # ទីតាំងប្រើប្រាស់ — where the vehicle is based/used
    distance_unit = models.CharField(max_length=10, blank=True)       # ODO — Km / Mile
    fuel_type     = models.CharField(max_length=20, blank=True)       # រូបមន្ដ — Gasoline / Diesel / LPG / etc.
    driver_name   = models.CharField(max_length=150, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'VehicleRoster'
        ordering = ['plate_number']


class MaintenanceRecord(models.Model):
    """តារាងការថែទាំ — Maintenance Table"""
    id             = models.AutoField(primary_key=True)
    vehicle_name   = models.CharField(max_length=100)
    maintenance_type = models.CharField(max_length=100, blank=True)
    date           = models.DateField()
    cost           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    garage         = models.CharField(max_length=150, blank=True)
    next_due_date  = models.DateField(null=True, blank=True)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'MaintenanceRecords'
        ordering = ['-date', '-id']


class Reminder(models.Model):
    """តារាងរំលឹក — Reminder Table"""
    STATUS = [('pending', 'Pending'), ('done', 'Done')]
    id          = models.AutoField(primary_key=True)
    title       = models.CharField(max_length=150)
    vehicle_name= models.CharField(max_length=100, blank=True)
    remind_date = models.DateField()
    status      = models.CharField(max_length=20, choices=STATUS, default='pending')
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'Reminders'
        ordering = ['remind_date']


class FeePayment(models.Model):
    """តារាងថ្ងៃបង់ឈាក — Fee Payment Date Table"""
    id                  = models.AutoField(primary_key=True)
    vehicle_name        = models.CharField(max_length=100, blank=True)
    responsible_person  = models.CharField(max_length=150, blank=True)
    prev_due_date       = models.DateField(null=True, blank=True)
    next_due_date       = models.DateField()
    notes               = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'FeePayments'
        ordering = ['next_due_date']


class TaxPayment(models.Model):
    """តារាងថ្ងៃបង់ពន្ធ — Tax Payment Date Table"""
    id         = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100, blank=True)
    tax_type   = models.CharField(max_length=100, blank=True)
    due_date   = models.DateField()
    amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid       = models.BooleanField(default=False)
    paid_date  = models.DateField(null=True, blank=True)
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'TaxPayments'
        ordering = ['due_date']


class OilChange(models.Model):
    """តារាងថ្ងៃប្តូរប្រេង — Oil Change Date Table (engine oil)"""
    id            = models.AutoField(primary_key=True)
    vehicle_name  = models.CharField(max_length=100)
    oil_type      = models.CharField(max_length=80, blank=True)
    change_date   = models.DateField()
    next_due_km   = models.IntegerField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    cost          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'OilChanges'
        ordering = ['-change_date', '-id']


class FuelRefill(models.Model):
    """តារាងការចាក់ប្រេង — Fuel Refill Table"""
    id               = models.AutoField(primary_key=True)
    vehicle_name     = models.CharField(max_length=100)
    date             = models.DateField()
    liters           = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    price_per_liter  = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    total_cost       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    station          = models.CharField(max_length=150, blank=True)
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'FuelRefills'
        ordering = ['-date', '-id']


class GearboxOilChange(models.Model):
    """តារាងប្តូរប្រេងប្រអប់លេខ — Gearbox / Transmission Oil Change Table"""
    id           = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100)
    date         = models.DateField()
    oil_type     = models.CharField(max_length=80, blank=True)
    cost         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    next_due_km  = models.IntegerField(null=True, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'GearboxOilChanges'
        ordering = ['-date', '-id']


class DifferentialOilChange(models.Model):
    """តារាងប្តូរប្រេងប៉ុង — Differential / Pump Oil Change Table"""
    id           = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100)
    date         = models.DateField()
    oil_type     = models.CharField(max_length=80, blank=True)
    cost         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    next_due_km  = models.IntegerField(null=True, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'DifferentialOilChanges'
        ordering = ['-date', '-id']


class MiscRepairCost(models.Model):
    """តារាងថ្លៃជួសជុលផ្សេងៗ — Misc Repair Cost Table"""
    id           = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100)
    repair_item  = models.CharField(max_length=150)
    date         = models.DateField()
    cost         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    garage       = models.CharField(max_length=150, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'MiscRepairCosts'
        ordering = ['-date', '-id']


class VehicleUnderRepair(models.Model):
    """តារាងរថយន្តកំពុងជួសជុល — Vehicles Under Repair Table"""
    STATUS = [('in_progress', 'In Progress'), ('done', 'Done')]
    id                = models.AutoField(primary_key=True)
    vehicle_name      = models.CharField(max_length=100)
    issue             = models.CharField(max_length=200)
    garage            = models.CharField(max_length=150, blank=True)
    date_in           = models.DateField()
    expected_date_out = models.DateField(null=True, blank=True)
    status            = models.CharField(max_length=20, choices=STATUS, default='in_progress')
    cost              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes             = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'VehiclesUnderRepair'
        ordering = ['-date_in', '-id']


class FuelStation(models.Model):
    """តារាងស្ថានីយ៍ប្រេងឥន្ធនៈ — Fuel Station Table"""
    id           = models.AutoField(primary_key=True)
    code         = models.CharField(max_length=30, blank=True)
    station_name = models.CharField(max_length=150)
    location     = models.CharField(max_length=200, blank=True)
    phone        = models.CharField(max_length=40, blank=True)
    fuel_types   = models.CharField(max_length=150, blank=True)
    maps_link    = models.URLField(max_length=500, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'FuelStations'
        ordering = ['station_name']


class VehicleUser(models.Model):
    """តារាងអ្នកប្រើប្រាស់រថយន្ត — flat driver/staff contact roster: name, phone,
    address, remarks. Independent of any single vehicle (see
    VehicleRoster.driver_name for the vehicle-to-driver link)."""
    id         = models.AutoField(primary_key=True)
    user_name  = models.CharField(max_length=150)
    phone      = models.CharField(max_length=255, blank=True)
    address    = models.CharField(max_length=150, blank=True)
    notes      = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'VehicleUsers'
        ordering = ['id']


class VehicleUserChange(models.Model):
    """តារាងផ្លាស់ប្ដូរអ្នកប្រើប្រាស់រថយន្ត — Vehicle User Change Table"""
    id           = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100)
    old_user     = models.CharField(max_length=100, blank=True)
    new_user     = models.CharField(max_length=100)
    change_date  = models.DateField()
    reason       = models.CharField(max_length=200, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'VehicleUserChanges'
        ordering = ['-change_date', '-id']


class OutstandingInvoice(models.Model):
    """តារាងវិក្កយបត្រជំពាក់ — Outstanding Invoice Table"""
    STATUS = [('unpaid', 'Unpaid'), ('paid', 'Paid')]
    id           = models.AutoField(primary_key=True)
    vehicle_name = models.CharField(max_length=100, blank=True)
    invoice_no   = models.CharField(max_length=100, blank=True)
    vendor       = models.CharField(max_length=150, blank=True)
    amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date     = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS, default='unpaid')
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'OutstandingInvoices'
        ordering = ['due_date']


class ExchangeRate(models.Model):
    """អត្រាប្តូរប្រាក់ — Currency Exchange Rate Table"""
    id            = models.AutoField(primary_key=True)
    date          = models.DateField()
    currency_from = models.CharField(max_length=10, default='USD')
    currency_to   = models.CharField(max_length=10, default='KHR')
    rate          = models.DecimalField(max_digits=12, decimal_places=4)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'ExchangeRates'
        ordering = ['-date', '-id']


class ExpensePerson(models.Model):
    """តារាងអ្នកចំណាយ — Expense / Spenders contact table"""
    id         = models.AutoField(primary_key=True)
    name       = models.CharField(max_length=150)
    phone      = models.CharField(max_length=255, blank=True)
    address    = models.CharField(max_length=200, blank=True)
    notes      = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'ExpensePersons'
        ordering = ['id']


class CardName(models.Model):
    """ឈ្មោះក្នុងកាតគ្រី — selectable list of registration-card names,
    managed from the Vehicle Table's Settings panel and used to populate
    the "Name in Card" dropdown on the Add/Edit Vehicle form."""
    id         = models.AutoField(primary_key=True)
    name       = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'CardNames'
        ordering = ['name']


class DriverName(models.Model):
    """អ្នកប្រើប្រាស់ — selectable list of driver/user names, managed from
    the Vehicle Table's Settings panel and used to populate the "Driver"
    dropdown on the Add/Edit Vehicle form. Picking one there also creates
    or updates the matching row in VehicleUsers so the two pages stay
    in sync."""
    id         = models.AutoField(primary_key=True)
    name       = models.CharField(max_length=100, unique=True)
    phone      = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'DriverNames'
        ordering = ['name']
