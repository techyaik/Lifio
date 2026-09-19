import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { format, isSameMonth, parseISO } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { MetricCard } from '../../components/MetricCard';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { useHabits } from '../../hooks/useHabits';
import { displayDate, isFutureDate, monthGridDays, todayKey } from '../../utils/dates';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { Ionicons } from "../../components/LineIcon";

export default function HabitDetail({ navigation, route }) {
  const { habits, isDone, getStreak, getBestStreak, getDayCompletionPercent } = useHabits();
  const { colors } = useTheme();

  const habit = habits.find((item) => item.id === route.params?.habit?.id) || route.params?.habit;
  const month = new Date();
  const days = monthGridDays(month);

  if (!habit) {
    return (
      <Screen>
        <AppHeader title="Habit" onBack={() => navigation.goBack()} />
        <Text style={{ color: colors.textPrimary, padding: 16 }}>Habit not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title={habit.name}
        onBack={() => navigation.goBack()}
        rightIcon="pencil"
        accent={colors.habits}
        onRight={() => navigation.navigate('HabitEdit', { habit })}
      />
      <View style={styles.grid}>
        <MetricCard value={getStreak(habit)} label="Current streak" accent={colors.habits} />
        <MetricCard value={`${getDayCompletionPercent(todayKey())}%`} label="Today all habits" accent={colors.habits} />
        <MetricCard value={getBestStreak(habit)} label="Best streak" accent={colors.habits} />
      </View>
      <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <SectionHeader>{format(month, 'MMMM yyyy')}</SectionHeader>
        <View style={styles.weekHeader}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
            <Text key={`${d}-${index}`} style={[styles.weekText, { color: colors.textHint }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.calendar}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const done = isDone(habit.id, key);
            const inMonth = isSameMonth(day, month);
            const future = isFutureDate(day);
            return (
              <View key={key} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayDot,
                    done ? { backgroundColor: colors.habits } : null,
                    !done && inMonth && !future ? { backgroundColor: colors.pillMindful.bg } : null,
                    key === todayKey() ? { borderColor: colors.habits, borderWidth: 1.5 } : null,
                    !inMonth ? styles.outside : null,
                  ]}
                >
                  <Text style={[styles.dayText, { color: colors.textSecondary }, done ? { color: colors.white, fontWeight: '700' } : null]}>{format(day, 'd')}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.habits }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.pillMindful.bg }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Missed</Text>
        </View>
      </View>
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text selectable style={[styles.info, { color: colors.textSecondary }]}>Started on {displayDate(habit.createdAt)} · Goal is {habit.goal}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  calendarCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    ...SHADOWS.subtle,
  },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekText: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  dayCell: { alignItems: 'center', width: `${100 / 7}%` },
  dayDot: { alignItems: 'center', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  outside: { opacity: 0.28 },
  dayText: { fontSize: 12 },
  legend: { flexDirection: 'row', gap: 20, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '500' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginTop: 4,
    ...SHADOWS.subtle,
  },
  info: { fontSize: 12, fontWeight: '500', flex: 1 },
});
