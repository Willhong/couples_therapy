/**
 * Main app layout with tab navigation.
 * 4 tabs: Home, Activities, Journal, Insights
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { House, CalendarHeart, MessageSquareHeart, BarChart3 } from 'lucide-react-native';

export default function MainLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7C9082',
        tabBarInactiveTintColor: '#ADADAD',
        tabBarLabelStyle: {
          fontSize: 10,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E4DF',
          borderTopWidth: 1,
          height: 84,
          paddingTop: 12,
          paddingBottom: 28,
          paddingHorizontal: 40,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <House size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: '활동',
          tabBarIcon: ({ color, size }) => (
            <CalendarHeart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: '일기',
          tabBarIcon: ({ color, size }) => (
            <MessageSquareHeart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: '인사이트',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="checkin-flow"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="transcript/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="post-recording-choice"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cooldown"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="topics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shared/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="prompt-history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="recording-preview"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
