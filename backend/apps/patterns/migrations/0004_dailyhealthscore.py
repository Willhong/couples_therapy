"""Migration to create DailyHealthScore model."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('couples', '0001_initial'),
        ('patterns', '0003_add_intelligence_indexes'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyHealthScore',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateField()),
                ('score', models.IntegerField(help_text='Overall health score 0-100')),
                ('components', models.JSONField(default=dict, help_text='Breakdown: {mood, escalation, engagement, pattern_severity, cooldown}')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='health_scores', to=settings.AUTH_USER_MODEL)),
                ('couple', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='health_scores', to='couples.couple')),
            ],
            options={
                'db_table': 'daily_health_scores',
                'ordering': ['-date'],
                'unique_together': {('user', 'date')},
            },
        ),
    ]
