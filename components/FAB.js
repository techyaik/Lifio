import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export function FAB({ onPress, color, icon = 'add' }) {
  const { colors, resolveThemeColor } = useTheme();

  const activeColor = color ? resolveThemeColor(color) : colors.health;

  return (
    <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: activeColor }]} hitSlop={10}>
      <Ionicons name={icon} size={22} color={colors.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
});
