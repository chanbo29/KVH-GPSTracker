from rest_framework.routers import DefaultRouter
from .registry import REGISTRY
from .views import VIEWSETS

router = DefaultRouter()
for slug, model, basename in REGISTRY:
    router.register(slug, VIEWSETS[model], basename=basename)

urlpatterns = router.urls
