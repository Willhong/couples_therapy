/**
 * Activities route - displays activities and exercises for the couple
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';
import { getFeaturedActivities, getActivitiesByCategory, startActivity, completeActivity, getEffectiveness, type Activity, type CoupleActivity } from '@/features/activities/api';
import { FeaturedActivityCard } from '@/features/activities/components/FeaturedActivityCard';
import { ActivityListItem } from '@/features/activities/components/ActivityListItem';
import { ActivityRatingModal } from '@/features/activities/components/ActivityRatingModal';
import { RecommendationCard } from '@/features/activities/components/RecommendationCard';
import { EffectivenessChart } from '@/features/activities/components/EffectivenessChart';
import { useRecommendations } from '@/features/activities/hooks/useRecommendations';
import type { Recommendation } from '@/features/activities/types';
import type { EffectivenessItem } from '@/features/activities/types';

type TabType = '추천' | '소통' | '친밀감';

const TAB_CATEGORY_MAP: Record<TabType, string | undefined> = {
  '추천': undefined,
  '소통': 'conversation',
  '친밀감': 'date',
};

const FEATURED_ACTIVITY = {
  title: '사랑에 빠지는 36가지 질문',
  description: '친밀감을 깊게 하기 위해 연구 기반으로 설계된 대화 게임',
  estimated_minutes: 45,
  category: 'conversation',
};

export default function ActivitiesRoute(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('추천');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [inProgressActivities, setInProgressActivities] = useState<CoupleActivity[]>([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CoupleActivity | null>(null);
  const [effectiveness, setEffectiveness] = useState<EffectivenessItem[]>([]);
  const { data: recommendations } = useRecommendations();

  useEffect(() => {
    loadActivities();
  }, [activeTab]);

  useEffect(() => {
    loadEffectiveness();
  }, []);

  async function loadEffectiveness() {
    try {
      const data = await getEffectiveness();
      setEffectiveness(data);
    } catch {
      // Falls back to empty list
    }
  }

  async function loadActivities() {
    setLoading(true);
    try {
      const category = TAB_CATEGORY_MAP[activeTab];
      const data = category
        ? await getActivitiesByCategory(category)
        : await getFeaturedActivities();
      setActivities(data);
    } catch {
      // Falls back to empty list when no active couple
    } finally {
      setLoading(false);
    }
  }

  const handleActivityPress = async (activity: Activity) => {
    const inProgress = inProgressActivities.find((ca) => ca.activity.id === activity.id);
    if (inProgress) {
      setSelectedActivity(inProgress);
      setRatingModalVisible(true);
      return;
    }

    Alert.alert(
      activity.title,
      activity.description,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작하기',
          onPress: async () => {
            try {
              const coupleActivity = await startActivity(activity.id);
              setInProgressActivities((prev) => [...prev, coupleActivity]);
              Alert.alert('시작!', `"${activity.title}" 활동을 시작했습니다.`);
            } catch {
              Alert.alert('오류', '활동을 시작할 수 없습니다.');
            }
          },
        },
      ]
    );
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!selectedActivity) return;
    try {
      await completeActivity(selectedActivity.id, rating);
      setInProgressActivities((prev) => prev.filter((ca) => ca.id !== selectedActivity.id));
      setRatingModalVisible(false);
      setSelectedActivity(null);
      Alert.alert('완료!', '활동을 완료했습니다. 평가해 주셔서 감사합니다!');
    } catch {
      Alert.alert('오류', '활동을 완료할 수 없습니다.');
    }
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    Alert.alert(
      recommendation.title,
      recommendation.reason,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작하기',
          onPress: async () => {
            try {
              const coupleActivity = await startActivity(recommendation.item_id);
              setInProgressActivities((prev) => [...prev, coupleActivity]);
              Alert.alert('시작!', `"${recommendation.title}" 활동을 시작했습니다.`);
            } catch {
              Alert.alert('오류', '활동을 시작할 수 없습니다.');
            }
          },
        },
      ]
    );
  };

  const handleRatingSkip = async () => {
    if (!selectedActivity) return;
    try {
      await completeActivity(selectedActivity.id);
      setInProgressActivities((prev) => prev.filter((ca) => ca.id !== selectedActivity.id));
      setRatingModalVisible(false);
      setSelectedActivity(null);
      Alert.alert('완료!', '활동을 완료했습니다.');
    } catch {
      Alert.alert('오류', '활동을 완료할 수 없습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>활동</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <SlidersHorizontal size={20} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['추천', '소통', '친밀감'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recommendations (추천 tab) or Featured */}
        {activeTab === '추천' && recommendations.length > 0 ? (
          <View style={styles.activityList}>
            {recommendations.map((rec) => (
              <RecommendationCard
                key={`${rec.type}-${rec.item_id}`}
                recommendation={rec}
                onPress={handleRecommendationPress}
              />
            ))}
          </View>
        ) : (
          <FeaturedActivityCard activity={FEATURED_ACTIVITY} />
        )}

        {/* Activity List */}
        <View style={styles.activityList}>
          {activities.map((activity, index) => (
            <ActivityListItem
              key={activity.id}
              activity={activity}
              index={index}
              onPress={handleActivityPress}
            />
          ))}
        </View>

        {/* Effectiveness Chart */}
        <EffectivenessChart data={effectiveness} />
      </ScrollView>

      <ActivityRatingModal
        visible={ratingModalVisible}
        activityTitle={selectedActivity?.activity.title ?? ''}
        onSubmit={handleRatingSubmit}
        onSkip={handleRatingSkip}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: headingFont,
    fontSize: 28,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 24,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#7C9082',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 24,
  },
  activityList: {
    gap: 12,
  },
});
