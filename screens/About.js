import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { Screen } from '../components/Screen';
import { RADIUS, SHADOWS } from '../constants/theme';

export default function About({ navigation }) {
  const { colors } = useTheme();

  return (
    <Screen>
      <AppHeader title="About Application" onBack={() => navigation.navigate('Main')} />

      {/* Main Branding Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
            <Ionicons name="sparkles" size={24} color={colors.pillHealth.text} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Lifio</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Mindful Momentum Companion</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Designed to encourage small, daily victories. Easily log metrics, build habits, capture ideas, and catalog moods inside a cohesive on-device experience.
        </Text>
      </View>

      {/* Technical Specifications Bento Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Technical Details</Text>

        <View style={styles.grid}>
          <View style={[styles.specCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>1.0.0</Text>
          </View>

          <View style={[styles.specCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Platform</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>Expo SDK 51</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.specCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Database</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>AsyncStorage</Text>
          </View>

          <View style={[styles.specCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Release Date</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>June 2026</Text>
          </View>
        </View>
      </View>

      {/* Ethics statement */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Our Design Values</Text>
        <Text style={[styles.body, { color: colors.textSecondary, lineHeight: 18 }]}>
          • **No Ads**: We believe diagnostic environments should remain distraction-free.{"\n"}
          • **No Cloud Locks**: Your history is yours, stored locally, readable locally, and exportable locally.{"\n"}
          • **Premium Simplicity**: Crafting layouts that prioritize quick comprehension over complex workflows.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    ...SHADOWS.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  specCard: {
    flex: 1,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
    ...SHADOWS.subtle,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
