import React, { useState, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useTheme } from '../../theme/ThemeContext';
import { CATEGORIES } from '../../constants/categories';
import { FeatureWalkthrough } from '../../components/FeatureWalkthrough';
import { Screen } from '../../components/Screen';
import { useHabits } from '../../hooks/useHabits';
import { todayKey, shouldCountForGoal } from '../../utils/dates';
import { WALKTHROUGH_STEPS } from '../../constants/walkthroughs';
import { showToast } from '../../utils/feedback';
import { format, parseISO, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LineIcon } from '../../components/LineIcon';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekends', label: 'Weekends' },
];

export default function HabitsToday({ navigation }) {
  const { habits, loading, isDone, toggleCompletion, getStreak, deleteHabit } = useHabits();
  const { colors, theme, triggerDataRefresh } = useTheme();
  const isDark = theme === 'dark';

  const [selectedFilter, setSelectedFilter] = useState('all');

  const currentDateFormatted = useMemo(() => format(new Date(), 'EEEE, MMMM d'), []);

  // Active habits scheduled for today
  const activeHabits = useMemo(
    () => habits.filter((h) => shouldCountForGoal(todayKey(), h.goal)),
    [habits]
  );

  const doneCount = useMemo(
    () => activeHabits.filter((h) => isDone(h.id)).length,
    [activeHabits, isDone]
  );

  const completionPercent = activeHabits.length > 0
    ? Math.round((doneCount / activeHabits.length) * 100)
    : 0;

  // Maximum current streak across all habits
  const maxStreak = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    const streaks = habits.map((h) => (getStreak ? getStreak(h) : 0));
    return Math.max(...streaks, 0);
  }, [habits, getStreak]);

  // 7-day consistency strip (past 6 days + today)
  const weekDays = useMemo(() => {
    const today = parseISO(todayKey());
    return Array.from({ length: 7 }, (_, i) => {
      const dateObj = subDays(today, 6 - i);
      const key = format(dateObj, 'yyyy-MM-dd');
      const isToday = key === todayKey();
      const activeForDay = habits.filter((h) => shouldCountForGoal(key, h.goal));
      const doneForDay = activeForDay.filter((h) => isDone(h.id, key)).length;
      const percent = activeForDay.length > 0 ? Math.round((doneForDay / activeForDay.length) * 100) : 0;
      return {
        key,
        dayLetter: format(dateObj, 'EEEEE'),
        dayNum: format(dateObj, 'd'),
        isToday,
        percent,
        isComplete: percent === 100 && activeForDay.length > 0,
      };
    });
  }, [habits, isDone]);

  // Filtered habits list
  const filteredHabits = useMemo(() => {
    if (selectedFilter === 'all') return activeHabits;
    return habits.filter((h) => h.goal === selectedFilter);
  }, [habits, activeHabits, selectedFilter]);

  const handleToggle = (habitId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_e) {}
    toggleCompletion(habitId);
  };

  const quickOptions = (habit) =>
    Alert.alert(habit.name, 'Habit options', [
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
      <Screen loading={loading} contentStyle={styles.screenContent} withBottomNav>
        {/* ── 1. Header ────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
              Habits
            </Text>
            <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
              {currentDateFormatted}
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('AddHabit')}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <LineIcon name="add" size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ── 2. Today's Progress Summary ──────────────────────────── */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTextCol}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                {doneCount} of {activeHabits.length || 0} completed
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                {completionPercent}% of today's routine
              </Text>
            </View>

            {maxStreak > 0 && (
              <View
                style={[
                  styles.streakPill,
                  {
                    backgroundColor: isDark ? 'rgba(255, 87, 34, 0.12)' : '#FFF0EB',
                    borderColor: isDark ? 'rgba(255, 87, 34, 0.25)' : '#FFD9CC',
                  },
                ]}
              >
                <Text style={styles.streakFlame}>🔥</Text>
                <Text style={[styles.streakPillText, { color: colors.primaryOrange }]}>
                  {maxStreak}d streak
                </Text>
              </View>
            )}
          </View>

          {/* Clean hairline progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPercent}%`,
                  backgroundColor: colors.primaryOrange,
                },
              ]}
            />
          </View>
        </View>

        {/* ── 3. 7-Day Consistency Capsules ───────────────────────── */}
        {habits.length > 0 && (
          <View
            style={[
              styles.weekStrip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            {weekDays.map((day) => {
              return (
                <View key={day.key} style={styles.weekDayCol}>
                  <Text
                    style={[
                      styles.weekDayLetter,
                      { color: day.isToday ? colors.textPrimary : colors.textSecondary },
                      day.isToday && { fontWeight: '700' },
                    ]}
                  >
                    {day.dayLetter}
                  </Text>

                  <View
                    style={[
                      styles.weekDayCapsule,
                      {
                        backgroundColor: day.isComplete
                          ? colors.primaryOrange
                          : day.percent > 0
                          ? isDark
                            ? 'rgba(255, 87, 34, 0.15)'
                            : '#FFF0EB'
                          : 'transparent',
                        borderColor: day.isToday
                          ? colors.primaryOrange
                          : day.percent > 0
                          ? colors.primaryOrange
                          : colors.borderLight,
                        borderWidth: day.isToday ? 1.5 : 1,
                      },
                    ]}
                  >
                    {day.isComplete ? (
                      <LineIcon name="checkmark" size={11} color="#FFFFFF" strokeWidth={2.8} />
                    ) : (
                      <Text
                        style={[
                          styles.weekDayNum,
                          {
                            color: day.percent > 0
                              ? colors.primaryOrange
                              : colors.textSecondary,
                            fontWeight: day.isToday || day.percent > 0 ? '700' : '500',
                          },
                        ]}
                      >
                        {day.dayNum}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 4. Understated Goal Filter Tabs ──────────────────────── */}
        {habits.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsRow}
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = selectedFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch (_e) {}
                    setSelectedFilter(tab.key);
                  }}
                  style={({ pressed }) => [
                    styles.filterPill,
                    {
                      backgroundColor: isSelected
                        ? colors.textPrimary
                        : colors.surface,
                      borderColor: isSelected
                        ? colors.textPrimary
                        : colors.borderLight,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: isSelected ? colors.surface : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── 5. Habits List ───────────────────────────────────────── */}
        <View style={styles.habitsSection}>
          {filteredHabits.length > 0 ? (
            filteredHabits.map((habit) => {
              const done = isDone(habit.id);
              const streak = getStreak(habit);
              const category =
                CATEGORIES.find((item) => item.key === habit.category) ||
                CATEGORIES[CATEGORIES.length - 1];

              return (
                <Pressable
                  key={habit.id}
                  onPress={() => navigation.navigate('HabitDetail', { habit })}
                  onLongPress={() => quickOptions(habit)}
                  style={({ pressed }) => [
                    styles.habitCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      opacity: done ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  {/* Circular Checkbox */}
                  <Pressable
                    onPress={() => handleToggle(habit.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={({ pressed }) => [
                      styles.checkbox,
                      done
                        ? {
                            backgroundColor: colors.primaryOrange,
                            borderColor: colors.primaryOrange,
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: colors.border,
                          },
                      { transform: [{ scale: pressed ? 0.88 : 1 }] },
                    ]}
                  >
                    {done && (
                      <LineIcon name="checkmark" size={14} color="#FFFFFF" strokeWidth={2.8} />
                    )}
                  </Pressable>

                  {/* Habit Name & Meta */}
                  <View style={styles.habitInfoCol}>
                    <Text
                      style={[
                        styles.habitTitle,
                        {
                          color: done ? colors.textSecondary : colors.textPrimary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {habit.name}
                    </Text>

                    <View style={styles.habitMetaRow}>
                      <Text style={[styles.categoryText, { color: category.color?.text || colors.textSecondary }]}>
                        {category.label}
                      </Text>
                      {habit.reminderTime && (
                        <Text style={[styles.metaDotText, { color: colors.textHint }]}>
                          · {habit.reminderTime}
                        </Text>
                      )}
                      {habit.goal && habit.goal !== 'daily' && (
                        <Text style={[styles.metaDotText, { color: colors.textHint }]}>
                          · {habit.goal}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Right: Streak & Chevron */}
                  <View style={styles.habitRightGroup}>
                    {streak > 0 && (
                      <Text style={[styles.streakInlineText, { color: colors.primaryOrange }]}>
                        🔥 {streak}d
                      </Text>
                    )}
                    <LineIcon name="chevron-forward" size={13} color={colors.textHint} />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View style={[styles.emptyIconBadge, { backgroundColor: colors.surfaceIce }]}>
                <LineIcon name="checkmark-circle-outline" size={24} color={colors.primaryOrange} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {habits.length === 0 ? 'No habits yet' : 'No habits in this filter'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {habits.length === 0
                  ? 'Build routines that stick. Start with one simple daily habit.'
                  : 'Select a different filter or tap + above to add a new habit.'}
              </Text>

              {habits.length === 0 && (
                <Pressable
                  onPress={() => navigation.navigate('AddHabit')}
                  style={({ pressed }) => [
                    styles.emptyAddBtn,
                    {
                      backgroundColor: colors.primaryOrange,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <LineIcon name="add" size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyAddBtnText}>Add a habit</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Screen>

      <FeatureWalkthrough screenKey="habits" steps={WALKTHROUGH_STEPS.habits} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 20,
    gap: 16,
  },

  // ── 1. Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  headerTextCol: {
    gap: 2,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '400',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 2. Progress Summary ────────────────────────────────────
  summarySection: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTextCol: {
    gap: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summarySubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  streakFlame: {
    fontSize: 11,
  },
  streakPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // ── 3. 7-Day Consistency Strip ─────────────────────────────
  weekStrip: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekDayCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weekDayLetter: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekDayCapsule: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNum: {
    fontSize: 12,
  },

  // ── 4. Filter Tabs ─────────────────────────────────────────
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },

  // ── 5. Habits List ─────────────────────────────────────────
  habitsSection: {
    gap: 10,
    marginBottom: 8,
  },
  habitCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfoCol: {
    flex: 1,
    gap: 3,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaDotText: {
    fontSize: 11,
    fontWeight: '400',
  },
  habitRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakInlineText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Empty State ────────────────────────────────────────────
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  emptyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
