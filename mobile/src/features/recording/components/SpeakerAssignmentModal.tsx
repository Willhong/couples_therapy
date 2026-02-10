/**
 * SpeakerAssignmentModal - modal for assigning names to detected speakers
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { colors, headingFont } from '@/theme';

export interface SpeakerAssignmentModalProps {
  visible: boolean;
  onConfirm: (speaker1: string, speaker2: string) => void;
  onSkip: () => void;
}

export default function SpeakerAssignmentModal({
  visible,
  onConfirm,
  onSkip,
}: SpeakerAssignmentModalProps): React.ReactElement {
  const [speaker1, setSpeaker1] = useState('');
  const [speaker2, setSpeaker2] = useState('');

  const handleConfirm = () => {
    onConfirm(speaker1 || '나', speaker2 || '파트너');
    setSpeaker1('');
    setSpeaker2('');
  };

  const handleSkip = () => {
    onSkip();
    setSpeaker1('');
    setSpeaker2('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>화자 이름 설정</Text>
          <Text style={styles.subtitle}>녹음에서 감지된 화자에 이름을 지정해주세요</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>화자 1</Text>
            <TextInput
              style={styles.input}
              placeholder="나"
              placeholderTextColor={colors.textSecondary}
              value={speaker1}
              onChangeText={setSpeaker1}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>화자 2</Text>
            <TextInput
              style={styles.input}
              placeholder="파트너"
              placeholderTextColor={colors.textSecondary}
              value={speaker2}
              onChangeText={setSpeaker2}
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>건너뛰기</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    marginHorizontal: 28,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F0EFEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5A5A5A',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
