import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function PrimaryButton({ title, onPress, color, disabled = false, icon, style }) {
  const { colors, gradients, resolveThemeColor } = useTheme();

  const activeColor = color ? resolveThemeColor(color) : colors.health;
  const buttonTextColor = colors.onAccent;
  const buttonIcon = React.isValidElement(icon)
    ? React.cloneElement(icon, { color: buttonTextColor })
    : icon;

  const gradientForColor = () => {
    if (activeColor === colors.habits) return gradients.habits;
    if (activeColor === colors.notes) return gradients.notes;
    if (activeColor === colors.wallet) return gradients.wallet;
    if (activeColor === colors.danger) return [colors.gradientDangerStart, colors.danger];
    return gradients.health;
  };

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
      <LinearGradient
        colors={disabled ? [colors.textHint, colors.textHint] : gradientForColor()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {buttonIcon}
        <Text style={[styles.text, { color: buttonTextColor }]}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    minHeight: 50,
  },
  gradient: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  disabled: { opacity: 0.7 },
  text: { fontSize: 15, fontWeight: '700' },
});
