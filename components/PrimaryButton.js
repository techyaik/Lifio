import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function PrimaryButton({ title, onPress, color, disabled = false, icon, style }) {
  const { colors, resolveThemeColor } = useTheme();

  const activeColor = color ? resolveThemeColor(color) : colors.health;
  const buttonTextColor = colors.onAccent;
  const buttonIcon = React.isValidElement(icon)
    ? React.cloneElement(icon, { color: buttonTextColor })
    : icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        disabled ? styles.disabled : SHADOWS.subtle,
        style,
      ]}
    >
      <View
        style={[
          styles.solidBackground,
          { backgroundColor: disabled ? colors.textHint : activeColor }
        ]}
      >
        {buttonIcon}
        <Text style={[styles.text, { color: buttonTextColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.pill,
    minHeight: 56,
  },
  solidBackground: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
  },
  disabled: { opacity: 0.7 },
  text: { fontSize: 15, fontWeight: '700' },
});
