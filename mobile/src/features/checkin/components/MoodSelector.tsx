import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOODS = [
  { value: 1, label: '매우 나쁨', icon: 'sad-outline' as const, color: '#E57373' },
  { value: 2, label: '나쁨', icon: 'sad-outline' as const, color: '#FFB74D' },
  { value: 3, label: '보통', icon: 'remove-circle-outline' as const, color: '#FFD54F' },
  { value: 4, label: '좋음', icon: 'happy-outline' as const, color: '#81C784' },
  { value: 5, label: '매우 좋음', icon: 'happy-outline' as const, color: '#7C9082' },
];

interface Props {
  selected: number | null;
  onSelect: (mood: number) => void;
  disabled?: boolean;
}

export function MoodSelector({ selected, onSelect, disabled = false }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      {MOODS.map((mood) => (
        <Pressable
          key={mood.value}
          style={[
            styles.moodItem,
            selected === mood.value && { backgroundColor: mood.color + '20', borderColor: mood.color },
          ]}
          onPress={() => !disabled && onSelect(mood.value)}
          disabled={disabled}
        >
          <Ionicons
            name={mood.icon}
            size={28}
            color={selected === mood.value ? mood.color : '#ADADAD'}
          />
          <Text style={[
            styles.moodLabel,
            selected === mood.value && { color: mood.color, fontWeight: '600' },
          ]}>
            {mood.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 58,
  },
  moodLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 4,
  },
});
