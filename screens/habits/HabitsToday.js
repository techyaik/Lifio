import React from 'react';
import { Alert, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../constants/categories';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { FeatureWalkthrough } from '../../components/FeatureWalkthrough';
import { HabitRow } from '../../components/Rows';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { FAB } from '../../components/FAB';
import { useHabits } from '../../hooks/useHabits';
import { displayDate, todayKey, shouldCountForGoal } from '../../utils/dates';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { WALKTHROUGH_STEPS } from '../../constants/walkthroughs';
import { showToast } from '../../utils/feedback';

export default function HabitsToday({ navigation }) {
  const { habits, loading, isDone, toggleCompletion, getStreak, getWeekPercents, deleteHabit } = useHabits();
  const { colors, triggerDataRefresh } = useTheme();
  const insets = useSafeAreaInsets();
  
  const activeHabits = habits.filter((h) => shouldCountForGoal(todayKey(), h.goal));
  const doneCount = activeHabits.filter((habit) => isDone(habit.id)).length;
  const week = getWeekPercents();

  const quickOptions = (habit) =>
    Alert.alert(habit.name, 'Quick options', [
      { text: 'Edit', onPress: () => navigation.navigate('HabitEdit', { habit }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete habit?', 'This removes the habit and all completion history.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteHabit(habit.id);
                  triggerDataRefresh();
                  showToast('Habit deleted ✓');
                } catch (error) {
                  console.error('Delete habit failed:', error);
                  Alert.alert('Error', 'Failed to delete habit: ' + error.message);
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <View style={styles.container}>
      <Screen loading={loading} withBottomNav>
        <AppHeader title="Habits" showMenu={false} showSettings={false} />
        <View style={styles.section}>
          <SectionHeader>Today — {doneCount} of {activeHabits.length} done</SectionHeader>
          {activeHabits.length ? (
            activeHabits.map((habit) => {
              const category = CATEGORIES.find((item) => item.key === habit.category) || CATEGORIES[CATEGORIES.length - 1];
              return (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  done={isDone(habit.id)}
                  streak={getStreak(habit)}
                  category={category}
                  onToggle={() => toggleCompletion(habit.id)}
                  onPress={() => navigation.navigate('HabitDetail', { habit })}
                  onLongPress={() => quickOptions(habit)}
                />
              );
            })
          ) : (
            <EmptyState
              icon="checkmark-circle-outline"
              message={habits.length ? "No habits scheduled for today." : "No habits yet. Build your first one."}
              actionLabel="+ Add habit"
              action={() => navigation.navigate('AddHabit')}
              accent={colors.habits}
            />
          )}
        </View>
        {habits.length ? (
          <View style={styles.section}>
            <SectionHeader>Weekly completion</SectionHeader>
            <View style={[styles.weekBars, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {week.map((day) => {
                const isToday = day.date === todayKey();
                return (
                  <View key={day.date} style={styles.barItem}>
                    <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${day.percent || 0}%`,
                            backgroundColor: isToday ? colors.habits : colors.accentLight.habits,
                            opacity: day.percent === 0 ? 0 : 1,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, { color: colors.textSecondary }, isToday ? { color: colors.pillLearning.text, fontWeight: '800' } : null]}>
                      {displayDate(day.date, 'EEE')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </Screen>
      {!loading && habits.length > 0 && (
        <View style={[styles.fabWrap, { bottom: insets.bottom + 104 }]}>
          <FAB color={colors.pillLearning.text} onPress={() => navigation.navigate('AddHabit')} />
        </View>
      )}
      <FeatureWalkthrough screenKey="habits" steps={WALKTHROUGH_STEPS.habits} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { gap: 14, marginBottom: 12 },
  weekBars: {
    alignItems: 'flex-end',
    borderRadius: RADIUS.xl,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 160,
    paddingHorizontal: 24,
    paddingVertical: 20,
    ...SHADOWS.soft,
  },
  barItem: { alignItems: 'center', flex: 1, gap: 8 },
  barTrack: { borderRadius: RADIUS.pill, height: 100, justifyContent: 'flex-end', overflow: 'hidden', width: 16 },
  barFill: { borderRadius: RADIUS.pill, width: 16 },
  dayLabel: { fontSize: 12, fontWeight: '600' },
  fabWrap: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    ...SHADOWS.glow,
  },
});
