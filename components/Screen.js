import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SPACING } from '../constants/theme';

export function Screen({ children, scroll = true, loading = false, style, contentStyle }) {
  const { colors, gradients } = useTheme();

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
        <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={[styles.loader, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.health} />
          </View>
        </View>
      </View>
    );
  }

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
        <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }, style]}>
      <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content, 
          { paddingTop: insets.top + SPACING.screen, paddingBottom: insets.bottom + SPACING.screen },
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
  content: { padding: SPACING.screen, gap: SPACING.section },
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
