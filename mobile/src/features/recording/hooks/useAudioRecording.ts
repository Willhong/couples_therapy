/**
 * Audio recording hook using expo-av
 * Manages recording lifecycle with metering data for waveform visualization
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { RecordingState } from '../types';

/** Maximum recording duration in seconds (30 minutes) */
const MAX_DURATION = 1800;

/**
 * Metering polling interval in milliseconds.
 * Aligned with useWaveform throttle (150ms) to avoid unnecessary
 * getStatusAsync() calls that won't trigger a state update.
 */
const METERING_INTERVAL = 150;

/**
 * Normalize metering value from dB (-60 to 0) to 0-1 range
 */
function normalizeMeteringValue(db: number | undefined): number {
  if (db === undefined || db === null) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

interface UseAudioRecordingReturn {
  state: RecordingState;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    duration: 0,
    uri: null,
    metering: [],
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecording = state.status === 'recording';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  /**
   * Start audio recording with permissions and audio mode setup
   */
  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('마이크 권한이 필요합니다.');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording with high quality + metering
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      recordingRef.current = recording;

      setState({
        status: 'recording',
        duration: 0,
        uri: null,
        metering: [],
      });

      // Poll metering data every METERING_INTERVAL ms
      meteringIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;

        try {
          const status = await recordingRef.current.getStatusAsync();
          if (!status.isRecording) return;

          const durationSec = Math.floor((status.durationMillis || 0) / 1000);
          const normalizedMetering = normalizeMeteringValue(status.metering);

          // Auto-stop at max duration
          if (durationSec >= MAX_DURATION) {
            await stopRecordingInternal();
            return;
          }

          setState((prev) => ({
            ...prev,
            duration: durationSec,
            metering: [...prev.metering, normalizedMetering],
          }));
        } catch {
          // Recording may have been stopped
        }
      }, METERING_INTERVAL);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState((prev) => ({ ...prev, status: 'failed' }));
      throw error;
    }
  }, []);

  /**
   * Internal stop recording handler
   */
  const stopRecordingInternal = async (): Promise<string | null> => {
    // Clear metering interval
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }

    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState((prev) => ({
        ...prev,
        status: 'stopped',
        uri: uri || null,
      }));

      return uri || null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState((prev) => ({ ...prev, status: 'failed' }));
      return null;
    }
  };

  /**
   * Stop recording and return the file URI
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    return stopRecordingInternal();
  }, []);

  /**
   * Cancel recording and discard the file
   */
  const cancelRecording = useCallback(async () => {
    // Clear metering interval
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // Already stopped
      }
      recordingRef.current = null;
    }

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    }).catch(() => {});

    setState({
      status: 'idle',
      duration: 0,
      uri: null,
      metering: [],
    });
  }, []);

  return {
    state,
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
