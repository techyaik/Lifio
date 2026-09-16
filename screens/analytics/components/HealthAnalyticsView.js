import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { AppText as Text } from '../../../components/AppText';
import { useTheme } from '../../../theme/ThemeContext';

export function ReferenceChartPanel({
  title,
  leftScale,
  rightScale,
  barLabel,
  lineLabel,
  barColor,
  lineColor,
  data,
  linePoints,
  muted,
  hint,
  track,
  text,
}) {
  return (
    <View style={styles.referenceChartWrap}>
      <View style={styles.referenceChartTop}>
        <Text style={[styles.referenceChartTitle, { color: muted }]}>{title}</Text>
      </View>

      <View style={styles.referenceChartBody}>
        <View style={styles.referenceLeftAxis}>
          {leftScale.map((item) => (
            <Text key={item} style={[styles.referenceScaleText, { color: hint }]}>{item}</Text>
          ))}
        </View>

        <View style={styles.referencePlotArea}>
          <View style={styles.referenceGrid}>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <View key={row} style={[styles.referenceGridLine, { borderColor: track }]} />
            ))}
          </View>

          <View style={styles.referenceBarsRow}>
            {data.map((item) => (
              <View key={item.key} style={styles.referenceBarColumn}>
                <View style={[styles.referenceBarTrack, { backgroundColor: track }]}>
                  <View style={[styles.referenceBarFill, { height: `${item.percent}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.referenceLineOverlay, { borderLeftColor: track }]}>
            <Svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.svgFill}>
              <Polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="1.8"
                points={linePoints}
              />
            </Svg>
          </View>
        </View>

        <View style={styles.referenceRightAxis}>
          {rightScale.map((item) => (
            <Text key={item} style={[styles.referenceScaleText, { color: lineColor }]}>{item}</Text>
          ))}
        </View>
      </View>

      <View style={styles.referenceLegendRow}>
        <LegendDot color={barColor} label={barLabel} labelColor={hint} />
        <LegendDot color={lineColor} label={lineLabel} labelColor={hint} />
      </View>
    </View>
  );
}

export function MetricBadge({ label, value, bg, border, text, muted }) {
  return (
    <View style={[styles.metricBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.metricBadgeLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.metricBadgeValue, { color: text }]} numberOfLines={1}>
        {value}
      </Text>
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
  referenceChartWrap: { gap: 12 },
  referenceChartTop: { flexDirection: 'row', justifyContent: 'space-between' },
  referenceChartTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  referenceChartBody: { flexDirection: 'row', height: 140, alignItems: 'stretch' },
  referenceLeftAxis: { justifyContent: 'space-between', paddingRight: 6 },
  referenceRightAxis: { justifyContent: 'space-between', paddingLeft: 6 },
  referenceScaleText: { fontSize: 9, fontWeight: '700' },
  referencePlotArea: { flex: 1, position: 'relative' },
  referenceGrid: { position: 'absolute', inset: 0, justifyContent: 'space-between' },
  referenceGridLine: { borderWidth: 0.5, borderStyle: 'dashed' },
  referenceBarsRow: { position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  referenceBarColumn: { width: 14, height: '100%', justifyContent: 'flex-end' },
  referenceBarTrack: { width: '100%', height: '100%', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  referenceBarFill: { width: '100%', borderRadius: 4 },
  referenceLineOverlay: { position: 'absolute', inset: 0 },
  svgFill: { width: '100%', height: '100%' },
  referenceLegendRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  metricBadge: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, gap: 2 },
  metricBadgeLabel: { fontSize: 10, fontWeight: '700' },
  metricBadgeValue: { fontSize: 14, fontWeight: '800' },
});
