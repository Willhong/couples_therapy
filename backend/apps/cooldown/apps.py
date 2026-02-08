"""App configuration for cooldown."""

from django.apps import AppConfig


class CooldownConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cooldown'
    verbose_name = 'Cool-down Sessions'
