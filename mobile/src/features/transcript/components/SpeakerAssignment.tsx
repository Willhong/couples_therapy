/**
 * SpeakerAssignment component
 * Modal for diarized (live) transcripts to map speaker codes to names
 * Pre-filled: "나" and "파트너"
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { SpeakerMap } from '../types';

interface Props {
  visible: boolean;
  speakers: string[]; // e.g. ['SPEAKER_00', 'SPEAKER_01']
  initialMap: SpeakerMap;
  onConfirm: (map: SpeakerMap) => void;
  onSkip: () => void;
}

const DEFAULT_NAMES: Record<number, string> = {
  0: '나',
  1: '파트너',
};

export function SpeakerAssignment({
  visible,
  speakers,
  initialMap,
  onConfirm,
  onSkip,
}: Props): React.ReactElement {
  const [localMap, setLocalMap] = useState<SpeakerMap>(() => {
    const map: SpeakerMap = { ...initialMap };
    speakers.forEach((speaker, idx) => {
      if (!map[speaker]) {
        map[speaker] = DEFAULT_NAMES[idx] || `화자 ${idx + 1}`;
      }
    });
    return map;
  });

  const handleChange = useCallback((speaker: string, name: string) => {
    setLocalMap((prev) => ({ ...prev, [speaker]: name }));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(localMap);
  }, [localMap, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSkip}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>화자 이름 설정</Text>
          <Text style={styles.subtitle}>
            녹음에서 감지된 화자에 이름을 지정해주세요
          </Text>

          {speakers.map((speaker, idx) => (
            <View key={speaker} style={styles.inputRow}>
              <Text style={styles.inputLabel}>
                화자 {idx + 1}
              </Text>
              <TextInput
                style={styles.input}
                value={localMap[speaker] || ''}
                onChangeText={(text) => handleChange(speaker, text)}
                placeholder={DEFAULT_NAMES[idx] || `화자 ${idx + 1}`}
                placeholderTextColor="#9CA3AF"
                maxLength={20}
              />
            </View>
          ))}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.skipButton]}
              onPress={onSkip}
            >
              <Text style={styles.skipButtonText}>건너뛰기</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputRow: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#F3F4F6',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#6B7FD7',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
