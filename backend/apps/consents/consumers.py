"""WebSocket consumer for real-time consent and recording synchronization (SAFE-01)."""

import uuid
from datetime import timedelta

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db import models

from .models import RecordingConsent


class ConsentConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time consent and recording synchronization.

    Handles:
    - User presence (join/leave notifications)
    - Consent request initiation
    - Consent response (approve/decline)
    - Recording lifecycle (started/stop/stopped)
    - Real-time broadcast to both partners
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope['user']

        # Verify user is authenticated
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get user's active couple
        self.couple = await self.get_active_couple()
        if not self.couple:
            await self.close(code=4002)
            return

        # Join couple-specific group
        self.room_group_name = f'consent_{self.couple.id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify partner of presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'email': self.user.email,
            }
        )

        # Request presence from existing members
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_request',
                'requester_id': self.user.id,
            }
        )

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            # Notify partner of departure
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user.id,
                }
            )

            # Leave group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        """Handle incoming JSON messages."""
        action = content.get('action')

        if action == 'request_consent':
            await self.handle_consent_request(content)
        elif action == 'respond_consent':
            await self.handle_consent_response(content)
        elif action == 'withdraw_consent':
            await self.handle_consent_withdrawal(content)
        elif action == 'recording_started':
            await self.handle_recording_started(content)
        elif action == 'stop_recording':
            await self.handle_stop_recording(content)
        elif action == 'recording_stopped':
            await self.handle_recording_stopped(content)
        else:
            await self.send_json({
                'type': 'error',
                'message': f'Unknown action: {action}',
            })

    async def handle_consent_request(self, content):
        """Handle new consent request from requester."""
        session_id = content.get('session_id')

        if not session_id:
            await self.send_json({
                'type': 'error',
                'message': 'session_id is required',
            })
            return

        try:
            consent = await self.create_consent_request(session_id)

            # Broadcast consent request to partner
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'consent_requested',
                    'session_id': str(consent.session_id),
                    'requester_id': self.user.id,
                    'requester_email': self.user.email,
                    'expires_at': consent.expires_at.isoformat(),
                }
            )
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': str(e),
            })

    async def handle_consent_response(self, content):
        """Handle consent response from responder."""
        session_id = content.get('session_id')
        consented = content.get('consented', False)

        if not session_id:
            await self.send_json({
                'type': 'error',
                'message': 'session_id is required',
            })
            return

        try:
            status = await self.process_consent_response(session_id, consented)

            # Broadcast result to both partners
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'consent_updated',
                    'session_id': session_id,
                    'responder_id': self.user.id,
                    'consented': consented,
                    'status': status,
                }
            )
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': str(e),
            })

    async def handle_consent_withdrawal(self, content):
        """Handle consent withdrawal (cancel pending request)."""
        session_id = content.get('session_id')

        if not session_id:
            await self.send_json({
                'type': 'error',
                'message': 'session_id is required',
            })
            return

        try:
            await self.withdraw_consent(session_id)

            # Broadcast withdrawal to both partners
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'consent_withdrawn',
                    'session_id': session_id,
                    'withdrawn_by': self.user.id,
                }
            )
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': str(e),
            })

    async def handle_recording_started(self, content):
        """Handle recording started notification from initiator."""
        session_id = content.get('session_id')

        # Broadcast to partner that recording has started
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'recording_started',
                'session_id': session_id,
                'started_by': self.user.id,
            }
        )

    async def handle_stop_recording(self, content):
        """Handle stop recording request from either partner."""
        session_id = content.get('session_id')

        # Broadcast stop to both partners
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'stop_recording',
                'session_id': session_id,
                'stopped_by': self.user.id,
            }
        )

    async def handle_recording_stopped(self, content):
        """Handle recording stopped confirmation."""
        session_id = content.get('session_id')

        # Broadcast that recording has been stopped
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'recording_stopped',
                'session_id': session_id,
                'stopped_by': self.user.id,
            }
        )

    # Event handlers (called by group_send)
    async def consent_requested(self, event):
        """Send consent_requested event to client."""
        await self.send_json({
            'type': 'consent_requested',
            'session_id': event['session_id'],
            'requester_id': event['requester_id'],
            'requester_email': event.get('requester_email'),
            'expires_at': event['expires_at'],
        })

    async def consent_updated(self, event):
        """Send consent_updated event to client."""
        await self.send_json({
            'type': 'consent_updated',
            'session_id': event['session_id'],
            'responder_id': event['responder_id'],
            'consented': event['consented'],
            'status': event['status'],
        })

    async def consent_withdrawn(self, event):
        """Send consent_withdrawn event to client."""
        await self.send_json({
            'type': 'consent_withdrawn',
            'session_id': event['session_id'],
            'withdrawn_by': event['withdrawn_by'],
        })

    async def user_joined(self, event):
        """Send user_joined event to client."""
        await self.send_json({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'email': event.get('email'),
        })

    async def user_left(self, event):
        """Send user_left event to client."""
        await self.send_json({
            'type': 'user_left',
            'user_id': event['user_id'],
        })

    async def recording_started(self, event):
        """Send recording_started event to client."""
        await self.send_json({
            'type': 'recording_started',
            'session_id': event.get('session_id'),
            'started_by': event['started_by'],
        })

    async def stop_recording(self, event):
        """Send stop_recording event to client."""
        await self.send_json({
            'type': 'stop_recording',
            'session_id': event.get('session_id'),
            'stopped_by': event['stopped_by'],
        })

    async def recording_stopped(self, event):
        """Send recording_stopped event to client."""
        await self.send_json({
            'type': 'recording_stopped',
            'session_id': event.get('session_id'),
            'stopped_by': event['stopped_by'],
        })

    async def presence_request(self, event):
        """Respond to presence request from new user."""
        # Don't respond to our own request
        if event['requester_id'] == self.user.id:
            return

        # Send back our presence to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'email': self.user.email,
            }
        )

    # Database helpers
    @database_sync_to_async
    def get_active_couple(self):
        """Get user's active couple relationship."""
        from apps.couples.models import Couple

        return Couple.objects.filter(
            models.Q(user1=self.user) | models.Q(user2=self.user),
            status=Couple.Status.ACTIVE
        ).first()

    @database_sync_to_async
    def create_consent_request(self, session_id):
        """Create a new consent request in the database."""
        partner = self.couple.get_partner(self.user)

        if not partner:
            raise ValueError("파트너를 찾을 수 없습니다.")

        return RecordingConsent.objects.create(
            couple=self.couple,
            session_id=uuid.UUID(session_id),
            requester=self.user,
            responder=partner,
            expires_at=timezone.now() + timedelta(minutes=5)
        )

    @database_sync_to_async
    def process_consent_response(self, session_id, consented):
        """Process consent response from partner."""
        try:
            consent = RecordingConsent.objects.get(session_id=session_id)
        except RecordingConsent.DoesNotExist:
            raise ValueError("동의 요청을 찾을 수 없습니다.")

        if consent.responder != self.user:
            raise ValueError("응답 권한이 없습니다.")

        if consent.status != RecordingConsent.Status.PENDING:
            raise ValueError("이미 처리된 요청입니다.")

        if timezone.now() > consent.expires_at:
            consent.status = RecordingConsent.Status.EXPIRED
            consent.save()
            raise ValueError("요청이 만료되었습니다.")

        consent.process_response(self.user, consented)
        return consent.status

    @database_sync_to_async
    def withdraw_consent(self, session_id):
        """Withdraw/cancel a consent request."""
        try:
            consent = RecordingConsent.objects.get(session_id=session_id)
        except RecordingConsent.DoesNotExist:
            raise ValueError("동의 요청을 찾을 수 없습니다.")

        if consent.requester != self.user and consent.responder != self.user:
            raise ValueError("취소 권한이 없습니다.")

        if consent.status != RecordingConsent.Status.PENDING:
            raise ValueError("이미 처리된 요청입니다.")

        consent.status = RecordingConsent.Status.DECLINED
        consent.save()
