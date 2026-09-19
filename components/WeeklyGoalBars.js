import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText as Text } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from "./LineIcon";

/**
 * 5-bar mini illustration displayed on the Weekly Goal bento card
 */
export function WeeklyGoalMiniBars({ color, height = 36 }) {
  const { colors } = useTheme();
  const barColor = color || colors.primaryOrange;
  
  // Heights relative to max
  const heights = [10, 18, 30, 14, 24];

  return (
    <View style={[styles.miniContainer, { height }]}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.miniBar,
            {
              height: h,
              backgroundColor: barColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Full 7-day capsule bar chart matching the top-right reference panel
 * Shows:
 * - Header: "Weekly goal" + date range "Jan12 - Jan19 >"
 * - Values on top of bars: "10.6k", "5.4k", etc.
 * - Bold rounded capsule bars (Mon - Sun)
 * - Day labels below
 */
export function WeeklyGoalFullChart({
  data = [
    { day: 'Mon', value: '10.6k', raw: 10.6 },
    { day: 'Tue', value: '5.4k', raw: 5.4 },
    { day: 'Wed', value: '7.2k', raw: 7.2 },
    { day: 'Thu', value: '10.5k', raw: 10.5 },
    { day: 'Fri', value: '3.4k', raw: 3.4 },
    { day: 'Sat', value: '8.3k', raw: 8.3 },
    { day: 'Sun', value: '10.6k', raw: 10.6 },
  ],
  dateRange = 'Jan12 - Jan19',
  onPressRange,
  style,
}) {
  const { colors } = useTheme();
  const maxVal = Math.max(...data.map(d => d.raw), 12);
  const chartHeight = 110;

  return (
    <View style={[styles.fullCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }, style]}>
      {/* Header Row */}
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Weekly goal</Text>
        <Pressable onPress={onPressRange} style={styles.dateSelector}>
          <Text style={[styles.dateRangeText, { color: colors.textPrimary }]}>{dateRange}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* 7 Bars Row */}
      <View style={styles.barsRow}>
        {data.map((item, idx) => {
          const hasSteps = (item.raw || 0) > 0;
          const barHeight = hasSteps ? Math.max(((item.raw || 0) / maxVal) * chartHeight, 22) : 10;
          const barColor = hasSteps ? (colors.primaryOrange || '#FF5722') : colors.surfaceTint;

          return (
            <View key={idx} style={styles.barColumn}>
              {/* Value Label */}
              <Text
                style={[
                  styles.barValueText,
                  {
                    color: item.isToday ? colors.textPrimary : colors.textSecondary,
                    fontWeight: item.isToday ? '700' : '500',
                  },
                ]}
              >
                {item.value}
              </Text>

              {/* Capsule Bar */}
              <View style={[styles.barSlot, { height: chartHeight }]}>
                <View
                  style={[
                    styles.capsuleBar,
                    {
                      height: barHeight,
                      backgroundColor: barColor,
                      borderWidth: item.isToday && !hasSteps ? 1.5 : 0,
                      borderColor: item.isToday ? (colors.primaryOrange || '#FF5722') : 'transparent',
                    },
                  ]}
                />
              </View>

              {/* Day Label */}
              <View style={[styles.dayContainer, item.isToday && { backgroundColor: colors.surfaceTint, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }]}>
                <Text
                  style={[
                    styles.barDayText,
                    {
                      color: item.isToday ? (colors.primaryOrange || '#FF5722') : colors.textPrimary,
                      fontWeight: item.isToday ? '800' : '500',
                      marginTop: item.isToday ? 0 : 8,
                    },
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  miniBar: {
    width: 4.5,
    borderRadius: 999,
  },
  fullCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 8,
  },
  barSlot: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  capsuleBar: {
    width: 26,
    borderRadius: 999, // Pill shape rounded at both top and bottom
  },
  barDayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});

