/**
 * MessageList component
 * FlatList with inverted scroll (newest messages at bottom)
 */
import React, { useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';

import { MessageBubble } from './MessageBubble';
import { ChatMessage, ReframingData } from '../types';
import { colors } from '@/theme';

interface Props {
  messages: ChatMessage[];
  onOpenReframing?: (reframingData: ReframingData, messageId: string) => void;
  ListHeaderComponent?: React.ReactElement | null;
}

export function MessageList({
  messages,
  ListHeaderComponent,
}: Props): React.ReactElement {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((item: ChatMessage) => item._id, []);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      inverted
      style={styles.list}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews={true}
      ListHeaderComponent={ListHeaderComponent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    paddingVertical: 8,
  },
});
