import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SharedReframingDetail } from '@/features/chat/components/SharedReframingDetail';
import { colors } from '@/theme';

/**
 * Shared reframing detail screen
 */
export default function SharedDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleResponseSubmitted = () => {
    // Navigate back after successful submission
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <SharedReframingDetail
        sharedId={id}
        onResponseSubmitted={handleResponseSubmitted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
});
