import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  activityTitle: string;
  onSubmit: (rating: number) => void;
  onSkip: () => void;
}

export function ActivityRatingModal({ visible, activityTitle, onSubmit, onSkip }: Props): React.ReactElement {
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating);
      setRating(0);
    }
  };

  const handleSkip = () => {
    setRating(0);
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>활동을 어떻게 평가하시겠어요?</Text>
          <Text style={styles.activityName}>{activityTitle}</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} activeOpacity={0.7}>
                <Star
                  size={36}
                  color={value <= rating ? colors.warningAmber : colors.border}
                  fill={value <= rating ? colors.warningAmber : 'transparent'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={rating === 0}
            >
              <Text style={[styles.submitText, rating === 0 && styles.submitTextDisabled]}>평가 제출</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activityName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  submitTextDisabled: {
    color: colors.textTertiary,
  },
});
