/**
 * WaveformVisualizer component
 * Renders real-time audio metering data as vertical bars
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

const MAX_HEIGHT = 80;
const BAR_WIDTH = 3;
const BAR_GAP = 2;

interface Props {
  waveformData: number[];
  isRecording: boolean;
}

export function WaveformVisualizer({
  waveformData,
  isRecording,
}: Props): React.ReactElement {
  const barColor = isRecording ? '#6B7FD7' : '#D1D5DB';

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {waveformData.map((value, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(2, value * MAX_HEIGHT),
                backgroundColor: barColor,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MAX_HEIGHT,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    minHeight: 2,
  },
});
