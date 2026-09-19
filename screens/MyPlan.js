import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Ionicons } from "../components/LineIcon";
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { Screen } from '../components/Screen';
import { useHabits } from '../hooks/useHabits';
import { RADIUS, SHADOWS } from '../constants/theme';

export default function MyPlan({ navigation }) {
  const { colors } = useTheme();
  const { habits } = useHabits();

  const categories = habits.reduce((acc, h) => {
    acc[h.category] = (acc[h.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <Screen>
      <AppHeader title="My Plan" onBack={() => navigation.navigate('Main')} />

      {/* Plan Overview Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
            <Ionicons name="compass" size={24} color={colors.pillHealth.text} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Strategic Compass</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Personal Growth Blueprint</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your daily targets are designed to align hydration, fitness, learning, and mindfulness into a sustainable routine.
        </Text>
      </View>

      {/* Health Targets Bento Cards */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Health Targets</Text>
        
        <View style={styles.grid}>
          <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="walk" size={24} color={colors.pillHealth.text} />
            <Text style={[styles.bentoValue, { color: colors.textPrimary }]}>10,000</Text>
            <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>Steps Daily</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="bed" size={24} color={colors.pillHealth.text} />
            <Text style={[styles.bentoValue, { color: colors.textPrimary }]}>8.0 hrs</Text>
            <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>Ideal Sleep</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="water" size={24} color={colors.pillHealth.text} />
            <Text style={[styles.bentoValue, { color: colors.textPrimary }]}>8 glasses</Text>
            <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>Hydration Goal</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="flag" size={24} color={colors.pillLearning.text} />
            <Text style={[styles.bentoValue, { color: colors.textPrimary }]}>{habits.length}</Text>
            <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>Active Habits</Text>
          </View>
        </View>
      </View>

      {/* Habits Breakdown */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Habits Categories</Text>
        <View style={styles.breakdownList}>
          {['health', 'learning', 'fitness', 'mindfulness'].map((cat) => {
            const count = categories[cat] || 0;
            const percentage = habits.length ? Math.round((count / habits.length) * 100) : 0;
            let icon = 'heart-outline';
            let catColor = colors.health;
            let title = 'Health';

            if (cat === 'learning') {
              icon = 'book-outline';
              catColor = colors.notes;
              title = 'Learning';
            } else if (cat === 'fitness') {
              icon = 'barbell-outline';
              catColor = colors.habits;
              title = 'Fitness';
            } else if (cat === 'mindfulness') {
              icon = 'leaf-outline';
              catColor = colors.wallet;
              title = 'Mindfulness';
            }

            return (
              <View key={cat} style={styles.breakdownRow}>
                <Ionicons name={icon} size={18} color={catColor} />
                <Text style={[styles.catName, { color: colors.textPrimary }]}>{title}</Text>
                <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
                  <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: catColor }]} />
                </View>
                <Text style={[styles.progressBarLabel, { color: colors.textSecondary }]}>{count} ({percentage}%)</Text>
              </View>
            );
          })}
        </View>
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
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
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
  bentoCard: {
    flex: 1,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
    ...SHADOWS.subtle,
  },
  bentoValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  progressBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 56,
    textAlign: 'right',
  },
});
