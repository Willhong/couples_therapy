"""Cache invalidation signals for UserIntelligenceService.

On save of UserProfile, Pattern, DailyCheckIn, or SafetyAssessment,
bust the cached user intelligence context so the next chat message
gets fresh data.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='onboarding.UserProfile')
def invalidate_on_profile_save(sender, instance, **kwargs):
    from apps.core.services.user_intelligence import UserIntelligenceService
    UserIntelligenceService.invalidate_cache(instance.user_id)


@receiver(post_save, sender='patterns.Pattern')
def invalidate_on_pattern_save(sender, instance, **kwargs):
    from apps.core.services.user_intelligence import UserIntelligenceService
    UserIntelligenceService.invalidate_cache(instance.user_id)


@receiver(post_save, sender='checkins.DailyCheckIn')
def invalidate_on_checkin_save(sender, instance, **kwargs):
    from apps.core.services.user_intelligence import UserIntelligenceService
    UserIntelligenceService.invalidate_cache(instance.user_id)


@receiver(post_save, sender='safety.SafetyAssessment')
def invalidate_on_safety_save(sender, instance, **kwargs):
    from apps.core.services.user_intelligence import UserIntelligenceService
    UserIntelligenceService.invalidate_cache(instance.user_id)
