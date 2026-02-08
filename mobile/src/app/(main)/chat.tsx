/**
 * Chat route - conflict logging with AI reframing
 * Wires ReframingModal with ChatScreen
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/features/chat/components/ChatScreen';
import { ReframingModal } from '@/features/reframing/components/ReframingModal';
import { useReframing } from '@/features/reframing/hooks/useReframing';
import { usePartnerSharing } from '@/features/sharing/hooks/usePartnerSharing';
import { ReframingData } from '@/features/chat/types';
import { PrivacyLevel } from '@/features/sharing/components/ShareModal';

export default function ChatRoute(): React.ReactElement {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const { currentReframing, openReframing, closeReframing, isVisible } =
    useReframing();
  const { shareReframing, sharing } = usePartnerSharing();
  const [sendMessageRef, setSendMessageRef] = React.useState<((text: string) => Promise<void>) | null>(null);

  const handleOpenReframing = useCallback(
    (data: ReframingData, messageId: string) => {
      openReframing(data, messageId);
    },
    [openReframing]
  );

  const handleShareSubmit = useCallback(
    async (level: PrivacyLevel) => {
      if (currentReframing && level !== 'none') {
        await shareReframing(currentReframing.messageId, level);
      }
    },
    [currentReframing, shareReframing]
  );

  const handleFollowUp = useCallback(
    (prompt: string) => {
      closeReframing();
      // Send the follow-up suggestion as a new user message
      if (sendMessageRef) {
        sendMessageRef(prompt);
      }
    },
    [closeReframing, sendMessageRef]
  );

  return (
    <>
      <ChatScreen
        conversationId={conversationId}
        onOpenReframing={handleOpenReframing}
        onSendMessageReady={setSendMessageRef}
      />

      {currentReframing && (
        <ReframingModal
          visible={isVisible}
          data={currentReframing.data}
          messageId={currentReframing.messageId}
          onClose={closeReframing}
          onShareSubmit={handleShareSubmit}
          onFollowUp={handleFollowUp}
          sharing={sharing}
        />
      )}
    </>
  );
}
