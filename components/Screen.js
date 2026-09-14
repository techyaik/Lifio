import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SPACING } from '../constants/theme';

export function Screen({ children, scroll = true, loading = false, style, contentStyle, withBottomNav = false }) {
  const { colors } = useTheme();

  const insets = useSafeAreaInsets();
  const bottomNavPadding = withBottomNav ? 180 : SPACING.screen;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
        <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={[styles.loader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.pillHealth.text} />
          </View>
        </View>
      </View>
    );
  }

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + (withBottomNav ? 88 : 0) }]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content, 
          { paddingTop: insets.top + SPACING.screen, paddingBottom: insets.bottom + bottomNavPadding },
          contentStyle
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: SPACING.section },
  center: { alignItems: 'center', justifyContent: 'center' },
  loader: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
});
