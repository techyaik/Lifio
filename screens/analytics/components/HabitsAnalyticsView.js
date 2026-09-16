import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '../../../components/AppText';

export function ProgressBar({ percent, color, trackColor }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

export function MiniLineStats({ data, accent, muted }) {
  return (
    <View style={styles.miniLineRow}>
      {data.map((item) => (
        <View key={item.key} style={styles.miniLineCol}>
          <View style={[styles.miniLineTrack, { backgroundColor: muted + '20' }]}>
            <View style={[styles.miniLineFill, { width: `${Math.max(10, item.value)}%`, backgroundColor: accent }]} />
          </View>
          <Text style={[styles.miniLineLabel, { color: muted }]}>{item.short}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  miniLineRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  miniLineCol: { flex: 1, alignItems: 'center', gap: 4 },
  miniLineTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  miniLineFill: { height: '100%', borderRadius: 3 },
  miniLineLabel: { fontSize: 10, fontWeight: '700' },
});
