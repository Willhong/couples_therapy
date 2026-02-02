/**
 * useTranscript hook
 * Loads and manages transcript data for a recording
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getTranscript,
  updateSegment,
  assignSpeakers,
  setPostAction,
} from '@/features/recording/services/audioApi';
import type {
  TranscriptSegment,
  PostTranscriptAction,
  RecordingMode,
} from '@/features/recording/types';
import type { SpeakerMap } from '../types';

interface UseTranscriptReturn {
  segments: TranscriptSegment[];
  speakerMap: SpeakerMap;
  loading: boolean;
  error: string | null;
  recordingType: RecordingMode;
  fullText: string | null;
  audioUri: string | null;
  editSegment: (segmentId: string, data: { text?: string; speaker_label?: string }) => Promise<void>;
  updateSpeakerMap: (map: SpeakerMap) => Promise<void>;
  chooseAction: (action: PostTranscriptAction) => Promise<void>;
}

export function useTranscript(recordingId: string): UseTranscriptReturn {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingType, setRecordingType] = useState<RecordingMode>('narration');
  const [fullText, setFullText] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  // Load transcript on mount
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getTranscript(recordingId);

        if (!mounted) return;

        setSegments(result.segments || []);
        setFullText(result.full_text || null);

        // Detect recording type from segments
        const speakers = new Set(result.segments?.map((s) => s.speaker) || []);
        const isLive = speakers.size > 1;
        setRecordingType(isLive ? 'live' : 'narration');

        // Build initial speaker map from existing labels
        const initialMap: SpeakerMap = {};
        for (const seg of result.segments || []) {
          if (seg.speaker && !initialMap[seg.speaker]) {
            initialMap[seg.speaker] = seg.speaker_label || seg.speaker;
          }
        }
        setSpeakerMap(initialMap);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : '전사 결과를 불러올 수 없습니다.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [recordingId]);

  const editSegment = useCallback(
    async (segmentId: string, data: { text?: string; speaker_label?: string }) => {
      try {
        await updateSegment(recordingId, segmentId, data);
        setSegments((prev) =>
          prev.map((seg) =>
            seg.id === segmentId ? { ...seg, ...data } : seg
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '수정에 실패했습니다.'
        );
      }
    },
    [recordingId]
  );

  const updateSpeakerMapFn = useCallback(
    async (map: SpeakerMap) => {
      try {
        await assignSpeakers(recordingId, map);
        setSpeakerMap(map);
        // Update segment labels locally
        setSegments((prev) =>
          prev.map((seg) => ({
            ...seg,
            speaker_label: map[seg.speaker] || seg.speaker_label,
          }))
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '화자 설정에 실패했습니다.'
        );
      }
    },
    [recordingId]
  );

  const chooseAction = useCallback(
    async (action: PostTranscriptAction) => {
      try {
        await setPostAction(recordingId, action);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '처리에 실패했습니다.'
        );
      }
    },
    [recordingId]
  );

  return {
    segments,
    speakerMap,
    loading,
    error,
    recordingType,
    fullText,
    audioUri,
    editSegment,
    updateSpeakerMap: updateSpeakerMapFn,
    chooseAction,
  };
}
