import json
from rest_framework import serializers
from .models import Vehicle, GPSLog, Driver, Alert, GPSDevice, Client, Geofence


class GPSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GPSLog
        fields = ['log_id', 'latitude', 'longitude', 'speed',
                  'direction', 'altitude', 'satellites', 'timestamp']


class VehicleSerializer(serializers.ModelSerializer):
    lat         = serializers.SerializerMethodField()
    lng         = serializers.SerializerMethodField()
    speed       = serializers.SerializerMethodField()
    last_update = serializers.SerializerMethodField()
    status_since = serializers.SerializerMethodField()

    class Meta:
        model  = Vehicle
        fields = ['vehicle_id', 'imei', 'name', 'type', 'plate',
                  'brand', 'model', 'owner', 'status', 'battery', 'signal',
                  'lat', 'lng', 'speed', 'last_update', 'status_since',
                  'created_at', 'updated_at']
        read_only_fields = ['vehicle_id', 'created_at', 'updated_at',
                            'lat', 'lng', 'speed', 'last_update', 'status_since']
        extra_kwargs = {
            'imei':    { 'required': False, 'allow_null': True, 'allow_blank': True, 'default': None },
            'brand':   { 'required': False, 'default': '',            'allow_blank': True },
            'model':   { 'required': False, 'default': '',            'allow_blank': True },
            'owner':   { 'required': False, 'default': 'Unassigned',  'allow_blank': True },
            'battery': { 'required': False, 'default': 100     },
            'signal':  { 'required': False, 'default': 4       },
            'status':  { 'required': False, 'default': 'parked'},
            'type':    { 'required': False, 'default': 'car'   },
            'plate':   { 'required': False, 'default': '',      'allow_blank': True },
        }

    def validate_imei(self, value):
        # A vehicle created without a GPS device submits imei:"" — treat that the
        # same as "no imei" (None) so it doesn't collide with other device-less
        # vehicles under the column's unique constraint.
        return value or None

    def get_lat(self, obj):
        log = obj.latest_log
        return float(log.latitude) if log else None

    def get_lng(self, obj):
        log = obj.latest_log
        return float(log.longitude) if log else None

    def get_speed(self, obj):
        log = obj.latest_log
        return log.speed if log else 0

    def get_last_update(self, obj):
        log = obj.latest_log
        return log.timestamp.strftime('%H:%M:%S') if log else None

    def get_status_since(self, obj):
        return obj.status_since.isoformat() if obj.status_since else None


class ReceiveGPSSerializer(serializers.Serializer):
    imei       = serializers.CharField(max_length=15)
    latitude   = serializers.FloatField()
    longitude  = serializers.FloatField()
    speed      = serializers.FloatField(default=0)
    direction  = serializers.FloatField(default=0)
    altitude   = serializers.FloatField(default=0)
    satellites = serializers.IntegerField(default=0)
    battery    = serializers.IntegerField(default=100)
    signal     = serializers.IntegerField(default=4)


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Driver
        fields = ['driver_id', 'name', 'phone', 'license',
                  'license_expiry', 'vehicle', 'status', 'created_at']
        read_only_fields = ['driver_id', 'created_at']
        extra_kwargs = {
            'phone':          { 'required': False, 'default': '',            'allow_blank': True },
            'license':        { 'required': False, 'default': '',            'allow_blank': True },
            'license_expiry': { 'required': False, 'allow_null': True,       'default': None     },
            'vehicle':        { 'required': False, 'default': 'Unassigned',  'allow_blank': True },
            'status':         { 'required': False, 'default': 'active',      'allow_blank': True },
        }
class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Alert
        fields = ['alert_id', 'type', 'vehicle', 'imei', 'alert_time',
                  'location', 'speed', 'status', 'description', 'created_at']
        read_only_fields = ['alert_id', 'alert_time', 'created_at']
        extra_kwargs = {
            'vehicle':     { 'required': False, 'default': ''      },
            'imei':        { 'required': False, 'default': ''      },
            'location':    { 'required': False, 'default': ''      },
            'speed':       { 'required': False, 'allow_null': True },
            'status':      { 'required': False, 'default': 'unread'},
            'description': { 'required': False, 'default': ''      },
        }


class GPSDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GPSDevice
        fields = ['device_id', 'imei', 'model', 'sim_number', 'vehicle',
                  'gps_status', 'last_connection', 'last_update',
                  'protocol', 'created_at']
        read_only_fields = ['device_id', 'created_at']
        extra_kwargs = {
            'model':           { 'required': False, 'default': '',           'allow_blank': True },
            'sim_number':      { 'required': False, 'default': '',           'allow_blank': True },
            'vehicle':         { 'required': False, 'default': 'Unassigned', 'allow_blank': True },
            'gps_status':      { 'required': False, 'default': 'offline',    'allow_blank': True },
            'last_connection': { 'required': False, 'default': '',           'allow_blank': True },
            'last_update':     { 'required': False, 'default': '',           'allow_blank': True },
            'protocol':        { 'required': False, 'default': 'GT06',       'allow_blank': True },
        }

class ClientSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model  = Client
        fields = ['client_id', 'name', 'username', 'email', 'password',
                  'role', 'status', 'permissions', 'last_login', 'created_at']
        read_only_fields = ['client_id', 'created_at']
        extra_kwargs = {
            'password':   { 'required': False, 'default': '',      'allow_blank': True },
            'role':       { 'required': False, 'default': 'staff'  },
            'status':     { 'required': False, 'default': 'active' },
            'last_login': { 'required': False, 'default': 'Never'  },
            'email':      { 'required': False, 'default': '',      'allow_blank': True },
        }

    def get_permissions(self, obj):
        try:
            result = json.loads(obj.permissions)
            return result if isinstance(result, list) else []
        except Exception:
            return []

    def to_internal_value(self, data):
        data = data.copy()
        if 'permissions' in data:
            perms = data['permissions']
            if isinstance(perms, list):
                data['permissions'] = json.dumps(perms)
            elif isinstance(perms, str):
                try:
                    json.loads(perms)
                except Exception:
                    data['permissions'] = '[]'
            else:
                data['permissions'] = '[]'
        else:
            data['permissions'] = '[]'
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        if 'password' in validated_data and not validated_data['password']:
            validated_data.pop('password')
        return super().update(instance, validated_data)

    def create(self, validated_data):
        if 'permissions' not in validated_data:
            validated_data['permissions'] = '[]'
        return super().create(validated_data)


class GeofenceSerializer(serializers.ModelSerializer):
    center      = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()

    class Meta:
        model  = Geofence
        fields = ['geofence_id', 'name', 'type', 'center_lat', 'center_lng',
                  'center', 'radius', 'coordinates', 'enabled',
                  'alert_entry', 'alert_exit', 'created_at']
        read_only_fields = ['geofence_id', 'created_at']
        extra_kwargs = {
            'type':        { 'required': False, 'default': 'circle' },
            'center_lat':  { 'required': False, 'allow_null': True  },
            'center_lng':  { 'required': False, 'allow_null': True  },
            'radius':      { 'required': False, 'default': 500      },
            'enabled':     { 'required': False, 'default': True     },
            'alert_entry': { 'required': False, 'default': True     },
            'alert_exit':  { 'required': False, 'default': True     },
        }

    def get_center(self, obj):
        if obj.center_lat and obj.center_lng:
            return { 'lat': float(obj.center_lat), 'lng': float(obj.center_lng) }
        return None

    def get_coordinates(self, obj):
        try:
            return json.loads(obj.coordinates)
        except Exception:
            return []

    def to_internal_value(self, data):
        data = data.copy()
        if 'coordinates' in data and isinstance(data['coordinates'], list):
            data['coordinates'] = json.dumps(data['coordinates'])
        if 'center' in data and isinstance(data['center'], dict):
            data['center_lat'] = data['center'].get('lat')
            data['center_lng'] = data['center'].get('lng')
        return super().to_internal_value(data)

from rest_framework import serializers
from .models import MaintenanceLog, FuelLog

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MaintenanceLog
        fields = '__all__'

    def validate(self, data):
        for f in ['technician','notes']:
            data.setdefault(f, '')
        return data


class FuelLogSerializer(serializers.ModelSerializer):
    consumption = serializers.SerializerMethodField()
    cost_per_km  = serializers.SerializerMethodField()

    class Meta:
        model  = FuelLog
        fields = '__all__'

    def get_consumption(self, obj):
        # L/100km
        if obj.distance_since_last and obj.distance_since_last > 0:
            return round(float(obj.liters) / obj.distance_since_last * 100, 2)
        return None

    def get_cost_per_km(self, obj):
        if obj.distance_since_last and obj.distance_since_last > 0:
            return round(float(obj.total_cost) / obj.distance_since_last, 3)
        return None
