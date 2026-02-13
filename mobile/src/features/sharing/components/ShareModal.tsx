/**
 * ShareModal component
 * Privacy level selection for sharing reframing with partner
 * Three levels: Full / Summary / None (per CONTEXT.md)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, FileText, List, Lock, CheckCircle } from 'lucide-react-native';
import { colors, alpha } from '@/theme';
import { headingFont } from '@/theme/typography';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'document-text': FileText,
  'list': List,
  'lock-closed': Lock,
};

export type PrivacyLevel = 'full' | 'summary' | 'none';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShare: (level: PrivacyLevel) => Promise<void>;
  loading?: boolean;
}

interface PrivacyOption {
  level: PrivacyLevel;
  title: string;
  description: string;
  icon: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    level: 'full',
    title: '전체 공유',
    description: '원문과 분석 내용 모두 공유',
    icon: 'document-text',
  },
  {
    level: 'summary',
    title: '요약만 공유',
    description: 'AI 분석 요약만 공유 (원문 제외)',
    icon: 'list',
  },
  {
    level: 'none',
    title: '공유하지 않음',
    description: '파트너에게 공유하지 않음',
    icon: 'lock-closed',
  },
];

export function ShareModal({
  visible,
  onClose,
  onShare,
  loading,
}: Props): React.ReactElement {
  const [selected, setSelected] = useState<PrivacyLevel>('full');

  const handleShare = async () => {
    if (selected === 'none') {
      onClose();
      return;
    }
    await onShare(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>파트너와 공유</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            공유 범위를 선택해주세요. 한번 공유하면 취소할 수 없습니다.
          </Text>

          <View style={styles.options}>
            {PRIVACY_OPTIONS.map((option) => (
              <Pressable
                key={option.level}
                style={({ pressed }) => [
                  styles.option,
                  selected === option.level && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelected(option.level)}
              >
                <View style={styles.optionIcon}>
                  {(() => {
                    const IconComp = ICON_MAP[option.icon] || FileText;
                    return <IconComp size={24} color={selected === option.level ? colors.primary : colors.textTertiary} />;
                  })()}
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selected === option.level && styles.optionTitleSelected,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                {selected === option.level && (
                  <CheckCircle size={24} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              loading && styles.shareButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleShare}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.shareButtonText}>
                {selected === 'none' ? '닫기' : '공유하기'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha(colors.black, 0.5),
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  options: {
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgAiMessage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.2,
  },
});
