import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function MetricCard({ value, label, accent, icon, style }) {
  const { colors, resolveThemeColor } = useTheme();
  
  let bgTint = colors.white;
  let borderCol = colors.borderLight;
  
  const activeAccent = accent ? resolveThemeColor(accent) : colors.health;
  
  if (activeAccent === colors.health) {
    bgTint = colors.accentLight.health;
  } else if (activeAccent === colors.habits) {
    bgTint = colors.accentLight.habits;
  } else if (activeAccent === colors.notes) {
    bgTint = colors.accentLight.notes;
  } else if (activeAccent === colors.wallet) {
    bgTint = colors.accentLight.wallet;
  }

  return (
    <View style={[styles.card, { backgroundColor: bgTint, borderColor: borderCol }, style]}>
      <View style={styles.header}>
        <Text selectable style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        {icon}
      </View>
      <Text selectable style={[styles.value, { color: activeAccent || colors.textPrimary }]} numberOfLines={1}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 82,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
});
