import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Frown, Meh, Smile } from 'lucide-react-native';
import { colors } from '@/theme';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'frown': Frown,
  'meh': Meh,
  'smile': Smile,
};

const MOODS = [
  { value: 1, label: '매우 나쁨', icon: 'frown', color: '#E57373' },
  { value: 2, label: '나쁨', icon: 'frown', color: '#FFB74D' },
  { value: 3, label: '보통', icon: 'meh', color: '#FFD54F' },
  { value: 4, label: '좋음', icon: 'smile', color: '#81C784' },
  { value: 5, label: '매우 좋음', icon: 'smile', color: colors.primary },
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
          {(() => {
            const IconComp = ICON_MAP[mood.icon] || Meh;
            return <IconComp size={28} color={selected === mood.value ? mood.color : colors.textTertiary} />;
          })()}
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
    color: colors.textTertiary,
    marginTop: 4,
  },
});
