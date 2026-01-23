/**
 * Chat route - conflict logging with AI reframing
 * Wires ReframingModal and ShareModal with ChatScreen
 */
import React, { useState } from 'react';
import { ChatScreen } from '@/features/chat/components/ChatScreen';
import { ReframingModal } from '@/features/reframing/components/ReframingModal';
import { ShareModal } from '@/features/sharing/components/ShareModal';
import { useReframing } from '@/features/reframing/hooks/useReframing';
import { usePartnerSharing } from '@/features/sharing/hooks/usePartnerSharing';
import { ReframingData } from '@/features/chat/types';

export default function ChatRoute(): React.ReactElement {
  const { currentReframing, openReframing, closeReframing, isVisible } =
    useReframing();
  const { shareReframing, sharing } = usePartnerSharing();
  const [showShareModal, setShowShareModal] = useState(false);

  const handleOpenReframing = (data: ReframingData, messageId: string) => {
    openReframing(data, messageId);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShareSubmit = async (level: 'full' | 'summary' | 'none') => {
    if (currentReframing && level !== 'none') {
      await shareReframing(currentReframing.messageId, level);
    }
  };

  const handleFollowUp = (prompt: string) => {
    closeReframing();
    // TODO: Send follow-up message to chat
  };

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
        onClose={() => setShowShareModal(false)}
        onShare={handleShareSubmit}
        loading={sharing}
      />
    </>
  );
}
