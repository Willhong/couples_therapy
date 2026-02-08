/**
 * WaveformVisualizer component
 * Renders real-time audio metering data as vertical bars
 * Memoized to prevent unnecessary re-renders during recording
 */
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

const MAX_HEIGHT = 80;
const BAR_WIDTH = 3;
const BAR_GAP = 2;

interface Props {
  waveformData: number[];
  isRecording: boolean;
}

function WaveformVisualizerComponent({
  waveformData,
  isRecording,
}: Props): React.ReactElement {
  const barColor = isRecording ? '#6B7FD7' : '#D1D5DB';

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {waveformData.map((value, index) => (
          <View
            key={`bar-${index}`}
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

export const WaveformVisualizer = memo(WaveformVisualizerComponent, (prev, next) => {
  // Re-render if isRecording changes
  if (prev.isRecording !== next.isRecording) return false;
  // Re-render if data length changes (new bar added or reset)
  if (prev.waveformData.length !== next.waveformData.length) return false;
  // Compare last value to detect actual data changes
  const len = prev.waveformData.length;
  if (len === 0) return true;
  return prev.waveformData[len - 1] === next.waveformData[len - 1];
});

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
