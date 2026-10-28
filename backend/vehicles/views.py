import json
import pytz
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from django.db import IntegrityError
from .models import MaintenanceLog, FuelLog
from .serializers import MaintenanceLogSerializer, FuelLogSerializer

from .models import Vehicle, GPSLog, Driver, Alert, GPSDevice, Client, Geofence
from .serializers import (
    VehicleSerializer, GPSLogSerializer, ReceiveGPSSerializer,
    DriverSerializer, AlertSerializer, GPSDeviceSerializer,
    ClientSerializer, GeofenceSerializer,
)

# Cambodia timezone
CAMBODIA_TZ = pytz.timezone('Asia/Phnom_Penh')

def cambodia_now():
    return timezone.now().astimezone(CAMBODIA_TZ).strftime('%Y-%m-%d %H:%M')


# ── Vehicle ───────────────────────────────────────────────────
class VehicleViewSet(viewsets.ModelViewSet):
    queryset         = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    lookup_field     = 'imei'

    def get_object(self):
        # Most vehicles are looked up by IMEI (lookup_field='imei'), but a vehicle
        # with no GPS device attached has an empty imei, so there's no IMEI to put
        # in the URL for it. For that case, fall back to matching on the numeric
        # vehicle_id (primary key) instead of 404ing.
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        queryset = self.filter_queryset(self.get_queryset())
        if lookup_value and str(lookup_value).isdigit():
            try:
                obj = queryset.get(imei=lookup_value)
            except Vehicle.DoesNotExist:
                obj = get_object_or_404(queryset, vehicle_id=lookup_value)
        else:
            obj = get_object_or_404(queryset, imei=lookup_value)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        qs      = Vehicle.objects.all()
        vtype   = self.request.query_params.get('type')
        vstatus = self.request.query_params.get('status')
        if vtype:   qs = qs.filter(type=vtype)
        if vstatus: qs = qs.filter(status=vstatus)
        return qs

    def create(self, request, *args, **kwargs):
        print("=== VEHICLE CREATE ===")
        print("DATA:", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("=== ERRORS ===", serializer.errors)
            return Response(serializer.errors, status=400)
        try:
            self.perform_create(serializer)
        except IntegrityError:
            # Most likely a second vehicle with no IMEI — some DB setups only allow
            # one NULL/blank value under a unique constraint.
            return Response(
                {'imei': ['Another vehicle with no GPS device already exists. Only one vehicle without a device is allowed at a time — attach a device to it first, or give this one an IMEI.']},
                status=400,
            )
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def history(self, request, imei=None):
        vehicle = self.get_object()
        date    = request.query_params.get('date')
        logs    = GPSLog.objects.filter(imei=vehicle.imei)
        if date:
            logs = logs.filter(timestamp__date=date)
        return Response(GPSLogSerializer(logs[:500], many=True).data)

    @action(detail=False, methods=['post'], url_path='receive-gps')
    def receive_gps(self, request):
        ser = ReceiveGPSSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        d = ser.validated_data
        try:
            vehicle = Vehicle.objects.get(imei=d['imei'])
        except Vehicle.DoesNotExist:
            return Response(
                {'error': f"IMEI {d['imei']} not registered."},
                status=404
            )
        GPSLog.objects.create(
            imei       = d['imei'],
            latitude   = d['latitude'],
            longitude  = d['longitude'],
            speed      = d['speed'],
            direction  = d['direction'],
            altitude   = d['altitude'],
            satellites = d['satellites'],
            timestamp  = timezone.now(),
        )
        new_status = 'moving' if d['speed'] > 5 else 'stopped'
        # status_since only moves forward when the status actually changes,
        # so "stopped for ..." on the frontend measures from the moment the
        # vehicle actually stopped, not from the last GPS update.
        update_fields = {'status': new_status, 'battery': d['battery'], 'signal': d['signal']}
        if vehicle.status != new_status or not vehicle.status_since:
            update_fields['status_since'] = timezone.now()
        Vehicle.objects.filter(imei=d['imei']).update(**update_fields)
        return Response({'status': 'ok', 'imei': d['imei']})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = Vehicle.objects.all()
        return Response({
            'total':   qs.count(),
            'moving':  qs.filter(status='moving').count(),
            'stopped': qs.filter(status='stopped').count(),
            'online':  qs.exclude(status='offline').count(),
            'offline': qs.filter(status='offline').count(),
            'alerts':  Alert.objects.filter(status='unread').count(),
        })


# ── Driver ────────────────────────────────────────────────────
class DriverViewSet(viewsets.ModelViewSet):
    queryset         = Driver.objects.all()
    serializer_class = DriverSerializer

    def get_queryset(self):
        qs = Driver.objects.all()
        s  = self.request.query_params.get('status')
        if s: qs = qs.filter(status=s)
        return qs


# ── Alert ─────────────────────────────────────────────────────
class AlertViewSet(viewsets.ModelViewSet):
    queryset         = Alert.objects.all()
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs    = Alert.objects.all()
        atype = self.request.query_params.get('type')
        ast   = self.request.query_params.get('status')
        if atype: qs = qs.filter(type=atype)
        if ast:   qs = qs.filter(status=ast)
        return qs

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Alert.objects.filter(status='unread').update(status='read')
        return Response({'status': 'ok'})


# ── GPS Device ────────────────────────────────────────────────
class GPSDeviceViewSet(viewsets.ModelViewSet):
    queryset         = GPSDevice.objects.all()
    serializer_class = GPSDeviceSerializer


# ── Client ────────────────────────────────────────────────────
class ClientViewSet(viewsets.ModelViewSet):
    queryset         = Client.objects.all()
    serializer_class = ClientSerializer

    def get_queryset(self):
        qs   = Client.objects.all()
        role = self.request.query_params.get('role')
        st   = self.request.query_params.get('status')
        if role: qs = qs.filter(role=role)
        if st:   qs = qs.filter(status=st)
        return qs

    def create(self, request, *args, **kwargs):
        print("=== CLIENT CREATE ===")
        print("DATA:", request.data)

        perms = request.data.get('permissions', [])
        if isinstance(perms, list):
            perms_json = json.dumps(perms)
        else:
            perms_json = '[]'

        try:
            client = Client(
                name        = request.data.get('name', ''),
                username    = request.data.get('username', ''),
                email       = request.data.get('email', ''),
                password    = request.data.get('password', ''),
                role        = request.data.get('role', 'staff'),
                status      = request.data.get('status', 'active'),
                permissions = perms_json,
                last_login  = 'Never',
            )
            client.save()
            print(f"=== CREATED: {client.name} | Perms: {client.permissions} ===")
            serializer = self.get_serializer(client)
            return Response(serializer.data, status=201)
        except Exception as e:
            print(f"=== CREATE ERROR: {e} ===")
            return Response({'error': str(e)}, status=400)

    def update(self, request, *args, **kwargs):
        print("=== CLIENT UPDATE ===")
        print("DATA RECEIVED:", request.data)

        instance = self.get_object()

        if 'name' in request.data:
            instance.name = request.data['name']
        if 'username' in request.data:
            instance.username = request.data['username']
        if 'email' in request.data:
            instance.email = request.data['email']
        if 'role' in request.data:
            instance.role = request.data['role']
        if 'status' in request.data:
            instance.status = request.data['status']

        # Only update password if provided
        if 'password' in request.data and request.data['password']:
            instance.password = request.data['password']

        # Convert permissions list to JSON string
        if 'permissions' in request.data:
            perms = request.data['permissions']
            if isinstance(perms, list):
                instance.permissions = json.dumps(perms)
            elif isinstance(perms, str):
                instance.permissions = perms
            else:
                instance.permissions = '[]'
            print(f"PERMISSIONS SAVING: {instance.permissions}")

        instance.save()
        print(f"=== UPDATE SUCCESS: {instance.name} ===")
        print(f"Role: {instance.role}")
        print(f"Permissions: {instance.permissions}")

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        print(f"=== DELETING USER: {instance.name} | ID: {instance.client_id} ===")
        instance.delete()
        print("=== DELETED SUCCESSFULLY ===")
        return Response(status=204)


# ── Geofence ──────────────────────────────────────────────────
class GeofenceViewSet(viewsets.ModelViewSet):
    queryset         = Geofence.objects.all()
    serializer_class = GeofenceSerializer


# ── Client Login ──────────────────────────────────────────────
@api_view(['POST'])
def client_login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    print(f"=== LOGIN ATTEMPT: {username} ===")

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=400
        )

    try:
        client = Client.objects.get(username=username)
    except Client.DoesNotExist:
        print(f"=== USER NOT FOUND: {username} ===")
        return Response(
            {'error': 'Invalid username or password'},
            status=400
        )

    if client.status != 'active':
        print(f"=== USER INACTIVE: {username} ===")
        return Response(
            {'error': 'Your account is inactive. Contact administrator.'},
            status=400
        )

    if client.password != password:
        print(f"=== WRONG PASSWORD: {username} ===")
        return Response(
            {'error': 'Invalid username or password'},
            status=400
        )

    # Update last login — Cambodia time (UTC+7)
    Client.objects.filter(pk=client.client_id).update(
        last_login=cambodia_now()
    )

    # Parse permissions
    try:
        perms = json.loads(client.permissions)
        if not isinstance(perms, list):
            perms = []
    except Exception:
        perms = []

    # Admin always gets full access
    if client.role == 'admin':
        perms = [
            'dashboard', 'live', 'vehicles', 'history',
            'alerts', 'drivers', 'geofences', 'reports',
            'devices', 'users', 'settings',
        ]

    print(f"=== LOGIN SUCCESS: {username} | Role: {client.role} | Perms: {perms} ===")

    return Response({
        'client_id':   client.client_id,
        'name':        client.name,
        'username':    client.username,
        'email':       client.email,
        'role':        client.role,
        'status':      client.status,
        'permissions': perms,
    })
 
class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset         = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
 
    def get_queryset(self):
        qs = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle_id')
        status_f   = self.request.query_params.get('status')
        if vehicle_id: qs = qs.filter(vehicle_id=vehicle_id)
        if status_f:   qs = qs.filter(status=status_f)
        # Auto-mark overdue records
        today = timezone.localdate()
        qs.filter(status='scheduled', next_date__lt=today).update(status='overdue')
        return qs
 
    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
 
 
class FuelLogViewSet(viewsets.ModelViewSet):
    queryset         = FuelLog.objects.all()
    serializer_class = FuelLogSerializer
 
    def get_queryset(self):
        qs = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle_id')
        if vehicle_id: qs = qs.filter(vehicle_id=vehicle_id)
        return qs
 
    def perform_create(self, serializer):
        # Auto-calculate distance since last fill for same vehicle
        vehicle_id = serializer.validated_data.get('vehicle_id')
        odometer   = serializer.validated_data.get('odometer', 0)
        last = FuelLog.objects.filter(vehicle_id=vehicle_id).order_by('-odometer').first()
        distance = (odometer - last.odometer) if last and odometer > last.odometer else 0
        serializer.save(distance_since_last=distance)
 
    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)