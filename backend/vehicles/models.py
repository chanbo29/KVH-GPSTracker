from django.db import models


class Vehicle(models.Model):
    vehicle_id = models.AutoField(primary_key=True, db_column='VehicleID')
    imei       = models.CharField(max_length=15, unique=True, null=True, blank=True, db_column='IMEI')
    name       = models.CharField(max_length=100, db_column='Name')
    type       = models.CharField(max_length=20,  db_column='Type',   default='car')
    plate      = models.CharField(max_length=20,  db_column='Plate',  default='')
    brand      = models.CharField(max_length=100, db_column='Brand',  default='')
    model      = models.CharField(max_length=100, db_column='Model',  default='')
    owner = models.CharField(max_length=100, db_column='Owner', default='Unassigned', blank=True)
    status     = models.CharField(max_length=20,  db_column='Status', default='parked')
    battery    = models.SmallIntegerField(default=100, db_column='Battery')
    signal     = models.SmallIntegerField(default=4,   db_column='Signal')
    created_at = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    updated_at = models.DateTimeField(auto_now=True,     db_column='UpdatedAt')

    class Meta:
        db_table = 'Vehicles'

    def __str__(self):
        return f"{self.name} ({self.imei})"

    @property
    def latest_log(self):
        return GPSLog.objects.filter(imei=self.imei).order_by('-timestamp').first()


class GPSLog(models.Model):
    log_id     = models.BigAutoField(primary_key=True, db_column='LogID')
    imei       = models.CharField(max_length=15, db_column='IMEI')
    latitude   = models.DecimalField(max_digits=10, decimal_places=8, db_column='Latitude')
    longitude  = models.DecimalField(max_digits=11, decimal_places=8, db_column='Longitude')
    speed      = models.FloatField(default=0, db_column='Speed')
    direction  = models.FloatField(default=0, db_column='Direction')
    altitude   = models.FloatField(default=0, db_column='Altitude')
    satellites = models.SmallIntegerField(default=0, db_column='Satellites')
    timestamp  = models.DateTimeField(db_column='Timestamp')
    created_at = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'GPSLogs'
        ordering = ['-timestamp']


class Driver(models.Model):
    driver_id      = models.AutoField(primary_key=True, db_column='DriverID')
    name           = models.CharField(max_length=100, db_column='Name')
    phone          = models.CharField(max_length=20,  db_column='Phone',   default='')
    license        = models.CharField(max_length=50,  db_column='License', default='')
    license_expiry = models.DateField(null=True, blank=True, db_column='LicenseExpiry')
    vehicle        = models.CharField(max_length=100, db_column='Vehicle', default='Unassigned')
    status         = models.CharField(max_length=20,  db_column='Status',  default='active')
    created_at     = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    updated_at     = models.DateTimeField(auto_now=True,     db_column='UpdatedAt')

    class Meta:
        db_table = 'Drivers'
        ordering = ['name']


class Alert(models.Model):
    alert_id    = models.AutoField(primary_key=True, db_column='AlertID')
    type        = models.CharField(max_length=50,  db_column='Type')
    vehicle     = models.CharField(max_length=100, db_column='Vehicle',     default='')
    imei        = models.CharField(max_length=15,  db_column='IMEI',        default='')
    alert_time  = models.DateTimeField(auto_now_add=True, db_column='AlertTime')
    location    = models.CharField(max_length=200, db_column='Location',    default='')
    speed       = models.FloatField(null=True, blank=True, db_column='Speed')
    status      = models.CharField(max_length=20,  db_column='Status',      default='unread')
    description = models.TextField(db_column='Description', default='')
    created_at  = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'Alerts'
        ordering = ['-alert_time']


class GPSDevice(models.Model):
    device_id       = models.AutoField(primary_key=True, db_column='DeviceID')
    imei            = models.CharField(max_length=15, unique=True, db_column='IMEI')
    model           = models.CharField(max_length=100, db_column='Model',          default='')
    sim_number      = models.CharField(max_length=20,  db_column='SIMNumber',      default='')
    vehicle         = models.CharField(max_length=100, db_column='Vehicle',        default='Unassigned')
    gps_status      = models.CharField(max_length=20,  db_column='GPSStatus',      default='offline')
    last_connection = models.CharField(max_length=50,  db_column='LastConnection', default='')
    last_update     = models.CharField(max_length=50,  db_column='LastUpdate',     default='')
    protocol        = models.CharField(max_length=50,  db_column='Protocol',       default='GT06')
    created_at      = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'GPSDevices'


class Client(models.Model):
    client_id   = models.AutoField(primary_key=True, db_column='ClientID')
    name        = models.CharField(max_length=100, db_column='Name')
    username    = models.CharField(max_length=50, unique=True, db_column='Username')
    email       = models.CharField(max_length=200, db_column='Email')
    password    = models.CharField(max_length=255, db_column='Password')
    role        = models.CharField(max_length=20,  db_column='Role',        default='staff')
    status      = models.CharField(max_length=20,  db_column='Status',      default='active')
    permissions = models.TextField(db_column='Permissions', default='[]')
    last_login  = models.CharField(max_length=50,  db_column='LastLogin',   default='Never')
    created_at  = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'Clients'


class Geofence(models.Model):
    geofence_id = models.AutoField(primary_key=True, db_column='GeofenceID')
    name        = models.CharField(max_length=100, db_column='Name')
    type        = models.CharField(max_length=20,  db_column='Type',        default='circle')
    center_lat  = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True, db_column='CenterLat')
    center_lng  = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True, db_column='CenterLng')
    radius      = models.FloatField(default=500, db_column='Radius')
    coordinates = models.TextField(db_column='Coordinates', default='[]')
    enabled     = models.BooleanField(default=True,  db_column='Enabled')
    alert_entry = models.BooleanField(default=True,  db_column='AlertEntry')
    alert_exit  = models.BooleanField(default=True,  db_column='AlertExit')
    created_at  = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        db_table = 'Geofences'

from django.db import models

class MaintenanceLog(models.Model):
    SERVICE_TYPES = [
        ('Oil Change',      'Oil Change'),
        ('Tire Rotation',   'Tire Rotation'),
        ('Tire Replacement','Tire Replacement'),
        ('Brake Service',   'Brake Service'),
        ('Air Filter',      'Air Filter'),
        ('Spark Plugs',     'Spark Plugs'),
        ('Battery',         'Battery'),
        ('Transmission',    'Transmission'),
        ('Cooling System',  'Cooling System'),
        ('AC Service',      'AC Service'),
        ('Inspection',      'Inspection'),
        ('Other',           'Other'),
    ]
    STATUS = [
        ('completed', 'Completed'),
        ('scheduled', 'Scheduled'),
        ('overdue',   'Overdue'),
    ]
    log_id          = models.AutoField(primary_key=True)
    vehicle_id      = models.IntegerField()
    vehicle_name    = models.CharField(max_length=100)
    # TextField (not CharField) — with ~45 possible service types now, selecting many at once
    # could produce a comma-joined string longer than a fixed max_length would safely hold.
    service_type    = models.TextField()
    date            = models.DateField()
    odometer        = models.IntegerField(default=0)
    cost            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    technician      = models.CharField(max_length=100, blank=True)
    notes           = models.TextField(blank=True)
    next_date       = models.DateField(null=True, blank=True)
    next_odometer   = models.IntegerField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS, default='completed')
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'MaintenanceLogs'
        ordering  = ['-date']

class FuelLog(models.Model):
    FUEL_TYPES = [
        ('Gasoline', 'Gasoline'),
        ('Diesel',   'Diesel'),
        ('Electric', 'Electric'),
    ]
    log_id               = models.AutoField(primary_key=True)
    vehicle_id           = models.IntegerField()
    vehicle_name         = models.CharField(max_length=100)
    date                 = models.DateField()
    liters               = models.DecimalField(max_digits=8, decimal_places=2)
    cost_per_liter       = models.DecimalField(max_digits=8, decimal_places=3)
    total_cost           = models.DecimalField(max_digits=10, decimal_places=2)
    odometer             = models.IntegerField()
    distance_since_last  = models.IntegerField(default=0)
    fuel_type            = models.CharField(max_length=20, choices=FUEL_TYPES, default='Gasoline')
    station              = models.CharField(max_length=100, blank=True)
    full_tank            = models.BooleanField(default=True)
    notes                = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'FuelLogs'
        ordering = ['-date']