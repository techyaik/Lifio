import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text as RNText, useWindowDimensions, View, ScrollView } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/Screen';
import { useHabits } from '../hooks/useHabits';
import { useHealth } from '../hooks/useHealth';
import { useWallet } from '../hooks/useWallet';
import { useNotes } from '../hooks/useNotes';
import { getData, setData } from '../storage/storage';
import { todayKey, shouldCountForGoal } from '../utils/dates';
import { RADIUS, SHADOWS } from '../constants/theme';
import { showToast } from '../utils/feedback';
import { format } from 'date-fns';

export default function Home({ navigation }) {
  const { colors, profileName } = useTheme();
  const { width } = useWindowDimensions();

  const { habits, getStreak, isDone } = useHabits();
  const { getTodayLog } = useHealth();
  const { wallets, formatMoney } = useWallet();
  const { notes } = useNotes();

  const [todayMood, setTodayMood] = React.useState(null);
  const [walletBalanceVisible, setWalletBalanceVisible] = React.useState(false);

  React.useEffect(() => {
    const loadMood = async () => {
      const moods = await getData('mood_logs');
      const todayEntry = moods.find((m) => m.date === todayKey());
      if (todayEntry) setTodayMood(todayEntry.mood);
    };
    loadMood();
  }, []);

  const today = getTodayLog();
  const activeHabits = habits.filter((h) => shouldCountForGoal(todayKey(), h.goal));
  const completedHabitsCount = activeHabits.filter((h) => isDone(h.id, todayKey())).length;
  const streak = activeHabits.length > 0 ? Math.max(...activeHabits.map(h => getStreak(h)), 0) : 0;

  const currentNote = notes[0];
  const firstName = profileName ? profileName.split(/\s+/)[0] : '';
  const totalWalletBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + (wallet.balance ?? 0), 0),
    [wallets]
  );

  const handleQuickMood = async (moodKey) => {
    try {
      const moods = await getData('mood_logs');
      const filtered = moods.filter((m) => m.date !== todayKey());
      const newMoods = [...filtered, { date: todayKey(), mood: moodKey }];
      await setData('mood_logs', newMoods);
      setTodayMood(moodKey);
      showToast('Mood logged successfully!');
    } catch (e) {
      console.error('Error logging quick mood:', e);
    }
  };

  const currentDate = format(new Date(), 'EEEE, MMMM d');
  const moodEmojis = [
    { key: 'happy', emoji: '😊' },
    { key: 'neutral', emoji: '😐' },
    { key: 'sad', emoji: '😔' },
    { key: 'stressed', emoji: '😤' },
    { key: 'excited', emoji: '🤩' },
  ];

  return (
    <Screen contentStyle={{ paddingHorizontal: 24 }} withBottomNav>
      <View>
        {/* 1. Top Header */}
        <View style={styles.headerSection}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>lifio.</Text>
          </View>

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={[styles.greetingHi, { color: colors.textPrimary }]}>
              Hi {firstName ? `${firstName},` : 'User,'}
            </Text>
            <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
              Welcome Back!
            </Text>
            <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
              Ready to track your progress today?
            </Text>
          </View>
        </View>

        {/* 2. Row 1: Mood & Habits */}
        <View style={styles.row1}>
          {/* Daily Mood */}
          <View style={[styles.moodCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.kicker, { color: colors.textSecondary }]}>Daily Mood</Text>
            <Text style={[styles.moodQuestion, { color: colors.textPrimary }]}>How are you feeling today?</Text>
            <View style={styles.emojiRow}>
              {moodEmojis.map((m) => (
                <Pressable key={m.key} onPress={() => handleQuickMood(m.key)} style={{ opacity: todayMood && todayMood !== m.key ? 0.4 : 1 }}>
                  <Text style={styles.emojiText}>{m.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Habits Today */}
          <Pressable onPress={() => navigation.navigate('HabitsTab')} style={[styles.habitsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.habitsHeader}>
              <Text style={[styles.kicker, { flex: 1, color: colors.textSecondary }]}>Habits Today</Text>
              <View style={[styles.streakBadge, { backgroundColor: colors.habits }]}>
                <Ionicons name="flame" size={10} color={colors.white} />
                <Text style={[styles.streakText, { color: colors.white }]}>{streak}d</Text>
              </View>
            </View>
            <View>
              <Text style={[styles.habitsCount, { color: colors.textPrimary }]}>{completedHabitsCount}/{activeHabits.length}</Text>
              <Text style={[styles.habitsSubtext, { color: colors.textSecondary }]}>completed</Text>
              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.habits, width: `${activeHabits.length > 0 ? (completedHabitsCount / activeHabits.length) * 100 : 0}%` }]} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* 3. Row 2: Health Metrics */}
        <Pressable onPress={() => navigation.navigate('HealthTab')} style={[styles.healthCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.healthCardHeader}>
            <Text style={[styles.kicker, { color: colors.textSecondary }]}>Today's Health Metrics</Text>
            <Text style={[styles.dashboardLink, { color: colors.pillHealth.text }]}>Full Dashboard →</Text>
          </View>

          {/* Grid Row 1: Primary Daily Activity */}
          <View style={styles.metricsRow}>
            {/* Steps */}
            <View style={styles.metricCell}>
              <Ionicons name="walk" size={22} color={colors.pillHealth.text} />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {today?.steps ? Number(today.steps).toLocaleString() : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Steps</Text>
            </View>

            {/* Heart Rate */}
            <View style={styles.metricCell}>
              <Ionicons name="heart" size={22} color="#FF4B4B" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.heartRate || today?.watchData?.heartRate) ? `${today?.heartRate || today?.watchData?.heartRate}` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Heart Rate</Text>
            </View>

            {/* Calories */}
            <View style={styles.metricCell}>
              <Ionicons name="flame" size={22} color="#FF9500" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.calories || today?.watchData?.calories) ? `${today?.calories || today?.watchData?.calories}` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Calories</Text>
            </View>

            {/* Sleep */}
            <View style={styles.metricCell}>
              <Ionicons name="bed" size={22} color={colors.pillLearning.text} />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {today?.sleep ? `${today.sleep}h` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Sleep</Text>
            </View>
          </View>

          {/* Grid Row 2: Secondary Health Essentials */}
          <View style={[styles.metricsRow, styles.metricsRowSecondary, { borderTopColor: colors.borderLight }]}>
            {/* Height */}
            <View style={styles.metricCell}>
              <Ionicons name="resize-outline" size={20} color={colors.primary} />
              <Text style={[styles.metricValueSm, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.height || today?.watchData?.height) ? `${Math.round(today?.height || today?.watchData?.height)}cm` : '—'}
              </Text>
              <Text style={[styles.metricLabelSm, { color: colors.textSecondary }]}>Height</Text>
            </View>

            {/* Weight */}
            <View style={styles.metricCell}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color={colors.pillHealth.text} />
              <Text style={[styles.metricValueSm, { color: colors.textPrimary }]} numberOfLines={1}>
                {today?.weight ? `${today.weight}kg` : '—'}
              </Text>
              <Text style={[styles.metricLabelSm, { color: colors.textSecondary }]}>Weight</Text>
            </View>

            {/* Distance */}
            <View style={styles.metricCell}>
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              <Text style={[styles.metricValueSm, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.distance || today?.watchData?.distance) ? `${today?.distance || today?.watchData?.distance}km` : '—'}
              </Text>
              <Text style={[styles.metricLabelSm, { color: colors.textSecondary }]}>Distance</Text>
            </View>

            {/* Active Minutes */}
            <View style={styles.metricCell}>
              <Ionicons name="fitness-outline" size={20} color={colors.warning} />
              <Text style={[styles.metricValueSm, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.activeMinutes || today?.watchData?.activeMinutes) ? `${today?.activeMinutes || today?.watchData?.activeMinutes}m` : '—'}
              </Text>
              <Text style={[styles.metricLabelSm, { color: colors.textSecondary }]}>Active</Text>
            </View>
          </View>
        </Pressable>

        {/* 4. Row 3: Notes & Wallet */}
        <View style={styles.row3}>
          {/* Notes */}
          <Pressable onPress={() => navigation.navigate('NotesTab')} style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.notesHeader}>
              <Text style={[styles.kicker, { color: colors.textSecondary }]}>Notes Summary</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.pillFitness.text} />
            </View>
            <Text style={[styles.notesPreview, { color: colors.textHint }]}>
              {currentNote ? currentNote.title || 'Note written today.' : 'No notes written yet.'}
            </Text>
          </Pressable>

          {/* Wallet */}
          <Pressable onPress={() => navigation.navigate('JournalTab')} style={[styles.walletCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.walletHeader}>
              <View style={styles.walletHeaderLeft}>
                <Ionicons name="wallet-outline" size={16} color={colors.wallet} />
                <Text style={[styles.kicker, { flex: 1, color: colors.textSecondary }]} numberOfLines={1}>Wallet</Text>
              </View>
              <View style={styles.walletHeaderRight}>
                <Pressable onPress={() => setWalletBalanceVisible(!walletBalanceVisible)}>
                  <Ionicons name={walletBalanceVisible ? "eye-outline" : "eye-off-outline"} size={16} color={colors.textHint} />
                </Pressable>
                <Ionicons name="arrow-forward" size={16} color={colors.wallet} />
              </View>
            </View>

            <View style={styles.walletBalanceSection}>
              <Text style={[styles.walletBalanceKicker, { color: colors.textSecondary }]}>Total Balance</Text>
              <Text style={[styles.walletBalanceSubtext, { color: colors.textSecondary }]}>Private by default</Text>
              <Text
                style={[
                  styles.walletBalanceValue,
                  { color: colors.textPrimary, fontSize: walletBalanceVisible ? 24 : 32, letterSpacing: walletBalanceVisible ? -0.5 : 2 }
                ]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {walletBalanceVisible ? formatMoney(totalWalletBalance) : '••••'}
              </Text>
            </View>

            <View style={styles.walletPills}>
              <View style={[styles.walletPill, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="eye-off" size={14} color={colors.textHint} />
                <Text style={[styles.walletPillText, { color: colors.textHint }]} numberOfLines={1}>Hidden for privacy</Text>
              </View>
              <View style={[styles.walletPill, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.walletPillText, { color: colors.white }]} numberOfLines={1}>Open wallet</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* 5. Row 4: Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.kicker, { color: colors.textSecondary, marginBottom: 10 }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <Pressable onPress={() => navigation.navigate('HealthTab')} style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.health }]}>
                <Ionicons name="heart" size={14} color={colors.white} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>Log Health</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('HabitsTab')} style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.habits }]}>
                <Ionicons name="checkmark-done" size={14} color={colors.white} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>Add Habit</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('NotesTab')} style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.notes }]}>
                <Ionicons name="document-text" size={14} color={colors.white} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>New Note</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('JournalTab')} style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.wallet }]}>
                <Ionicons name="wallet" size={14} color={colors.white} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>Transaction</Text>
            </Pressable>
          </View>
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────
  headerSection: {
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -0.8,
  },
  greetingBlock: {
    gap: 2,
  },
  greetingHi: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },

  // ── Shared ──────────────────────────────────────────────────────────────
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },

  // ── Row 1: Mood + Habits ────────────────────────────────────────────────
  row1: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  moodCard: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  moodQuestion: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  habitsCard: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  streakBadge: {
    opacity: 0.85,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
  },
  habitsCount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  habitsSubtext: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    marginTop: 1,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ── Row 2: Health ───────────────────────────────────────────────────────
  healthCard: {
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 12,
    gap: 16,
  },
  healthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricsRowSecondary: {
    paddingTop: 14,
    borderTopWidth: 1,
  },
  metricCell: {
    alignItems: 'center',
    flexBasis: '22%',
    flexGrow: 1,
    gap: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValueSm: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricLabelSm: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Row 3: Notes + Wallet ───────────────────────────────────────────────
  row3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  notesCard: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 16,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesPreview: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 'auto',
    lineHeight: 19,
  },
  walletCard: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 16,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  walletHeaderRight: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  walletBalanceSection: {
    marginTop: 20,
    marginBottom: 14,
  },
  walletBalanceKicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  walletBalanceSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  walletBalanceValue: {
    fontWeight: '800',
  },
  walletPills: {
    gap: 8,
  },
  walletPill: {
    borderRadius: RADIUS.pill,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  walletPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Row 4: Quick Actions ────────────────────────────────────────────────
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
});
