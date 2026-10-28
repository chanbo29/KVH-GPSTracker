from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0004_alter_alert_options_alter_client_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehicle',
            name='status_since',
            field=models.DateTimeField(blank=True, null=True, db_column='StatusSince'),
        ),
        # Backfill existing rows so "stopped for ..." has a reasonable
        # starting point instead of showing nothing for vehicles that
        # already existed before this field was added.
        migrations.RunSQL(
            sql="UPDATE Vehicles SET StatusSince = UpdatedAt WHERE StatusSince IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
