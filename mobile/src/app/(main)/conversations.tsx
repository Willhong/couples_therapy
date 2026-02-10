/**
 * Conversation List route - displays AI conversations and voice analysis
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MessageCircle, Mic, Radio } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';

interface Conversation {
  id: string;
  title: string;
  date: string;
  tag: string;
  tagColor: 'purple' | 'amber' | 'red';
  preview: string;
  icon: 'message-circle' | 'mic' | 'radio';
  iconBg: string;
  iconColor: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    title: '주말 계획 대화',
    date: '오늘',
    tag: 'AI 리프레이밍',
    tagColor: 'purple',
    preview: '이번 주말에 같이 산책하면서 이야기해볼까?',
    icon: 'message-circle',
    iconBg: '#EEF0FB',
    iconColor: '#6B7FD7',
  },
  {
    id: '2',
    title: '집안일 분담',
    date: '어제',
    tag: '녹음 분석',
    tagColor: 'amber',
    preview: '집안일 분담에 대해서 좀 더 이야기해봐야 할 것 같아.',
    icon: 'mic',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
  },
  {
    id: '3',
    title: '가계부 정리',
    date: '2일 전',
    tag: '녹음 분석',
    tagColor: 'amber',
    preview: '이번 달 예산에 대해 함께 정리했어요.',
    icon: 'radio',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
  },
];

export default function ConversationsRoute(): React.ReactElement {
  const renderIcon = (iconType: 'message-circle' | 'mic' | 'radio', color: string) => {
    const IconComponent = iconType === 'message-circle' ? MessageCircle : iconType === 'mic' ? Mic : Radio;
    return <IconComponent size={20} color={color} strokeWidth={2} />;
  };

  const getTagStyle = (tagColor: 'purple' | 'amber' | 'red') => {
    switch (tagColor) {
      case 'purple':
        return { backgroundColor: '#EEF0FB', color: '#6B7FD7' };
      case 'amber':
        return { backgroundColor: '#FEF3C7', color: '#F59E0B' };
      case 'red':
        return { backgroundColor: '#FEE2E2', color: '#EF4444' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>대화</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Plus size={20} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Conversation List */}
        <View style={styles.conversationList}>
          {MOCK_CONVERSATIONS.map((conversation) => {
            const tagStyle = getTagStyle(conversation.tagColor);
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationCard}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: conversation.iconBg }]}>
                  {renderIcon(conversation.icon, conversation.iconColor)}
                </View>
                <View style={styles.conversationBody}>
                  <View style={styles.conversationTop}>
                    <Text style={styles.conversationTitle}>{conversation.title}</Text>
                    <Text style={styles.conversationDate}>{conversation.date}</Text>
                  </View>
                  <View style={styles.tagChip} />
                  <View style={[styles.tag, { backgroundColor: tagStyle.backgroundColor }]}>
                    <Text style={[styles.tagText, { color: tagStyle.color }]}>
                      {conversation.tag}
                    </Text>
                  </View>
                  <Text style={styles.conversationPreview}>{conversation.preview}</Text>
                </View>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  conversationList: {
    gap: 12,
  },
  conversationCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationBody: {
    flex: 1,
    gap: 4,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  conversationDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagChip: {
    height: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  conversationPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
