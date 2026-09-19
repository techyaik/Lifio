import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Screen } from '../components/Screen';
import { Ionicons, MaterialCommunityIcons, Feather, LineIcon } from '../components/LineIcon';
import { useTheme } from '../theme/ThemeContext';
import { useHealth } from '../hooks/useHealth';
import { useHabits } from '../hooks/useHabits';
import { useWallet } from '../hooks/useWallet';
import { useNotes } from '../hooks/useNotes';
import { SunsetGlowOrb } from '../components/SunsetGlowOrb';
import { getData, setData } from '../storage/storage';
import { todayKey, shouldCountForGoal } from '../utils/dates';
import { showToast } from '../utils/feedback';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

export default function Home({ navigation }) {
  const { colors, profileName, theme } = useTheme();
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();

  // Lifio Real Hooks
  const { habits, isDone, getStreak } = useHabits();
  const { getTodayLog } = useHealth();
  const { wallets, formatMoney } = useWallet();
  const { notes } = useNotes();

  const [todayMood, setTodayMood] = useState(null);
  const [walletBalanceVisible, setWalletBalanceVisible] = useState(false);

  // Load saved mood for today
  useEffect(() => {
    const loadMood = async () => {
      try {
        const moods = await getData('mood_logs');
        if (Array.isArray(moods)) {
          const todayEntry = moods.find((m) => m.date === todayKey());
          if (todayEntry) setTodayMood(todayEntry.mood);
        }
      } catch (e) {
        console.error('Error loading mood logs:', e);
      }
    };
    loadMood();
  }, []);

  const handleQuickMood = async (moodKey) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const moods = (await getData('mood_logs')) || [];
      const filtered = moods.filter((m) => m.date !== todayKey());
      const newMoods = [...filtered, { date: todayKey(), mood: moodKey }];
      await setData('mood_logs', newMoods);
      setTodayMood(moodKey);
      const label = moodKey.charAt(0).toUpperCase() + moodKey.slice(1);
      showToast(`Mood logged: ${label} ✓`);
    } catch (e) {
      console.error('Error logging quick mood:', e);
    }
  };

  const today = getTodayLog();
  const firstName = profileName ? profileName.trim().split(/\s+/)[0] : 'User';
  const currentDateFormatted = format(new Date(), 'EEEE, MMMM d');

  // Total wallet balance
  const totalWalletBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + (wallet.balance ?? 0), 0),
    [wallets]
  );

  // Active habits for today
  const activeHabits = useMemo(
    () => habits.filter((h) => shouldCountForGoal(todayKey(), h.goal)),
    [habits]
  );

  const completedHabitsCount = useMemo(
    () => activeHabits.filter((h) => isDone(h.id, todayKey())).length,
    [activeHabits, isDone]
  );

  const habitsPercentage = activeHabits.length > 0
    ? Math.round((completedHabitsCount / activeHabits.length) * 100)
    : 0;

  const maxStreak = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    const streaks = habits.map((h) => (getStreak ? getStreak(h) : 0));
    return Math.max(...streaks, 0);
  }, [habits, getStreak]);

  // Card dimensions for 2-column grid
  const cardWidth = (width - 40 - 12) / 2;

  // Real step count display
  const stepsDisplay = useMemo(() => {
    const s = today?.steps || today?.watchData?.steps;
    if (s && Number(s) > 0) {
      const num = Number(s);
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k steps` : `${num} steps`;
    }
    return '0 steps';
  }, [today]);

  // Real distance display
  const distanceDisplay = useMemo(() => {
    const d = today?.distance || today?.watchData?.distance;
    if (d && Number(d) > 0) {
      return `${d} km`;
    }
    return '0 km';
  }, [today]);

  // Real calories display
  const caloriesDisplay = useMemo(() => {
    const c = today?.calories || today?.watchData?.calories;
    if (c && Number(c) > 0) {
      return `${c} kcal`;
    }
    return '0 kcal';
  }, [today]);

  // Check if any vitals have been logged today
  const hasVitalsData = useMemo(() => {
    return Boolean(
      (today?.heartRate && Number(today.heartRate) > 0) ||
      (today?.watchData?.heartRate && Number(today.watchData.heartRate) > 0) ||
      (today?.calories && Number(today.calories) > 0) ||
      (today?.watchData?.calories && Number(today.watchData.calories) > 0) ||
      (today?.sleep && Number(today.sleep) > 0) ||
      (today?.water && Number(today.water) > 0)
    );
  }, [today]);

  const currentNote = notes && notes.length > 0 ? notes[0] : null;

  const moodEmojis = [
    { key: 'happy', emoji: '😊', label: 'Happy' },
    { key: 'neutral', emoji: '😐', label: 'Neutral' },
    { key: 'sad', emoji: '😔', label: 'Sad' },
    { key: 'stressed', emoji: '😤', label: 'Stressed' },
    { key: 'excited', emoji: '🤩', label: 'Excited' },
  ];

  return (
    <Screen contentStyle={styles.screenContent} withBottomNav>
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
            Hi, {firstName}
          </Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
            {currentDateFormatted}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate('SettingsTab')}
          style={({ pressed }) => [
            styles.avatarBtn,
            { borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            }}
            style={styles.avatarImage}
          />
        </Pressable>
      </View>

      {/* ── 2. 2x2 Bento Metric Grid (Reference Aesthetic) ─────────── */}
      <View style={styles.bentoGrid}>
        {/* Row 1 */}
        <View style={styles.bentoRow}>
          {/* Card 1: Activity / Steps with Signature Rising Sunset Glow Orb */}
          <Pressable
            onPress={() => navigation.navigate('HealthTab')}
            style={({ pressed }) => [
              styles.bentoCard,
              styles.activityCard,
              {
                width: cardWidth,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Activity
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.textPrimary} />
            </View>

            <Text style={[styles.activityValue, { color: colors.textPrimary }]}>
              {stepsDisplay}
            </Text>

            {/* Glowing Sunset Orb Rising from Bottom */}
            <View style={styles.glowWrapper}>
              <SunsetGlowOrb width={cardWidth} height={68} variant="semi" />
            </View>
          </Pressable>

          {/* Card 2: Wallet / Finances */}
          <Pressable
            onPress={() => navigation.navigate('JournalTab')}
            style={({ pressed }) => [
              styles.bentoCard,
              styles.statCard,
              {
                width: cardWidth,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Wallet
              </Text>
              <Pressable hitSlop={10} onPress={() => setWalletBalanceVisible((v) => !v)}>
                <Ionicons
                  name={walletBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Text
              style={[
                styles.largeMetric,
                { color: colors.textPrimary, fontSize: walletBalanceVisible ? 20 : 28 },
              ]}
              numberOfLines={1}
            >
              {walletBalanceVisible ? formatMoney(totalWalletBalance) : '••••'}
            </Text>

            <Text style={[styles.goalSubText, { color: colors.textSecondary }]}>
              {wallets.length} active {wallets.length === 1 ? 'wallet' : 'wallets'}
            </Text>
          </Pressable>
        </View>

        {/* Row 2 */}
        <View style={styles.bentoRow}>
          {/* Card 3: Notes & Reflections */}
          <Pressable
            onPress={() => navigation.navigate('NotesTab')}
            style={({ pressed }) => [
              styles.bentoCard,
              styles.statCard,
              {
                width: cardWidth,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Notes
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.textPrimary} />
            </View>

            <Text
              style={[
                styles.noteBentoPreview,
                { color: currentNote ? colors.textPrimary : colors.textHint },
              ]}
              numberOfLines={2}
            >
              {currentNote ? (currentNote.title || currentNote.content || 'Note written today.') : 'Capture a thought...'}
            </Text>

            <Text style={[styles.goalSubText, { color: colors.primaryOrange }]}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved →
            </Text>
          </Pressable>

          {/* Card 4: Daily Habits Goal */}
          <Pressable
            onPress={() => navigation.navigate('HabitsTab')}
            style={({ pressed }) => [
              styles.bentoCard,
              styles.goalCard,
              {
                width: cardWidth,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Weekly goal
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.textPrimary} />
            </View>

            <Text style={[styles.largeMetric, { color: colors.textPrimary }]}>
              {habitsPercentage}%
            </Text>

            <View style={styles.goalFooterRow}>
              <Text style={[styles.goalSubText, { color: colors.textSecondary }]}>
                {completedHabitsCount} of {activeHabits.length || 0}{'\n'}habits done
              </Text>

              <View
                style={[
                  styles.habitStreakBadge,
                  {
                    backgroundColor: isDark ? 'rgba(255, 87, 34, 0.12)' : '#FFF0EB',
                    borderColor: isDark ? 'rgba(255, 87, 34, 0.25)' : '#FFD9CC',
                  },
                ]}
              >
                <Text style={styles.habitStreakFire}>🔥</Text>
                <Text style={[styles.habitStreakText, { color: colors.primaryOrange }]}>
                  {maxStreak > 0 ? `${maxStreak}d` : '0d'}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── 3. Vitals Overview (Single-layer, clean overview) ───────── */}
      <Pressable
        onPress={() => navigation.navigate('HealthTab')}
        style={({ pressed }) => [
          styles.vitalsCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={styles.vitalsHeader}>
          <View style={styles.vitalsTitleBlock}>
            <View style={[styles.vitalsBadge, { backgroundColor: 'rgba(255, 75, 75, 0.08)' }]}>
              <LineIcon name="heart" size={15} color="#FF4B4B" strokeWidth={1.8} />
            </View>
            <Text style={[styles.vitalsTitle, { color: colors.textPrimary }]}>
              Today's Vitals
            </Text>
          </View>
          <View style={styles.dashboardLinkRow}>
            <Text style={[styles.dashboardLink, { color: colors.primaryOrange }]}>
              Dashboard
            </Text>
            <LineIcon name="chevron-forward" size={12} color={colors.primaryOrange} strokeWidth={2} />
          </View>
        </View>

        {hasVitalsData ? (
          /* Flat single-layer stats row: concise, no nested cards */
          <View style={styles.vitalsStatsRow}>
            <View style={styles.vitalStatCol}>
              <Text style={[styles.vitalStatVal, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.heartRate || today?.watchData?.heartRate) ? `${today?.heartRate || today?.watchData?.heartRate}` : '0'}
              </Text>
              <Text style={[styles.vitalStatUnit, { color: colors.textSecondary }]}>bpm</Text>
              <Text style={[styles.vitalStatLabel, { color: colors.textSecondary }]}>Heart</Text>
            </View>

            <View style={[styles.vitalDivider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.vitalStatCol}>
              <Text style={[styles.vitalStatVal, { color: colors.textPrimary }]} numberOfLines={1}>
                {(today?.calories || today?.watchData?.calories) ? `${today?.calories || today?.watchData?.calories}` : '0'}
              </Text>
              <Text style={[styles.vitalStatUnit, { color: colors.textSecondary }]}>kcal</Text>
              <Text style={[styles.vitalStatLabel, { color: colors.textSecondary }]}>Calories</Text>
            </View>

            <View style={[styles.vitalDivider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.vitalStatCol}>
              <Text style={[styles.vitalStatVal, { color: colors.textPrimary }]} numberOfLines={1}>
                {today?.sleep ? `${today.sleep}` : '0'}
              </Text>
              <Text style={[styles.vitalStatUnit, { color: colors.textSecondary }]}>hrs</Text>
              <Text style={[styles.vitalStatLabel, { color: colors.textSecondary }]}>Sleep</Text>
            </View>

            <View style={[styles.vitalDivider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.vitalStatCol}>
              <Text style={[styles.vitalStatVal, { color: colors.textPrimary }]} numberOfLines={1}>
                {today?.water ? `${today.water}` : '0'}
              </Text>
              <Text style={[styles.vitalStatUnit, { color: colors.textSecondary }]}>ml</Text>
              <Text style={[styles.vitalStatLabel, { color: colors.textSecondary }]}>Water</Text>
            </View>
          </View>
        ) : (
          /* Clean empty state when no vitals have been logged today */
          <View style={styles.emptyVitalsRow}>
            <View style={styles.emptyVitalsTextCol}>
              <Text style={[styles.emptyVitalsTitle, { color: colors.textPrimary }]}>
                No vitals logged today
              </Text>
              <Text style={[styles.emptyVitalsSubtitle, { color: colors.textSecondary }]}>
                Track heart rate, calories, sleep & water
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('HealthTab', { screen: 'HealthLogEntry' })}
              style={({ pressed }) => [
                styles.logVitalsBtn,
                { backgroundColor: colors.primaryOrange, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <LineIcon name="add" size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.logVitalsBtnText}>Log</Text>
            </Pressable>
          </View>
        )}
      </Pressable>

      {/* ── 4. Daily Mood Logging ───────────────────────────────── */}
      <View
        style={[
          styles.moodCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.moodHeader}>
          <Text style={[styles.moodTitle, { color: colors.textPrimary }]}>
            How are you feeling today?
          </Text>
        </View>

        <View style={styles.emojiRow}>
          {moodEmojis.map((m) => {
            const isSelected = todayMood === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => handleQuickMood(m.key)}
                style={({ pressed }) => [
                  styles.emojiBtn,
                  isSelected && [
                    styles.emojiBtnSelected,
                    {
                      backgroundColor: colors.surfaceIce,
                      borderColor: colors.borderIce,
                    },
                  ],
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Text style={styles.emojiText}>{m.emoji}</Text>
                <Text
                  style={[
                    styles.emojiLabel,
                    {
                      color: isSelected ? colors.primaryOrange : colors.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── 5. Quick Actions Grid ─────────────────────────────────── */}
      <View style={styles.quickActionsSection}>
        <Text style={[styles.quickActionsTitle, { color: colors.textSecondary }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActionsGrid}>
          <Pressable
            onPress={() => navigation.navigate('HealthTab')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryOrange }]}>
              <Ionicons name="heart" size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>
              Log Health
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('HabitsTab')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>
              Add Habit
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('NotesTab')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="document-text" size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>
              New Note
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('JournalTab')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="wallet" size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]} numberOfLines={1}>
              Transaction
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
  headerTextGroup: {
    gap: 2,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '400',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  // ── 2. Bento Grid ───────────────────────────────────────────
  bentoGrid: {
    gap: 12,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    minHeight: 142,
    justifyContent: 'space-between',
  },
  activityCard: {
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 0,
  },
  statCard: {
    justifyContent: 'space-between',
  },
  goalCard: {
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  activityValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
    zIndex: 2,
  },
  glowWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: -8,
  },
  largeMetric: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 10,
  },
  goalFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  goalSubText: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  habitStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  habitStreakFire: {
    fontSize: 11,
  },
  habitStreakText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  noteBentoPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 6,
  },

  // ── 3. Vitals Overview ──────────────────────────────────────
  vitalsCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  vitalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalsTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vitalsBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dashboardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dashboardLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  vitalsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vitalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  vitalStatVal: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  vitalStatUnit: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  vitalStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  vitalDivider: {
    width: 1,
    height: 32,
  },
  emptyVitalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  emptyVitalsTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  emptyVitalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyVitalsSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  logVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  logVitalsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── 4. Mood Card ────────────────────────────────────────────
  moodCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  moodHeader: {
    paddingHorizontal: 2,
  },
  moodTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  emojiBtnSelected: {
    borderWidth: 1,
  },
  emojiText: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 11,
  },

  // ── 5. Quick Actions Grid ───────────────────────────────────
  quickActionsSection: {
    marginBottom: 12,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
