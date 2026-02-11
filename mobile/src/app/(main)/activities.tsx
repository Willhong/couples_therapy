/**
 * Activities route - displays activities and exercises for the couple
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';
import { getFeaturedActivities, getActivitiesByCategory, startActivity, type Activity } from '@/features/activities/api';
import { FeaturedActivityCard } from '@/features/activities/components/FeaturedActivityCard';
import { ActivityListItem } from '@/features/activities/components/ActivityListItem';

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

  useEffect(() => {
    loadActivities();
  }, [activeTab]);

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
    Alert.alert(
      activity.title,
      activity.description,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작하기',
          onPress: async () => {
            try {
              await startActivity(activity.id);
              Alert.alert('시작!', `"${activity.title}" 활동을 시작했습니다.`);
            } catch {
              Alert.alert('오류', '활동을 시작할 수 없습니다.');
            }
          },
        },
      ]
    );
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
        {/* Featured Activity Card */}
        <FeaturedActivityCard activity={FEATURED_ACTIVITY} />

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
      </ScrollView>
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
