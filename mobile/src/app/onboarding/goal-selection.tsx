/**
 * Onboarding - Goal Selection Screen
 * Step 1/4: User selects relationship goal and focus areas
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Shield, TrendingUp, Heart } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';

type GoalType = 'prevention' | 'improvement' | 'crisis';
type FocusArea = 'communication' | 'trust' | 'intimacy' | 'conflict' | 'emotion' | 'listening';

const GOALS: Array<{
  id: GoalType;
  icon: typeof Shield;
  title: string;
  description: string;
}> = [
  {
    id: 'prevention',
    icon: Shield,
    title: '갈등 예방',
    description: '더 나은 소통 습관 만들기',
  },
  {
    id: 'improvement',
    icon: TrendingUp,
    title: '관계 개선',
    description: '현재 어려움 극복하기',
  },
  {
    id: 'crisis',
    icon: Heart,
    title: '위기 관리',
    description: '심각한 갈등 상황 해결',
  },
];

const FOCUS_AREAS: Array<{ id: FocusArea; label: string }> = [
  { id: 'communication', label: '소통' },
  { id: 'trust', label: '신뢰' },
  { id: 'intimacy', label: '친밀감' },
  { id: 'conflict', label: '갈등 해결' },
  { id: 'emotion', label: '감정 표현' },
  { id: 'listening', label: '경청' },
];

export default function GoalSelectionScreen(): React.ReactElement {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<GoalType>('prevention');
  const [selectedFocus, setSelectedFocus] = useState<Set<FocusArea>>(new Set());

  const toggleFocus = (id: FocusArea) => {
    const newSet = new Set(selectedFocus);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < 3) {
      newSet.add(id);
    }
    setSelectedFocus(newSet);
  };

  const handleNext = () => {
    // Navigate to next onboarding step
    router.push('/onboarding/attachment-style');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.stepLabel}>1/4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Section */}
        <View style={styles.questionSection}>
          {/* Title & Description */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>목표 설정</Text>
            <Text style={styles.description}>어떤 도움을 받고 싶으신가요?</Text>
          </View>

          {/* Current Situation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>현재 상황</Text>
            <View style={styles.goalCards}>
              {GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = selectedGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                    onPress={() => setSelectedGoal(goal.id)}
                  >
                    <Icon
                      size={24}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.goalCardText}>
                      <Text style={styles.goalCardTitle}>{goal.title}</Text>
                      <Text style={styles.goalCardDesc}>{goal.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Focus Areas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>집중하고 싶은 영역</Text>
            <Text style={styles.focusHint}>최대 3개까지 선택할 수 있어요</Text>
            <View style={styles.chipContainer}>
              {FOCUS_AREAS.map((area) => {
                const isSelected = selectedFocus.has(area.id);
                return (
                  <TouchableOpacity
                    key={area.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleFocus(area.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {area.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBtns}>
        <TouchableOpacity style={styles.prevButton} onPress={handleBack}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>계속하기</Text>
          <ArrowRight size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
  },
  questionSection: {
    gap: 24,
  },
  headerSection: {
    gap: 8,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 31.2,
  },
  description: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 21,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalCards: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalCardSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  goalCardText: {
    flex: 1,
    gap: 2,
  },
  goalCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  focusHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F3EF',
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 14,
    color: '#5A5A5A',
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  prevButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
