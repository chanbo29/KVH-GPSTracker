from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from .registry import REGISTRY
from .serializers import SERIALIZERS


def _make_viewset(model):
    serializer_class = SERIALIZERS[model]

    class _ViewSet(ModelViewSet):
        queryset = model.objects.all()

        def get_serializer_class(self):
            return serializer_class

        def destroy(self, request, *args, **kwargs):
            self.get_object().delete()
            return Response(status=204)

    _ViewSet.__name__ = model.__name__ + 'ViewSet'
    return _ViewSet


# VIEWSETS[Model] -> ModelViewSet subclass, used by urls.py router registration.
VIEWSETS = {model: _make_viewset(model) for _slug, model, _basename in REGISTRY}
