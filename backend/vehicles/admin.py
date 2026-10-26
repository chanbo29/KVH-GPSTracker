from django.contrib import admin
from .models import Vehicle, GPSLog

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ['name', 'imei', 'plate', 'owner', 'type', 'status', 'battery', 'signal']
    list_filter   = ['type', 'status']
    search_fields = ['name', 'imei', 'plate', 'owner']

@admin.register(GPSLog)
class GPSLogAdmin(admin.ModelAdmin):
    list_display  = ['imei', 'latitude', 'longitude', 'speed', 'timestamp']
    list_filter   = ['imei']
    search_fields = ['imei']
    ordering      = ['-timestamp']
