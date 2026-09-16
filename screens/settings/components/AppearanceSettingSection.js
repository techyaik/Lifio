import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';

export function AppearanceSettingSection({ isCompact }) {
  const { colors, themeMode, setThemeMode } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Appearance</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Choose how Lifio looks on your device.
        </Text>
        <View style={[styles.themeSelectorRow, isCompact ? styles.themeSelectorRowCompact : null]}>
          {['light', 'dark', 'system'].map((mode) => {
            const active = themeMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[
                  styles.themeOption,
                  isCompact ? styles.themeOptionCompact : null,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  active && { borderColor: colors.health, backgroundColor: colors.accentLight.health },
                ]}
              >
                <Ionicons
                  name={
                    mode === 'light'
                      ? 'sunny-outline'
                      : mode === 'dark'
                      ? 'moon-outline'
                      : 'phone-portrait-outline'
                  }
                  size={20}
                  color={active ? colors.pillHealth.text : colors.textSecondary}
                />
                <Text style={[styles.themeOptionLabel, { color: active ? colors.pillHealth.text : colors.textPrimary }]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeSelectorRowCompact: {
    flexDirection: 'column',
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themeOptionCompact: {
    justifyContent: 'flex-start',
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
