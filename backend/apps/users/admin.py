from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin."""

    list_display = (
        'email',
        'first_name',
        'last_name',
        'disclaimer_accepted',
        'onboarding_completed',
        'is_staff',
        'date_joined',
    )
    list_filter = (
        'is_staff',
        'is_superuser',
        'is_active',
        'disclaimer_accepted',
        'onboarding_completed',
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Disclaimer', {
            'fields': (
                'disclaimer_accepted',
                'disclaimer_accepted_at',
                'disclaimer_version',
            )
        }),
        ('Progress', {
            'fields': (
                'onboarding_completed',
                'tutorial_completed',
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
