import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '../../../components/AppText';

export function DualBarsChart({ data, incomeColor, expenseColor, trackColor, labelColor }) {
  return (
    <View style={styles.dualWrap}>
      <View style={styles.dualLegendRow}>
        <LegendDot color={incomeColor} label="Income" labelColor={labelColor} />
        <LegendDot color={expenseColor} label="Expenses" labelColor={labelColor} />
      </View>
      <View style={styles.dualBarsRow}>
        {data.map((item) => (
          <View key={item.key} style={styles.dualBarItem}>
            <View style={styles.dualTracks}>
              <View style={[styles.dualTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.dualFill, { height: `${item.incomePercent}%`, backgroundColor: incomeColor }]} />
              </View>
              <View style={[styles.dualTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.dualFill, { height: `${item.expensePercent}%`, backgroundColor: expenseColor }]} />
              </View>
            </View>
            <Text style={[styles.barLabel, { color: labelColor }]}>{item.short}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LegendDot({ color, label, labelColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dualWrap: { gap: 10 },
  dualLegendRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  dualBarsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 100, alignItems: 'flex-end' },
  dualBarItem: { flex: 1, alignItems: 'center', gap: 6 },
  dualTracks: { flexDirection: 'row', gap: 3, height: 80, alignItems: 'flex-end' },
  dualTrack: { width: 6, height: '100%', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  dualFill: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 10, fontWeight: '700' },
});
