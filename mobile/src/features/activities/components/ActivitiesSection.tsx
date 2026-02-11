import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityCard } from './ActivityCard';
import { getFeaturedActivities, startActivity, type Activity } from '../api';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

export function ActivitiesSection(): React.ReactElement | null {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getFeaturedActivities()
      .then(setActivities)
      .catch(() => {}); // Silently fail
  }, []);

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

  const handleSeeAll = () => {
    router.push('/(main)/activities');
  };

  if (activities.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>커플 활동</Text>
        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>전체보기</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={handleActivityPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
