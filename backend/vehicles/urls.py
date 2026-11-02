from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet, DriverViewSet, AlertViewSet,
    GPSDeviceViewSet, ClientViewSet, GeofenceViewSet,
    client_login,
    MaintenanceLogViewSet, FuelLogViewSet,
    SparePartViewSet, StockMovementViewSet,
    VehicleDocumentViewSet, ExpenseViewSet,
)

router = DefaultRouter()
router.register(r'vehicles',        VehicleViewSet,         basename='vehicle')
router.register(r'drivers',         DriverViewSet,          basename='driver')
router.register(r'alerts',          AlertViewSet,           basename='alert')
router.register(r'devices',         GPSDeviceViewSet,       basename='device')
router.register(r'clients',         ClientViewSet,          basename='client')
router.register(r'geofences',       GeofenceViewSet,        basename='geofence')
router.register(r'maintenance',     MaintenanceLogViewSet,  basename='maintenance')
router.register(r'fuel',            FuelLogViewSet,         basename='fuel')
router.register(r'spareparts',      SparePartViewSet,       basename='sparepart')
router.register(r'stockmovements',  StockMovementViewSet,   basename='stockmovement')
router.register(r'vehicledocuments',VehicleDocumentViewSet, basename='vehicledocument')
router.register(r'expenses',        ExpenseViewSet,         basename='expense')

urlpatterns = [
    # ⚠️ Login MUST be before router — router intercepts clients/login/ otherwise
    path('clients/login/', client_login, name='client-login'),
    path('', include(router.urls)),
]
