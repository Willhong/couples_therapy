/**
 * Activities route - displays activities and exercises for the couple
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, Clock, ChevronRight, Heart, Star, MessageCircle } from 'lucide-react-native';
import { colors, headingFont, alpha } from '@/theme';
import { getFeaturedActivities, type Activity } from '@/features/activities/api';

type TabType = '추천' | '소통' | '친밀감';

const MOCK_ACTIVITIES = [
  {
    id: 1,
    title: '감사 의식',
    description: '서로에게 감사한 점 3가지 나누기',
    estimated_minutes: 10,
    icon: 'heart' as const,
  },
  {
    id: 2,
    title: '꿈의 데이트 계획',
    description: '함께 꿈꾸며 데이트 계획하기',
    estimated_minutes: 15,
    icon: 'star' as const,
  },
  {
    id: 3,
    title: '가치관 탐구',
    description: '서로의 핵심 가치관 대화하기',
    estimated_minutes: 20,
    icon: 'message' as const,
  },
];

const FEATURED_ACTIVITY = {
  title: '사랑에 빠지는 36가지 질문',
  description: '친밀감을 깊게 하기 위해 연구 기반으로 설계된 대화 게임',
  estimated_minutes: 45,
};

export default function ActivitiesRoute(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('추천');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      const data = await getFeaturedActivities();
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderIcon = (iconType: 'heart' | 'star' | 'message') => {
    const IconComponent = iconType === 'heart' ? Heart : iconType === 'star' ? Star : MessageCircle;
    return <IconComponent size={20} color={colors.primary} strokeWidth={2} />;
  };

  const displayActivities = activities.length > 0 ? activities : MOCK_ACTIVITIES;

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
        <View style={styles.featuredCard}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>✨ 추천</Text>
          </View>
          <Text style={styles.featuredTitle}>{FEATURED_ACTIVITY.title}</Text>
          <Text style={styles.featuredDescription}>{FEATURED_ACTIVITY.description}</Text>
          <View style={styles.featuredDuration}>
            <Clock size={16} color={colors.white} strokeWidth={2} />
            <Text style={styles.featuredDurationText}>{FEATURED_ACTIVITY.estimated_minutes}분</Text>
          </View>
        </View>

        {/* Activity List */}
        <View style={styles.activityList}>
          {displayActivities.map((activity, index) => {
            const mockActivity = MOCK_ACTIVITIES[index % MOCK_ACTIVITIES.length];
            const iconType = mockActivity?.icon || 'heart';
            const displayTitle = 'title' in activity ? activity.title : mockActivity.title;
            const displayDescription = 'description' in activity ? activity.description : mockActivity.description;
            const displayMinutes = 'estimated_minutes' in activity ? activity.estimated_minutes : mockActivity.estimated_minutes;

            return (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                activeOpacity={0.7}
              >
                <View style={styles.activityIcon}>
                  {renderIcon(iconType)}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{displayTitle}</Text>
                  <Text style={styles.activityDescription}>{displayDescription}</Text>
                </View>
                <View style={styles.activityDuration}>
                  <Text style={styles.activityDurationText}>{displayMinutes}분</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
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
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  featuredCard: {
    backgroundColor: colors.accentWarm,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: alpha(colors.white, 0.3),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredDurationText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  activityDuration: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityDurationText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
