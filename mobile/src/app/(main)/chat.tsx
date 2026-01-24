/**
 * Chat route - conflict logging with AI reframing
 * Wires ReframingModal and ShareModal with ChatScreen
 */
import React, { useState, useCallback } from 'react';
import { ChatScreen } from '@/features/chat/components/ChatScreen';
import { ReframingModal } from '@/features/reframing/components/ReframingModal';
import { ShareModal } from '@/features/sharing/components/ShareModal';
import { useReframing } from '@/features/reframing/hooks/useReframing';
import { ReframingData } from '@/features/chat/types';

export default function ChatRoute(): React.ReactElement {
  const { currentReframing, openReframing, closeReframing, isVisible } =
    useReframing();
  const [showShareModal, setShowShareModal] = useState(false);

  const handleOpenReframing = useCallback(
    (data: ReframingData, messageId: string) => {
      openReframing(data, messageId);
    },
    [openReframing]
  );

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleShareSubmit = useCallback(
    async (level: 'full' | 'summary' | 'none') => {
      // TODO: Implement sharing when WebSocket is ready
      console.log('Share:', currentReframing?.messageId, level);
    },
    [currentReframing?.messageId]
  );

  const handleFollowUp = useCallback(
    (prompt: string) => {
      closeReframing();
      // TODO: Send follow-up message to chat
    },
    [closeReframing]
  );

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
  }, []);

  return (
    <>
      <ChatScreen onOpenReframing={handleOpenReframing} />

      {currentReframing && (
        <ReframingModal
          visible={isVisible}
          data={currentReframing.data}
          messageId={currentReframing.messageId}
          onClose={closeReframing}
          onShare={handleShare}
          onFollowUp={handleFollowUp}
        />
      )}

      <ShareModal
        visible={showShareModal}
        onClose={handleCloseShareModal}
        onShare={handleShareSubmit}
        loading={false}
      />
    </>
  );
}
