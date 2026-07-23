import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function WalletBalance({
  balance,
  totalIn,
  totalOut,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  formatMoney,
}) {
  const { colors } = useTheme();

  const fmt = (n) => {
    if (formatMoney) return formatMoney(n);
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {monthLabel} balance
          </Text>
          <Text selectable style={[styles.balanceText, { color: colors.textPrimary }]}>
            {fmt(balance)}
          </Text>
        </View>
        <View style={styles.navButtons}>
          <Pressable
            onPress={onPrevMonth}
            style={({ pressed }) => [
              styles.navBtn,
              { borderColor: colors.borderLight, backgroundColor: pressed ? colors.surface : colors.white },
              SHADOWS.subtle,
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={onNextMonth}
            style={({ pressed }) => [
              styles.navBtn,
              { borderColor: colors.borderLight, backgroundColor: pressed ? colors.surface : colors.white },
              SHADOWS.subtle,
            ]}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
        <View style={styles.statGroup}>
          <View style={[styles.indicatorDot, { backgroundColor: colors.tealMid }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            In <Text style={[styles.statValue, { color: colors.textPrimary }]}>{fmt(totalIn)}</Text>
          </Text>
        </View>
        <View style={styles.statGroup}>
          <View style={[styles.indicatorDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            Out <Text style={[styles.statValue, { color: colors.textPrimary }]}>{fmt(totalOut)}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    ...SHADOWS.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  balanceText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 0.5,
    paddingTop: 12,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
  },
  statValue: {
    fontWeight: '600',
  },
});
