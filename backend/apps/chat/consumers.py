"""WebSocket consumer for real-time chat updates and sharing."""

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.db import models


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time chat updates and sharing."""

    async def connect(self):
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get user's couple for group membership
        self.couple = await self.get_active_couple()
        if not self.couple:
            await self.close(code=4003)
            return

        if self.couple:
            self.couple_group = f'chat_couple_{self.couple.id}'
            await self.channel_layer.group_add(self.couple_group, self.channel_name)

        # Personal notification group
        self.user_group = f'chat_user_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'couple_group'):
            await self.channel_layer.group_discard(self.couple_group, self.channel_name)
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive_json(self, content):
        action = content.get('action')

        if action == 'share_reframing':
            await self.handle_share_reframing(content)
        elif action == 'respond_to_share':
            await self.handle_share_response(content)

    async def handle_share_reframing(self, content):
        """Handle sharing reframing with partner."""
        message_id = content.get('message_id')
        privacy_level = content.get('privacy_level', 'full')

        if not self.couple or not message_id:
            await self.send_json({
                'type': 'error',
                'message': 'Invalid share request.',
            })
            return

        share = await self.create_share(message_id, privacy_level)

        if share:
            # Notify partner via couple group
            await self.channel_layer.group_send(
                self.couple_group,
                {
                    'type': 'reframing_shared',
                    'share_id': str(share.id),
                    'shared_by': self.user.id,
                    'shared_by_email': self.user.email,
                    'privacy_level': privacy_level,
                    'preview': await self.get_share_preview(share),
                }
            )

            # Confirm to sender
            await self.send_json({
                'type': 'share_confirmed',
                'share_id': str(share.id),
            })

    async def handle_share_response(self, content):
        """Handle partner response to shared content."""
        share_id = content.get('share_id')
        response_text = content.get('response')

        if not share_id or response_text is None:
            await self.send_json({
                'type': 'error',
                'message': 'Invalid share response request.',
            })
            return

        updated = await self.save_response(share_id, response_text)

        if updated:
            # Notify original sharer
            await self.channel_layer.group_send(
                self.couple_group,
                {
                    'type': 'partner_responded',
                    'share_id': share_id,
                    'responder_id': self.user.id,
                }
            )

    # Event handlers (sent to clients)
    async def reframing_shared(self, event):
        """Send shared reframing notification to partner."""
        if event['shared_by'] != self.user.id:  # Don't send to sharer
            await self.send_json({
                'type': 'reframing_shared',
                'share_id': event['share_id'],
                'shared_by_email': event['shared_by_email'],
                'privacy_level': event['privacy_level'],
                'preview': event['preview'],
            })

    async def partner_responded(self, event):
        """Send partner response notification."""
        if event['responder_id'] != self.user.id:
            await self.send_json({
                'type': 'partner_responded',
                'share_id': event['share_id'],
            })

    @database_sync_to_async
    def get_active_couple(self):
        from apps.couples.models import Couple
        return Couple.objects.filter(
            models.Q(user1=self.user) | models.Q(user2=self.user),
            status=Couple.Status.ACTIVE
        ).first()

    @database_sync_to_async
    def create_share(self, message_id, privacy_level):
        from apps.chat.models import Message, SharedReframing
        try:
            message = Message.objects.get(id=message_id)
            partner = self.couple.get_partner(self.user)
            return SharedReframing.objects.create(
                message=message,
                shared_by=self.user,
                shared_with=partner,
                privacy_level=privacy_level,
            )
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def get_share_preview(self, share):
        """Get preview text based on privacy level."""
        if share.privacy_level == 'full':
            content = share.message.content
            return content[:100] + '...' if len(content) > 100 else content
        elif share.privacy_level == 'summary':
            data = share.message.reframing_data or {}
            return data.get('acknowledgment', '새로운 분석이 공유되었습니다')
        return '공유된 내용이 있습니다'

    @database_sync_to_async
    def save_response(self, share_id, response_text):
        from apps.chat.models import SharedReframing
        try:
            share = SharedReframing.objects.get(id=share_id, shared_with=self.user)
            share.partner_response = response_text
            share.save()
            return True
        except SharedReframing.DoesNotExist:
            return False
