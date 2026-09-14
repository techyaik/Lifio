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
        <View style={{ marginBottom: 32 }}>
          {/* Logo */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <Text style={{ fontSize: 34, fontWeight: '400', color: colors.textPrimary, letterSpacing: -0.8 }}>lifio.</Text>
          </View>

          {/* Greeting */}
          <View>
            <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '800', marginBottom: 4 }}>
              Hi {firstName ? `${firstName},` : 'User,'}
            </Text>
            <Text style={{ fontSize: 40, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 8 }}>
              Welcome Back!
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '400' }}>
              Ready to track your progress today?
            </Text>
          </View>
        </View>

        {/* 2. Row 1: Mood & Habits */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {/* Daily Mood */}
          <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.xl, padding: 16, justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Daily Mood</Text>
            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '700', marginBottom: 16 }}>How are you feeling today?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              {moodEmojis.map((m) => (
                <Pressable key={m.key} onPress={() => handleQuickMood(m.key)} style={{ opacity: todayMood && todayMood !== m.key ? 0.4 : 1 }}>
                  <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Habits Today */}
          <Pressable onPress={() => navigation.navigate('HabitsTab')} style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.xl, padding: 16, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Habits Today</Text>
              <View style={{ backgroundColor: colors.habits, opacity: 0.8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="flame" size={10} color={colors.white} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.white }}>{streak}d</Text>
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 }}>{completedHabitsCount}/{activeHabits.length}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 12 }}>completed</Text>
              {/* Progress bar */}
              <View style={{ height: 6, backgroundColor: colors.borderLight, borderRadius: 3, width: '100%', overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: colors.habits, width: `${activeHabits.length > 0 ? (completedHabitsCount / activeHabits.length) * 100 : 0}%`, borderRadius: 3 }} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* 3. Row 2: Health Metrics */}
        <Pressable onPress={() => navigation.navigate('HealthTab')} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.xl, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Today's Health Metrics</Text>
            <Text style={{ fontSize: 13, color: colors.pillHealth.text, fontWeight: '700' }}>Full Dashboard →</Text>
          </View>

          {/* Grid Row 1: Primary Daily Activity */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {/* Steps */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="walk" size={22} color={colors.pillHealth.text} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {today?.steps ? Number(today.steps).toLocaleString() : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Steps</Text>
            </View>

            {/* Heart Rate */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="heart" size={22} color="#FF4B4B" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {(today?.heartRate || today?.watchData?.heartRate) ? `${today?.heartRate || today?.watchData?.heartRate}` : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Heart Rate</Text>
            </View>

            {/* Calories */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="flame" size={22} color="#FF9500" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {(today?.calories || today?.watchData?.calories) ? `${today?.calories || today?.watchData?.calories}` : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Calories</Text>
            </View>

            {/* Sleep */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="bed" size={22} color={colors.pillLearning.text} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {today?.sleep ? `${today.sleep}h` : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Sleep</Text>
            </View>
          </View>

          {/* Grid Row 2: Secondary Health Essentials */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
            {/* Height */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="resize-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {(today?.height || today?.watchData?.height) ? `${Math.round(today?.height || today?.watchData?.height)}cm` : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>Height</Text>
            </View>

            {/* Weight */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color={colors.pillHealth.text} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {today?.weight ? `${today.weight}kg` : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>Weight</Text>
            </View>

            {/* Distance */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {(today?.distance || today?.watchData?.distance) ? `${today?.distance || today?.watchData?.distance}km` : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>Distance</Text>
            </View>

            {/* Active Minutes */}
            <View style={{ alignItems: 'center', flexBasis: '22%', flexGrow: 1, gap: 6 }}>
              <Ionicons name="fitness-outline" size={20} color={colors.warning} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                {(today?.activeMinutes || today?.watchData?.activeMinutes) ? `${today?.activeMinutes || today?.watchData?.activeMinutes}m` : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>Active</Text>
            </View>
          </View>
        </Pressable>

        {/* 4. Row 3: Notes & Wallet */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {/* Notes */}
          <Pressable onPress={() => navigation.navigate('NotesTab')} style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.xl, padding: 16, minHeight: 220, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Notes Summary</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.pillFitness.text} />
            </View>
            <Text style={{ fontSize: 13, color: colors.textHint, fontStyle: 'italic', marginTop: 'auto' }}>
              {currentNote ? currentNote.title || 'Note written today.' : 'No notes written yet.'}
            </Text>
          </Pressable>

          {/* Wallet */}
          <Pressable onPress={() => navigation.navigate('JournalTab')} style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.xl, padding: 16, minHeight: 220, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="wallet-outline" size={16} color={colors.wallet} />
                <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }} numberOfLines={1}>Wallet</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
                <Pressable onPress={() => setWalletBalanceVisible(!walletBalanceVisible)}>
                  <Ionicons name={walletBalanceVisible ? "eye-outline" : "eye-off-outline"} size={16} color={colors.textHint} />
                </Pressable>
                <Ionicons name="arrow-forward" size={16} color={colors.wallet} />
              </View>
            </View>
            
            <View style={{ marginTop: 24, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Total Balance</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 12 }}>Private by default</Text>
              <Text style={{ fontSize: walletBalanceVisible ? 24 : 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: walletBalanceVisible ? -0.5 : 2 }} adjustsFontSizeToFit numberOfLines={1}>
                {walletBalanceVisible ? formatMoney(totalWalletBalance) : '••••'}
              </Text>
            </View>
            
            <View style={{ gap: 8 }}>
              <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="eye-off" size={14} color={colors.textHint} />
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.textHint, textAlign: 'center' }} numberOfLines={1}>Hidden for privacy</Text>
              </View>
              <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.white, textAlign: 'center' }} numberOfLines={1}>Open wallet</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* 5. Row 4: Quick Actions */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Pressable onPress={() => navigation.navigate('HealthTab')} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.health, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="heart" size={12} color={colors.white} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>Log Health</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('HabitsTab')} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.habits, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-done" size={12} color={colors.white} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>Add Habit</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('NotesTab')} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.notes, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-text" size={12} color={colors.white} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>New Note</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('JournalTab')} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.wallet, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="wallet" size={12} color={colors.white} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>Transaction</Text>
            </Pressable>
          </View>
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
