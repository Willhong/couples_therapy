from django.contrib import admin
from .models import DailyCheckIn, Streak

admin.site.register(DailyCheckIn)
admin.site.register(Streak)
