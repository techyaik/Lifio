import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../constants/theme';

export function Pill({ label, palette, selected, onPress }) {
  const { colors, resolveThemeColor } = useTheme();

  // Resolve palette dynamically if passed
  let activeBg = colors.pillOther.bg;
  let activeText = colors.pillOther.text;

  if (palette) {
    activeBg = palette.bg ? resolveThemeColor(palette.bg) : activeBg;
    activeText = palette.text ? resolveThemeColor(palette.text) : activeText;
  }

  const Container = onPress ? Pressable : Pressable;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? activeText : activeBg,
          borderColor: activeText,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.onAccent : activeText }]} numberOfLines={1}>
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
