import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api, getApiErrorMessage } from '@/lib/api';

interface SharedReframingDetailProps {
  sharedId: string;
  onResponseSubmitted?: () => void;
}

interface SharedReframing {
  id: string;
  message: {
    id: string;
    content: string;
    has_reframing: boolean;
    reframing_data?: {
      analysis?: {
        user_perspective?: string;
        partner_perspective?: string;
        communication_pattern?: string;
      };
      suggestions?: string[];
    };
  };
  privacy_level: 'full' | 'summary' | 'none';
  shared_at: string;
  shared_by_email: string;
  partner_response?: string;
  is_read: boolean;
}

export function SharedReframingDetail({
  sharedId,
  onResponseSubmitted,
}: SharedReframingDetailProps): React.ReactElement {
  const [shared, setShared] = useState<SharedReframing | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedReframing();
  }, [sharedId]);

  const loadSharedReframing = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the shared reframing
      const response = await api.get<SharedReframing>(`/chat/shared/${sharedId}/`);
      setShared(response.data);

      // Mark as read
      if (!response.data.is_read) {
        await api.post(`/chat/shared/${sharedId}/read/`);
      }

      // Pre-fill response if already exists
      if (response.data.partner_response) {
        setResponse(response.data.partner_response);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      Alert.alert('알림', '답변을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/chat/shared/${sharedId}/respond/`, {
        partner_response: response,
      });

      Alert.alert('성공', '답변이 전송되었습니다.');
      onResponseSubmitted?.();
    } catch (err) {
      Alert.alert('오류', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
      </View>
    );
  }

  if (error || !shared) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || '내용을 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  const renderContent = () => {
    if (shared.privacy_level === 'none') {
      return (
        <View style={styles.restrictedContent}>
          <Text style={styles.restrictedIcon}>🔒</Text>
          <Text style={styles.restrictedText}>
            파트너가 리프레이밍을 공유했습니다
          </Text>
          <Text style={styles.restrictedSubtext}>
            자세한 내용은 공유되지 않았습니다
          </Text>
        </View>
      );
    }

    if (shared.privacy_level === 'summary') {
      return (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>리프레이밍</Text>
          <View style={styles.reframingCard}>
            <Text style={styles.reframingText}>{shared.message.content}</Text>
          </View>
          <Text style={styles.privacyNotice}>
            요약만 공유되었습니다. 전체 분석은 공유되지 않았습니다.
          </Text>
        </View>
      );
    }

    // Full privacy level
    const reframingData = shared.message.reframing_data;
    return (
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>리프레이밍</Text>
        <View style={styles.reframingCard}>
          <Text style={styles.reframingText}>{shared.message.content}</Text>
        </View>

        {reframingData?.analysis && (
          <>
            {reframingData.analysis.user_perspective && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisTitle}>상대방 관점</Text>
                <Text style={styles.analysisText}>
                  {reframingData.analysis.user_perspective}
                </Text>
              </View>
            )}

            {reframingData.analysis.partner_perspective && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisTitle}>내 관점</Text>
                <Text style={styles.analysisText}>
                  {reframingData.analysis.partner_perspective}
                </Text>
              </View>
            )}

            {reframingData.analysis.communication_pattern && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisTitle}>대화 패턴</Text>
                <Text style={styles.analysisText}>
                  {reframingData.analysis.communication_pattern}
                </Text>
              </View>
            )}
          </>
        )}

        {reframingData?.suggestions && reframingData.suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>제안</Text>
            {reframingData.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Text style={styles.suggestionBullet}>•</Text>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.senderText}>
          {shared.shared_by_email}님이 공유한 내용
        </Text>
        <Text style={styles.dateText}>
          {new Date(shared.shared_at).toLocaleString('ko-KR')}
        </Text>
      </View>

      {renderContent()}

      <View style={styles.responseSection}>
        <Text style={styles.sectionTitle}>답변하기</Text>
        <TextInput
          style={styles.responseInput}
          placeholder="파트너에게 전달할 메시지를 입력하세요..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          value={response}
          onChangeText={setResponse}
          editable={!submitting}
        />
        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitResponse}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>답변하기</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  contentSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reframingCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reframingText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  privacyNotice: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  analysisSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7FD7',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  suggestionsSection: {
    marginTop: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  suggestionBullet: {
    fontSize: 16,
    color: '#6B7FD7',
    marginRight: 8,
    lineHeight: 22,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  restrictedContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  restrictedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  restrictedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  restrictedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  responseSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  responseInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6B7FD7',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
});
