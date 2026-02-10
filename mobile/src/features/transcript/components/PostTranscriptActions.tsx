/**
 * PostTranscriptActions component
 * Three action buttons: reframe / comfort / keep
 * mode='standalone' for full-screen (self-narration choice screen)
 * mode='inline' for compact row at bottom of TranscriptView (live recordings)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ArrowLeftRight, Heart, FileText, ChevronRight } from 'lucide-react-native';
import type { PostTranscriptAction } from '@/features/recording/types';
import { colors } from '@/theme';

interface Props {
  mode: 'standalone' | 'inline';
  onAction: (action: PostTranscriptAction) => Promise<void>;
  disabled?: boolean;
}

interface ActionConfig {
  action: PostTranscriptAction;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgColor: string;
}

const ACTIONS: ActionConfig[] = [
  {
    action: 'reframe',
    label: '리프레이밍 받기',
    description: '상대방의 관점에서 상황을 다시 바라봅니다',
    icon: ArrowLeftRight,
    color: colors.purple,
    bgColor: colors.purpleBg,
  },
  {
    action: 'comfort',
    label: '위로 받기',
    description: '공감과 위로의 메시지를 받습니다',
    icon: Heart,
    color: colors.warningAmber,
    bgColor: colors.warningBg,
  },
  {
    action: 'keep',
    label: '기록만 남기기',
    description: '전사 결과만 저장하고 마칩니다',
    icon: FileText,
    color: colors.textSecondary,
    bgColor: colors.bgPage,
  },
];

export function PostTranscriptActions({
  mode,
  onAction,
  disabled = false,
}: Props): React.ReactElement {
  const [loadingAction, setLoadingAction] = useState<PostTranscriptAction | null>(null);

  const handleAction = useCallback(
    async (action: PostTranscriptAction) => {
      if (disabled || loadingAction) return;
      setLoadingAction(action);
      try {
        await onAction(action);
      } finally {
        setLoadingAction(null);
      }
    },
    [onAction, disabled, loadingAction]
  );

  if (mode === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.inlineTitle}>다음 단계를 선택하세요</Text>
        <View style={styles.inlineRow}>
          {ACTIONS.map((config) => (
            <Pressable
              key={config.action}
              style={({ pressed }) => [
                styles.inlineButton,
                { backgroundColor: config.bgColor },
                pressed && styles.buttonPressed,
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => handleAction(config.action)}
              disabled={disabled || loadingAction !== null}
            >
              {loadingAction === config.action ? (
                <ActivityIndicator size="small" color={config.color} />
              ) : (
                <config.icon size={20} color={config.color} />
              )}
              <Text
                style={[styles.inlineButtonText, { color: config.color }]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // Standalone mode (full screen cards)
  return (
    <View style={styles.standaloneContainer}>
      {ACTIONS.map((config) => (
        <Pressable
          key={config.action}
          style={({ pressed }) => [
            styles.standaloneCard,
            { borderLeftColor: config.color },
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => handleAction(config.action)}
          disabled={disabled || loadingAction !== null}
        >
          <View style={styles.cardHeader}>
            <View
              style={[styles.iconCircle, { backgroundColor: config.bgColor }]}
            >
              {loadingAction === config.action ? (
                <ActivityIndicator size="small" color={config.color} />
              ) : (
                <config.icon size={24} color={config.color} />
              )}
            </View>
            <Text style={styles.cardLabel}>{config.label}</Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          <Text style={styles.cardDescription}>{config.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline mode
  inlineContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  inlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 12,
    textAlign: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Standalone mode
  standaloneContainer: {
    gap: 16,
    paddingHorizontal: 24,
  },
  standaloneCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray800,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 56,
  },
  // Shared
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
