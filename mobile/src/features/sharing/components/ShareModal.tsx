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
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  icon: keyof typeof Ionicons.glyphMap;
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            공유 범위를 선택해주세요. 한번 공유하면 취소할 수 없습니다.
          </Text>

          <View style={styles.options}>
            {PRIVACY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.level}
                style={[
                  styles.option,
                  selected === option.level && styles.optionSelected,
                ]}
                onPress={() => setSelected(option.level)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={selected === option.level ? '#6B7FD7' : '#9CA3AF'}
                  />
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
                  <Ionicons name="checkmark-circle" size={24} color="#6B7FD7" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.shareButton, loading && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>
                {selected === 'none' ? '닫기' : '공유하기'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
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
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#6B7FD7',
    backgroundColor: '#F0F4FF',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
    color: '#374151',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#6B7FD7',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  shareButton: {
    backgroundColor: '#6B7FD7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
