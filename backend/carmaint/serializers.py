from rest_framework import serializers
from .registry import REGISTRY

# One ModelSerializer per model, built off REGISTRY instead of 18 hand-written
# classes. SERIALIZERS[Model] -> serializer class, used by views.py.
SERIALIZERS = {}
for _slug, _model, _basename in REGISTRY:
    _meta = type('Meta', (), {'model': _model, 'fields': '__all__'})
    SERIALIZERS[_model] = type(_model.__name__ + 'Serializer', (serializers.ModelSerializer,), {'Meta': _meta})
