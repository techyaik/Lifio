import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { MOODS } from '../constants/categories';
import { RADIUS, SHADOWS } from '../constants/theme';

export function MoodPicker({ value, onChange }) {
  const { colors, resolveThemeColor } = useTheme();

  return (
    <View style={styles.wrap}>
      {MOODS.map((mood) => {
        const selected = value === mood.key;
        const activeAccent = resolveThemeColor(mood.color);
        return (
          <Pressable
            key={mood.key}
            onPress={() => onChange(mood.key)}
            style={[
              styles.circle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
              selected ? [SHADOWS.subtle, { borderColor: activeAccent, backgroundColor: colors.surface }] : null,
            ]}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10 },
  circle: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emoji: { fontSize: 23 },
});
