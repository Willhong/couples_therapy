/**
 * useAudioPlayer hook
 * Manages audio playback via expo-av for transcript seek-to-line
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  position: number; // ms
  duration: number; // ms
  isAvailable: boolean;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  jumpToTime: (seconds: number) => Promise<void>;
}

export function useAudioPlayer(audioUri: string | null): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Load audio on mount or URI change
  useEffect(() => {
    if (!audioUri) {
      setIsAvailable(false);
      return;
    }

    let mounted = true;
    let sound: Audio.Sound | null = null;

    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri! },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        if (!mounted) {
          await newSound.unloadAsync();
          return;
        }

        sound = newSound;
        soundRef.current = newSound;
        setIsAvailable(true);
      } catch (err) {
        console.error('Failed to load audio:', err);
        if (mounted) setIsAvailable(false);
      }
    }

    function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
      if (!mounted) return;
      if (!status.isLoaded) return;

      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }

    loadSound();

    return () => {
      mounted = false;
      if (sound) {
        sound.unloadAsync();
      }
      soundRef.current = null;
    };
  }, [audioUri]);

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.positionMillis === status.durationMillis) {
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
    } catch (err) {
      console.error('Play error:', err);
    }
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
    } catch (err) {
      console.error('Pause error:', err);
    }
  }, []);

  const seekTo = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(positionMs);
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, []);

  const jumpToTime = useCallback(
    async (seconds: number) => {
      await seekTo(seconds * 1000);
    },
    [seekTo]
  );

  return {
    isPlaying,
    position,
    duration,
    isAvailable,
    play,
    pause,
    seekTo,
    jumpToTime,
  };
}
