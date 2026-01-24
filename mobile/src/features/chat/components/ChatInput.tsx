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
import { Ionicons } from '@expo/vector-icons';

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
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
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
          <Ionicons
            name="send"
            size={24}
            color={canSend ? '#6B7FD7' : '#D1D5DB'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Allow external text injection (for suggestion chips)
ChatInput.displayName = 'ChatInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    marginRight: 8,
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF',
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
