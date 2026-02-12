/**
 * Hook for voice input recording and transcription.
 * Uses expo-av for recording and uploads to /api/v1/audio/quick-transcribe/
 */
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';
import { api, API_URL } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';

type VoiceInputState = 'idle' | 'recording' | 'processing';

interface UseVoiceInputResult {
  state: VoiceInputState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

export function useVoiceInput(): UseVoiceInputResult {
  const [state, setState] = useState<VoiceInputState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '음성 입력을 위해 마이크 권한이 필요합니다.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setState('recording');

      // Auto-stop after 60 seconds
      setTimeout(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording) {
              await recordingRef.current.stopAndUnloadAsync();
            }
          } catch {
            // Recording may have already stopped
          }
        }
      }, 60000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      setState('processing');
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setState('idle');
        return null;
      }

      // Upload to quick-transcribe endpoint
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'voice-input.m4a',
      } as any);

      const accessToken = await TokenStorage.getAccessToken();
      const response = await fetch(`${API_URL}/api/v1/audio/quick-transcribe/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      setState('idle');
      return data.text || null;
    } catch (error) {
      console.error('Failed to process recording:', error);
      Alert.alert('오류', '음성 변환에 실패했습니다.');
      setState('idle');
      recordingRef.current = null;
      return null;
    }
  }, []);

  return { state, startRecording, stopRecording };
}
