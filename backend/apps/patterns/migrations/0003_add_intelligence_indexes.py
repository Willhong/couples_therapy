from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('patterns', '0002_pattern_patterns_user_id_a52f39_idx_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # Pattern: compound index for filtered time-range queries
                'CREATE INDEX IF NOT EXISTS "idx_pattern_user_type_created" ON "patterns" ("user_id", "pattern_type", "created_at" DESC);',
                # InsightSummary: compound index for correlation lookups
                'CREATE INDEX IF NOT EXISTS "idx_insight_summary_user_created" ON "insight_summaries" ("user_id", "created_at" DESC);',
                # CoolDown: index for time-range analytics
                'CREATE INDEX IF NOT EXISTS "idx_cooldown_user_started" ON "cooldown_sessions" ("user_id", "started_at" DESC);',
            ],
            reverse_sql=[
                'DROP INDEX IF EXISTS "idx_pattern_user_type_created";',
                'DROP INDEX IF EXISTS "idx_insight_summary_user_created";',
                'DROP INDEX IF EXISTS "idx_cooldown_user_started";',
            ],
        ),
    ]
