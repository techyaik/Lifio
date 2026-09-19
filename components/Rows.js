import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from "./LineIcon";
import { useTheme } from '../theme/ThemeContext';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SHADOWS } from '../constants/theme';
import { Pill } from './Pill';

export function ListRow({ title, subtitle, right, onPress, onLongPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.borderLight }
      ]}
    >
      <View style={styles.rowText}>
        <Text selectable style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={[TYPOGRAPHY.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || <Ionicons name="chevron-forward" size={18} color={colors.textHint} />}
    </Pressable>
  );
}

export function HabitRow({ habit, done, streak, category, onToggle, onPress, onLongPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.borderLight }
      ]}
    >
      <Pressable
        onPress={onToggle}
        style={[
          styles.check,
          { borderColor: colors.habits },
          done ? { backgroundColor: colors.habits, borderColor: colors.habits } : null
        ]}
      >
        {done ? <Ionicons name="checkmark" size={17} color={colors.white} /> : null}
      </Pressable>
      <View style={styles.rowText}>
        <Text selectable style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Pill label={category.label} palette={category.color} />
      </View>
      <Text style={[TYPOGRAPHY.meta, { color: colors.textSecondary }]}>🔥 {streak}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    padding: 16,
  },
  rowText: { flex: 1, gap: 5 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  check: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
