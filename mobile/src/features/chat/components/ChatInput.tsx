/**
 * ChatInput component
 * Text input with send button for chat messages
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { colors } from '@/theme';
import { VoiceInputButton } from './VoiceInputButton';
import { TopicRecommendButton } from './TopicRecommendButton';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = '갈등 상황을 설명해주세요...',
  value: controlledValue,
  onChangeText: controlledOnChangeText,
}: Props): React.ReactElement {
  // Support both controlled and uncontrolled modes
  const [internalText, setInternalText] = useState('');
  const isControlled = controlledValue !== undefined;
  const text = isControlled ? controlledValue : internalText;
  const setText = isControlled ? (controlledOnChangeText || (() => {})) : setInternalText;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  }, [text, disabled, onSend]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            <Send
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.quickActions}>
          <VoiceInputButton />
          <TopicRecommendButton />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Allow external text injection (for suggestion chips)
ChatInput.displayName = 'ChatInput';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgPage,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputDisabled: {
    color: colors.textTertiary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
});
