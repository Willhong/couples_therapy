/**
 * ReframingModal component
 * Displays structured reframing analysis with acknowledgment requirement
 * Per CONTEXT.md: User must tap "I've read this" before closing
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { AlertTriangle, Copy, Heart, X, MessageCircle, Hand, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { PerspectiveView } from './PerspectiveView';
import { SuggestionList } from './SuggestionList';
import { ShareModal, PrivacyLevel } from '@/features/sharing/components/ShareModal';
import { ReframingData } from '@/features/chat/types';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface Props {
  visible: boolean;
  data: ReframingData;
  messageId: string;
  onClose: () => void;
  onShareSubmit: (level: PrivacyLevel) => Promise<void>;
  onFollowUp: (prompt: string) => void;
  sharing?: boolean;
}

export function ReframingModal({
  visible,
  data,
  messageId,
  onClose,
  onShareSubmit,
  onFollowUp,
  sharing,
}: Props): React.ReactElement {
  const [acknowledged, setAcknowledged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShareSubmit = async (level: PrivacyLevel) => {
    try {
      await onShareSubmit(level);
      setShowShareModal(false);
      Alert.alert('공유 완료', '파트너에게 공유되었습니다.');
    } catch (error: unknown) {
      setShowShareModal(false);
      const err = error as Error;
      Alert.alert('공유 실패', err.message || '공유 중 오류가 발생했습니다.');
    }
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
  };

  const handleClose = () => {
    if (!acknowledged) {
      Alert.alert(
        '확인 필요',
        '분석 내용을 읽으셨나요? "읽었습니다" 버튼을 눌러주세요.',
        [{ text: '확인', style: 'default' }]
      );
      return;
    }
    setAcknowledged(false); // Reset for next open
    onClose();
  };

  // Extract analysis data with safe defaults
  const analysis = data.analysis || {};
  const suggestions = data.suggestions || [];

  const handleCopy = async () => {
    const parts: string[] = [];

    if (analysis.what_you_said) {
      parts.push(`당신이 말한 것: ${analysis.what_you_said}`);
    }
    if (analysis.how_they_heard) {
      parts.push(`상대방이 들었을 수 있는 것: ${analysis.how_they_heard}`);
    }
    if (analysis.how_you_heard_them) {
      parts.push(`당신이 상대방의 말을 들은 방식: ${analysis.how_you_heard_them}`);
    }
    if (analysis.why_the_gap) {
      parts.push(`왜 이런 차이가 생겼을까요: ${analysis.why_the_gap}`);
    }
    if (suggestions.length > 0) {
      parts.push(`제안:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    }

    const text = parts.join('\n\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('복사됨', '분석 내용이 클립보드에 복사되었습니다.');
  };

  const handleSave = async () => {
    try {
      const { api } = await import('@/lib/api');
      const conversationId = messageId.split('-')[0]; // Extract conversation ID from message ID pattern
      await api.post(`/chat/conversations/${conversationId}/messages/${messageId}/toggle_saved/`);
      setSaved(!saved);
    } catch (error) {
      console.error('Failed to toggle save state:', error);
    }
  };

  // Check for abuse flag
  if (data.is_abuse_detected) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <View style={styles.abuseWarning}>
            <AlertTriangle size={48} color={colors.error} />
            <Text style={styles.abuseTitle}>안전이 우려됩니다</Text>
            <Text style={styles.abuseText}>
              말씀하신 내용에서 걱정되는 부분이 있습니다. 혼자 감당하지 않으셔도
              됩니다.
            </Text>
            <View style={styles.resourceCard}>
              <Text style={styles.resourceTitle}>도움받을 수 있는 곳</Text>
              <Text style={styles.resourceText}>여성긴급전화 1366 (24시간)</Text>
              <Text style={styles.resourceText}>경찰 112</Text>
            </View>
            <TouchableOpacity
              style={styles.acknowledgeButton}
              onPress={onClose}
            >
              <Text style={styles.acknowledgeText}>확인했습니다</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>관점 분석</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCopy} style={styles.iconButton}>
              <Copy size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
              <Heart size={22} color={saved ? colors.error : colors.textSecondary} fill={saved ? colors.error : 'none'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.iconButton}
              disabled={!acknowledged}
            >
              <X size={24} color={acknowledged ? colors.gray700 : colors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* What you said */}
          {analysis.what_you_said && (
            <PerspectiveView
              icon="chatbubble-outline"
              title="당신이 말한 것"
              content={analysis.what_you_said}
              quotes={analysis.original_quotes}
            />
          )}

          {/* How they heard */}
          {analysis.how_they_heard && (
            <PerspectiveView
              icon="ear-outline"
              title="상대방이 들었을 수 있는 것"
              content={analysis.how_they_heard}
              highlight
            />
          )}

          {/* How you heard them (bidirectional) */}
          {analysis.how_you_heard_them && (
            <PerspectiveView
              icon="swap-horizontal-outline"
              title="당신이 상대방의 말을 들은 방식"
              content={analysis.how_you_heard_them}
            />
          )}

          {/* Why the gap */}
          {analysis.why_the_gap && (
            <PerspectiveView
              icon="help-circle-outline"
              title="왜 이런 차이가 생겼을까요"
              content={analysis.why_the_gap}
            />
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <SuggestionList suggestions={suggestions} />
          )}
        </ScrollView>

        {/* Follow-up buttons */}
        <View style={styles.followUpContainer}>
          <TouchableOpacity
            style={styles.followUpButton}
            onPress={() => onFollowUp('이 부분에 대해 더 자세히 알려주세요')}
          >
            <MessageCircle size={18} color={colors.primary} />
            <Text style={styles.followUpText}>더 자세히</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.followUpButton}
            onPress={() => onFollowUp('이 분석에 동의하지 않아요')}
          >
            <Hand size={18} color={colors.primary} />
            <Text style={styles.followUpText}>동의하지 않아요</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          {!acknowledged ? (
            <TouchableOpacity
              style={styles.acknowledgeButton}
              onPress={handleAcknowledge}
            >
              <Text style={styles.acknowledgeText}>읽었습니다</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color={colors.white} />
              <Text style={styles.shareText}>파트너와 공유하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ShareModal rendered inside ReframingModal to appear on top */}
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={handleShareSubmit}
          loading={sharing}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  acknowledgmentCard: {
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  acknowledgmentText: {
    fontSize: 15,
    color: colors.infoText,
    lineHeight: 22,
  },
  followUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  followUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followUpText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: colors.white,
  },
  acknowledgeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acknowledgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Abuse warning styles
  abuseWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  abuseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  abuseText: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  resourceCard: {
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dangerText,
    marginBottom: 8,
  },
  resourceText: {
    fontSize: 15,
    color: colors.dangerTextDark,
    marginBottom: 4,
  },
});
