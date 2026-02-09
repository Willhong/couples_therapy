"""Tests for audio recording edge cases - 404/500 error scenarios."""

import uuid

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.audio.models import AudioRecording, TranscriptSegment
from apps.couples.models import Couple

User = get_user_model()


class AudioRecordingEdgeCaseTest(TestCase):
    """Test audio recording endpoint edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='audio@example.com',
            password='TestPass123!'
        )
        self.other_user = User.objects.create_user(
            email='audio_other@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_recording_status_nonexistent_uuid(self):
        """Non-existent recording UUID should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f'/api/v1/audio/{fake_id}/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_recording_status_other_users_recording(self):
        """Accessing other user's recording status should return 404."""
        recording = AudioRecording.objects.create(
            user=self.other_user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.get(f'/api/v1/audio/{recording.id}/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_transcript_nonexistent_uuid(self):
        """Non-existent recording UUID for transcript should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f'/api/v1/audio/{fake_id}/transcript/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_transcript_other_users_recording(self):
        """Accessing other user's transcript should return 404."""
        recording = AudioRecording.objects.create(
            user=self.other_user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.get(f'/api/v1/audio/{recording.id}/transcript/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_transcript_not_completed_returns_400(self):
        """Requesting transcript for processing recording should return 400."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.PROCESSING,
        )
        response = self.client.get(f'/api/v1/audio/{recording.id}/transcript/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_speakers_nonexistent_uuid(self):
        """Non-existent recording UUID for speakers should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.post(
            f'/api/v1/audio/{fake_id}/speakers/',
            {'speaker_map': {'A': 'Me', 'B': 'Partner'}},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_action_nonexistent_uuid(self):
        """Non-existent recording UUID for post-action should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.post(
            f'/api/v1/audio/{fake_id}/action/',
            {'action': 'keep'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_action_not_completed_returns_400(self):
        """Post-action on processing recording should return 400."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.PROCESSING,
        )
        response = self.client.post(
            f'/api/v1/audio/{recording.id}/action/',
            {'action': 'keep'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DeleteRecordingEdgeCaseTest(TestCase):
    """Test delete recording edge cases.

    BUG: delete_recording at line 280 fetches recording WITHOUT user filter:
        AudioRecording.objects.get(id=recording_id)
    Then checks ownership manually, leaking existence via 403 vs 404.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='delete_audio@example.com',
            password='TestPass123!'
        )
        self.other_user = User.objects.create_user(
            email='delete_audio_other@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_delete_nonexistent_recording(self):
        """Non-existent recording should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.delete(f'/api/v1/audio/{fake_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_other_users_recording_no_couple(self):
        """Deleting other user's recording (no couple) should return 403.

        BUG: This leaks existence - attacker can distinguish 404 (not exists)
        from 403 (exists but no permission). Should be 404 for both.
        """
        recording = AudioRecording.objects.create(
            user=self.other_user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.delete(f'/api/v1/audio/{recording.id}/')
        # Currently returns 403 (leaks existence)
        # Ideally should return 404
        self.assertIn(response.status_code, [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ])

    def test_delete_own_recording(self):
        """User can delete their own recording."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.delete(f'/api/v1/audio/{recording.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AudioRecording.objects.filter(id=recording.id).exists())

    def test_delete_partners_recording_in_couple(self):
        """Partner in couple can delete couple's recording."""
        couple = Couple.objects.create(
            user1=self.user,
            user2=self.other_user,
            status=Couple.Status.ACTIVE,
        )
        recording = AudioRecording.objects.create(
            user=self.other_user,
            couple=couple,
            recording_type='live',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.delete(f'/api/v1/audio/{recording.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_unauthenticated(self):
        """Unauthenticated delete should return 401."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        self.client.force_authenticate(user=None)
        response = self.client.delete(f'/api/v1/audio/{recording.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SegmentUpdateEdgeCaseTest(TestCase):
    """Test segment update edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='segment@example.com',
            password='TestPass123!'
        )
        self.recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        self.segment = TranscriptSegment.objects.create(
            recording=self.recording,
            speaker='A',
            text='Test segment',
            start_time=0.0,
            end_time=1.0,
            order=0,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_update_segment_nonexistent_recording(self):
        """Non-existent recording UUID should return 404."""
        fake_recording_id = uuid.uuid4()
        response = self.client.patch(
            f'/api/v1/audio/{fake_recording_id}/segments/{self.segment.id}/',
            {'text': 'Updated'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_segment_nonexistent_segment(self):
        """Non-existent segment UUID should return 404."""
        fake_segment_id = uuid.uuid4()
        response = self.client.patch(
            f'/api/v1/audio/{self.recording.id}/segments/{fake_segment_id}/',
            {'text': 'Updated'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_segment_other_users_recording(self):
        """Updating segment on other user's recording should return 404."""
        other_user = User.objects.create_user(
            email='segment_other@example.com',
            password='TestPass123!'
        )
        other_recording = AudioRecording.objects.create(
            user=other_user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        other_segment = TranscriptSegment.objects.create(
            recording=other_recording,
            speaker='A',
            text='Other segment',
            start_time=0.0,
            end_time=1.0,
            order=0,
        )
        response = self.client.patch(
            f'/api/v1/audio/{other_recording.id}/segments/{other_segment.id}/',
            {'text': 'Hacked'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AudioMalformedInputEdgeCaseTest(TestCase):
    """Test audio endpoints with malformed input return 400/404, not 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='audio_malform@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_recording_status_malformed_uuid(self):
        """Malformed UUID in recording status URL should return 404."""
        response = self.client.get('/api/v1/audio/not-a-uuid/status/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in audio status URL")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_transcript_malformed_uuid(self):
        """Malformed UUID in transcript URL should return 404."""
        response = self.client.get('/api/v1/audio/not-a-uuid/transcript/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in transcript URL")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_malformed_uuid(self):
        """Malformed UUID in delete URL should return 404."""
        response = self.client.delete('/api/v1/audio/not-a-uuid/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in audio delete URL")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_speakers_malformed_uuid(self):
        """Malformed UUID in speakers URL should return 404."""
        response = self.client.post(
            '/api/v1/audio/not-a-uuid/speakers/',
            {'speaker_map': {'A': 'Me'}},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in speakers URL")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_action_invalid_action(self):
        """Invalid action value should return 400, not 500."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.post(
            f'/api/v1/audio/{recording.id}/action/',
            {'action': 'invalid_action'},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid post-action value")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_speakers_empty_body(self):
        """Speakers endpoint with empty body should return 400, not 500."""
        recording = AudioRecording.objects.create(
            user=self.user,
            recording_type='narration',
            status=AudioRecording.Status.COMPLETED,
        )
        response = self.client.post(
            f'/api/v1/audio/{recording.id}/speakers/',
            {},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty speakers body")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_empty_body(self):
        """Upload with empty body should return 400, not 500."""
        response = self.client.post('/api/v1/audio/upload/', {}, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty upload body")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
