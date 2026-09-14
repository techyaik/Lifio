import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';
import { PrimaryButton } from './PrimaryButton';

export function EmptyState({ icon, message, action, actionLabel, accent }) {
  const { colors, resolveThemeColor } = useTheme();

  const activeAccent = accent ? resolveThemeColor(accent) : colors.health;

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={36} color={activeAccent} />
      </View>
      <Text selectable style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {action ? <PrimaryButton title={actionLabel} onPress={action} color={activeAccent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
    ...SHADOWS.subtle,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
