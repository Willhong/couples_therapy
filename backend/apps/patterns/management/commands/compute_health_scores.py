"""Management command to compute daily health scores for all active users."""

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.couples.models import Couple
from apps.patterns.models import DailyHealthScore
from apps.patterns.services.health_score import HealthScoreService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Compute daily health scores for all active users.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=str,
            help='Compute for a specific user ID only.',
        )

    def handle(self, *args, **options):
        service = HealthScoreService()
        today = timezone.now().date()
        user_id = options.get('user_id')

        if user_id:
            self._compute_for_user(service, user_id, today, couple_id=None)
            self.stdout.write(self.style.SUCCESS(f'Computed health score for user {user_id}'))
            return

        # Process all active couples
        couples = Couple.objects.filter(status=Couple.Status.ACTIVE)
        computed = 0

        for couple in couples:
            for uid in [couple.user1_id, couple.user2_id]:
                if uid is None:
                    continue
                try:
                    self._compute_for_user(service, uid, today, couple_id=couple.id)
                    computed += 1
                except Exception as e:
                    logger.exception(f'Failed to compute health score for user {uid}: {e}')

        # Also process solo users (users with no active couple)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        coupled_user_ids = set()
        for couple in couples:
            if couple.user1_id:
                coupled_user_ids.add(couple.user1_id)
            if couple.user2_id:
                coupled_user_ids.add(couple.user2_id)

        solo_users = User.objects.filter(is_active=True).exclude(id__in=coupled_user_ids)
        for user in solo_users:
            try:
                self._compute_for_user(service, user.id, today, couple_id=None)
                computed += 1
            except Exception as e:
                logger.exception(f'Failed to compute health score for solo user {user.id}: {e}')

        self.stdout.write(self.style.SUCCESS(f'Computed {computed} health scores'))

    def _compute_for_user(self, service, user_id, today, couple_id):
        """Compute and save health score for a single user."""
        result = service.compute(user_id, couple_id=couple_id)
        DailyHealthScore.objects.update_or_create(
            user_id=user_id,
            date=today,
            defaults={
                'couple_id': couple_id,
                'score': result['score'],
                'components': result['components'],
            },
        )
