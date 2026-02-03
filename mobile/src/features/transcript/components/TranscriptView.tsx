/**
 * TranscriptView component
 * Main transcript display with AudioPlayer, FlatList of TranscriptLines,
 * edit modal, speaker assignment, and post-transcript actions
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ListRenderItemInfo,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTranscript } from '../hooks/useTranscript';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useSessionInsight } from '@/features/insights/hooks/useInsights';
import { TranscriptLine } from './TranscriptLine';
import { AudioPlayer } from './AudioPlayer';
import { SpeakerAssignment } from './SpeakerAssignment';
import { PostTranscriptActions } from './PostTranscriptActions';
import type { TranscriptSegment, PostTranscriptAction } from '@/features/recording/types';
import type { SpeakerMap } from '../types';

interface Props {
  recordingId: string;
  conversationId?: string | null;
  onActionComplete?: (action: PostTranscriptAction) => void;
}

export function TranscriptView({
  recordingId,
  conversationId,
  onActionComplete,
}: Props): React.ReactElement {
  const {
    segments,
    speakerMap,
    loading,
    error,
    recordingType,
    audioUri,
    editSegment,
    updateSpeakerMap,
    chooseAction,
  } = useTranscript(recordingId);

  const {
    isPlaying,
    position,
    duration,
    isAvailable,
    play,
    pause,
    seekTo,
    jumpToTime,
  } = useAudioPlayer(audioUri);

  // Session insight (trigger phrases for highlighting)
  const { data: sessionInsight } = useSessionInsight(conversationId ?? null);
  const triggerPhrases = useMemo(
    () => (sessionInsight?.trigger_phrases || []),
    [sessionInsight],
  );

  // Speaker assignment modal (for live recordings on first load)
  const [showSpeakerAssignment, setShowSpeakerAssignment] = useState(false);
  const [speakerAssignmentDone, setSpeakerAssignmentDone] = useState(false);

  // Edit modal state
  const [editingSegment, setEditingSegment] = useState<TranscriptSegment | null>(null);
  const [editText, setEditText] = useState('');

  // Show speaker assignment for live recordings on first load
  React.useEffect(() => {
    if (
      !loading &&
      recordingType === 'live' &&
      !speakerAssignmentDone &&
      segments.length > 0
    ) {
      setShowSpeakerAssignment(true);
    }
  }, [loading, recordingType, speakerAssignmentDone, segments.length]);

  // Unique speakers from segments
  const speakers = useMemo(() => {
    const set = new Set<string>();
    segments.forEach((s) => set.add(s.speaker));
    return Array.from(set);
  }, [segments]);

  // Find currently playing segment based on audio position
  const currentPlayingSegmentId = useMemo(() => {
    if (!isPlaying) return null;
    const positionSec = position / 1000;
    const current = segments.find(
      (seg) => positionSec >= seg.start_time && positionSec < seg.end_time
    );
    return current?.id || null;
  }, [isPlaying, position, segments]);

  const isNarration = recordingType === 'narration';

  // Handle segment press: jump to audio position
  const handleSegmentPress = useCallback(
    (segment: TranscriptSegment) => {
      jumpToTime(segment.start_time);
      if (!isPlaying) {
        play();
      }
    },
    [jumpToTime, isPlaying, play]
  );

  // Handle segment long press: open edit modal
  const handleSegmentLongPress = useCallback(
    (segment: TranscriptSegment) => {
      setEditingSegment(segment);
      setEditText(segment.text);
    },
    []
  );

  // Save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editingSegment) return;
    await editSegment(editingSegment.id, { text: editText });
    setEditingSegment(null);
    setEditText('');
  }, [editingSegment, editText, editSegment]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSegment(null);
    setEditText('');
  }, []);

  // Speaker assignment handlers
  const handleSpeakerConfirm = useCallback(
    async (map: SpeakerMap) => {
      await updateSpeakerMap(map);
      setShowSpeakerAssignment(false);
      setSpeakerAssignmentDone(true);
    },
    [updateSpeakerMap]
  );

  const handleSpeakerSkip = useCallback(() => {
    setShowSpeakerAssignment(false);
    setSpeakerAssignmentDone(true);
  }, []);

  // Post-transcript action handler
  const handleAction = useCallback(
    async (action: PostTranscriptAction) => {
      await chooseAction(action);
      if (onActionComplete) {
        onActionComplete(action);
      }
    },
    [chooseAction, onActionComplete]
  );

  // Render individual transcript line
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TranscriptSegment>) => (
      <TranscriptLine
        segment={item}
        speakerMap={speakerMap}
        isCurrentlyPlaying={currentPlayingSegmentId === item.id}
        isNarration={isNarration}
        triggerPhrases={triggerPhrases}
        onPress={handleSegmentPress}
        onLongPress={handleSegmentLongPress}
      />
    ),
    [speakerMap, currentPlayingSegmentId, isNarration, triggerPhrases, handleSegmentPress, handleSegmentLongPress]
  );

  const keyExtractor = useCallback(
    (item: TranscriptSegment) => item.id,
    []
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
        <Text style={styles.loadingText}>전사 결과를 불러오는 중...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>전사 결과가 없습니다</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Audio Player - only show if audio is available (audio is deleted after transcription for privacy) */}
      {isAvailable && (
        <AudioPlayer
          isPlaying={isPlaying}
          isAvailable={isAvailable}
          position={position}
          duration={duration}
          onPlay={play}
          onPause={pause}
          onSeek={seekTo}
        />
      )}

      {/* Session insight callout */}
      {sessionInsight && (
        <View style={styles.insightCallout}>
          <Text style={styles.insightCalloutTitle}>이 세션의 패턴</Text>
          <Text style={styles.insightCalloutText}>
            감정 강도 {sessionInsight.escalation_score}/10
            {triggerPhrases.length > 0
              ? ` \u00b7 트리거 표현 ${triggerPhrases.length}개`
              : ''}
          </Text>
        </View>
      )}

      {/* Transcript List */}
      <FlatList
        data={segments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Post-transcript actions (inline for live only) */}
      {recordingType === 'live' && (
        <PostTranscriptActions mode="inline" onAction={handleAction} />
      )}

      {/* Speaker Assignment Modal (live recordings only) */}
      <SpeakerAssignment
        visible={showSpeakerAssignment}
        speakers={speakers}
        initialMap={speakerMap}
        onConfirm={handleSpeakerConfirm}
        onSkip={handleSpeakerSkip}
      />

      {/* Edit Modal */}
      <Modal
        visible={editingSegment !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <Pressable style={styles.editOverlay} onPress={handleCancelEdit}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>텍스트 수정</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              placeholder="수정된 텍스트를 입력하세요"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.editButtons}>
              <Pressable
                style={[styles.editButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  insightCallout: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  insightCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7FD7',
    marginBottom: 2,
  },
  insightCalloutText: {
    fontSize: 13,
    color: '#4B5563',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  // Edit modal
  editOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModal: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#6B7FD7',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
