import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.couples.models import Couple
from apps.intelligence.models import InsightReport
from apps.intelligence.services.analysis_graph import run_analysis
from apps.intelligence.services.trigger_service import TriggerResult, TriggerTier
from apps.intelligence.tasks import on_checkin_submitted

User = get_user_model()


class _MockLLMResponse:
    def __init__(self, content: str):
        self.content = content


class _MockLLM:
    def __init__(self, content: str):
        self._content = content

    def invoke(self, messages):
        return _MockLLMResponse(self._content)


class TestAnalysisPipelineE2E(TestCase):
    """End-to-end tests for analysis graph execution through run_analysis()."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='Passw0rd!'
        )
        self.partner = User.objects.create_user(
            email='partner@example.com',
            password='Passw0rd!'
        )
        self.couple = Couple.objects.create(
            user1=self.user,
            user2=self.partner,
            status=Couple.Status.ACTIVE,
        )

    def _make_report(self):
        return InsightReport.objects.create(
            user=self.user,
            couple=self.couple,
            trigger_tier=InsightReport.TriggerTier.PERIODIC,
            trigger_reason='periodic plan validation',
            data_period_start=date(2026, 1, 1),
            data_period_end=date(2026, 1, 14),
            report_title='initial',
            report_summary='initial',
            status=InsightReport.Status.PROCESSING,
        )

    @patch('apps.intelligence.services.analysis_graph._get_agent_model')
    @patch('apps.intelligence.services.data_collector.TherapyDataCollector.collect_therapy_context')
    def test_full_pipeline_produces_completed_report(
        self,
        mock_collect_therapy_context,
        mock_get_model,
    ):
        mock_collect_therapy_context.return_value = {
            'accumulated_patterns': {},
            'conversation_summaries': {},
            'weekly_summaries': [],
            'user_profile': {'attachment_style': 'secure'},
            'mood_trajectory': {},
            'audio_insights': {},
            'activity_engagement': {},
            'conflict_info': {},
        }

        mock_get_model.side_effect = [
            _MockLLM(json.dumps({
                'recurring_patterns': ['test'],
                'summary': 'test pattern',
            })),
            _MockLLM(json.dumps({
                'mood_interpretation': 'test',
                'summary': 'test emotion',
            })),
            _MockLLM(json.dumps({
                'balance_assessment': 'test',
                'summary': 'test balance',
            })),
            _MockLLM(json.dumps({
                'priority_actions': ['test'],
                'summary': 'test resolution',
            })),
            _MockLLM(json.dumps({
                'report_title': 'Test insight report',
                'report_summary': 'Test report summary',
                'key_insights': ['insight1'],
                'suggested_actions': ['action1'],
                'recommended_activities': ['activity1'],
            })),
            _MockLLM(json.dumps({
                'approved': True,
                'risk_level': 'low',
                'safety_concerns': [],
                'summary': 'approved',
            })),
        ]

        report = self._make_report()
        run_analysis(
            report_id=str(report.id),
            user_id=self.user.id,
            couple_id=self.couple.id,
            trigger_tier='periodic',
            trigger_reason='test',
        )

        report.refresh_from_db()

        self.assertEqual(report.status, InsightReport.Status.COMPLETED.value)
        self.assertTrue(report.report_title)
        self.assertTrue(report.report_summary)
        self.assertIsInstance(report.key_insights, list)
        self.assertGreater(len(report.key_insights), 0)
        self.assertIsInstance(report.suggested_actions, list)
        self.assertGreater(len(report.suggested_actions), 0)
        self.assertIsInstance(report.pattern_analysis, str)
        self.assertTrue(report.pattern_analysis)
        self.assertIsInstance(report.emotion_analysis, str)
        self.assertTrue(report.emotion_analysis)

    @patch('apps.intelligence.services.analysis_graph._get_agent_model')
    @patch('apps.intelligence.services.data_collector.TherapyDataCollector.collect_therapy_context')
    def test_ethics_block_marks_report_failed(
        self,
        mock_collect_therapy_context,
        mock_get_model,
    ):
        mock_collect_therapy_context.return_value = {
            'accumulated_patterns': {},
            'conversation_summaries': {},
            'weekly_summaries': [],
            'user_profile': {'attachment_style': 'secure'},
            'mood_trajectory': {},
            'audio_insights': {},
            'activity_engagement': {},
            'conflict_info': {},
        }

        mock_get_model.side_effect = [
            _MockLLM(json.dumps({
                'recurring_patterns': ['test'],
                'summary': 'test pattern',
            })),
            _MockLLM(json.dumps({
                'mood_interpretation': 'test',
                'summary': 'test emotion',
            })),
            _MockLLM(json.dumps({
                'balance_assessment': 'test',
                'summary': 'test balance',
            })),
            _MockLLM(json.dumps({
                'priority_actions': ['test'],
                'summary': 'test resolution',
            })),
            _MockLLM(json.dumps({
                'report_title': 'Test insight report',
                'report_summary': 'Test report summary',
                'key_insights': ['insight1'],
                'suggested_actions': ['action1'],
                'recommended_activities': ['activity1'],
            })),
            _MockLLM(json.dumps({
                'approved': False,
                'risk_level': 'low',
                'safety_concerns': ['test concern'],
                'summary': 'blocked',
            })),
        ]

        report = self._make_report()
        run_analysis(
            report_id=str(report.id),
            user_id=self.user.id,
            couple_id=self.couple.id,
            trigger_tier='periodic',
            trigger_reason='test',
        )

        report.refresh_from_db()

        self.assertEqual(report.status, InsightReport.Status.FAILED.value)
        self.assertFalse(report.ethics_review.get('approved'))


class TestTriggerWiring(TestCase):
    """Validation of trigger evaluation to dispatch wiring."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='checkin_user@example.com',
            password='Passw0rd!'
        )

    @patch('apps.intelligence.services.trigger_service.AnalysisTriggerService.evaluate')
    @patch('apps.intelligence.tasks.dispatch_multi_agent_analysis')
    def test_checkin_trigger_dispatches_analysis(self, mock_dispatch, mock_evaluate):
        mock_evaluate.return_value = TriggerResult(
            should_trigger=True,
            tier=TriggerTier.CRITICAL,
            reason='test reason',
        )

        on_checkin_submitted(self.user.id)

        mock_dispatch.delay.assert_called_once_with(
            str(self.user.id),
            TriggerTier.CRITICAL.value,
            'test reason',
        )


class CheckinTriggerWiringTest(TestCase):
    """Checkin endpoint wiring into intelligence trigger task."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='submitter@example.com',
            password='Passw0rd!'
        )
        self.partner = User.objects.create_user(
            email='partner@example.com',
            password='Passw0rd!'
        )

        Couple.objects.create(
            user1=self.user,
            user2=self.partner,
            status=Couple.Status.ACTIVE,
        )

        self.client = APIClient()

    @override_settings(ACCUMULATIVE_THERAPY_ENABLED=True)
    @patch('apps.intelligence.tasks.on_checkin_submitted.delay')
    def test_submit_checkin_dispatches_on_checkin_submitted(self, mock_delay):
        """Submitting a check-in should queue the on_checkin_submitted task."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            '/api/v1/checkins/',
            data={'mood': 3, 'note': 'steady mood today'},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_delay.assert_called_once_with(str(self.user.id))
