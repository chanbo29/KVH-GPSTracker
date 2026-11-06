# No-op: the DriverContact feature was superseded before this migration was
# ever applied — the data now lives on VehicleUser instead (see
# 0006_vehicleuser_restructure.py). Kept as an empty migration rather than
# deleted so migration history stays contiguous.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('carmaint', '0004_cardname_drivername'),
    ]

    operations = []
