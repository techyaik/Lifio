import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View, ScrollView } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import {
  useWaterReminders,
  INTERVAL_OPTIONS,
  GOAL_OPTIONS,
} from '../../hooks/useWaterReminders';
import { showToast } from '../../utils/feedback';
import { RADIUS, SHADOWS } from '../../constants/theme';

export default function WaterReminders({ navigation }) {
  const { colors } = useTheme();
  const {
    config,
    todayLogs,
    todayDrankGlasses,
    loading,
    updateConfig,
    logWaterDrank,
    undoWaterDrank,
    nextReminderLabel,
  } = useWaterReminders();

  const [startTime, setStartTime] = useState(config.startTime);
  const [endTime, setEndTime] = useState(config.endTime);

  const percent = Math.min(100, Math.round((todayDrankGlasses / (config.dailyGoal || 8)) * 100));

  const handleLog = async (glasses) => {
    const total = await logWaterDrank(glasses);
    showToast(`Drank ${glasses} glass${glasses > 1 ? 'es' : ''}! (${total}/${config.dailyGoal} glasses) 💧`);
  };

  const handleUndo = async () => {
    await undoWaterDrank();
    showToast('Undo water log ↩');
  };

  const handleSaveTimes = async () => {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      showToast('Please enter times in HH:MM 24-hour format.');
      return;
    }
    await updateConfig({ startTime, endTime });
    showToast('Reminder schedule updated ✓');
  };

  return (
    <Screen loading={loading} contentStyle={styles.content} withBottomNav>
      <AppHeader title="Water Reminders" onBack={() => navigation.goBack()} />

      {/* 1. Hero Hydration Progress Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tealLight + '30' }]}>
              <Ionicons name="water" size={24} color={colors.tealLight} />
            </View>
            <View>
              <Text style={[styles.heroTitle, { color: colors.white }]}>Hydration Goal</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textHint }]}>{nextReminderLabel}</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar & Stat */}
        <View style={styles.statContainer}>
          <View style={styles.statNumberRow}>
            <Text style={[styles.bigNumber, { color: colors.white }]}>{todayDrankGlasses}</Text>
            <Text style={[styles.goalNumber, { color: colors.textHint }]}>/ {config.dailyGoal} glasses</Text>
          </View>
          <Text style={[styles.litersText, { color: colors.tealLight }]}>
            {(todayDrankGlasses * 0.25).toFixed(1)} L of {(config.dailyGoal * 0.25).toFixed(1)} L Goal ({percent}%)
          </Text>

          <View style={[styles.trackBg, { backgroundColor: colors.surfaceTint }]}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: colors.tealLight }]} />
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => handleLog(1)}
            style={[styles.quickButton, { backgroundColor: colors.tealLight }]}
          >
            <Ionicons name="add" size={18} color={colors.surfaceElevated} />
            <Text style={[styles.quickButtonText, { color: colors.surfaceElevated }]}>+1 Glass (250ml)</Text>
          </Pressable>

          <Pressable
            onPress={() => handleLog(2)}
            style={[styles.quickButtonSecondary, { backgroundColor: colors.surfaceTint }]}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={[styles.quickButtonText, { color: colors.white }]}>+2 Glasses (500ml)</Text>
          </Pressable>
        </View>

        {todayLogs.length > 0 && (
          <Pressable onPress={handleUndo} style={styles.undoRow}>
            <Ionicons name="arrow-undo-outline" size={14} color={colors.textHint} />
            <Text style={[styles.undoText, { color: colors.textHint }]}>Undo last entry ({todayLogs[0].time})</Text>
          </Pressable>
        )}
      </View>

      {/* 2. Reminder Schedule & Settings */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <SectionHeader>Reminder Settings</SectionHeader>

        {/* Enable Switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Drinking Reminders</Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Get notified during daytime hours</Text>
          </View>
          <Switch
            value={config.enabled}
            onValueChange={(val) => updateConfig({ enabled: val })}
            trackColor={{ false: colors.border, true: colors.tealLight }}
            thumbColor={colors.white}
          />
        </View>

        {/* Interval Selection */}
        <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Reminder Frequency</Text>
        <View style={styles.pillWrap}>
          {INTERVAL_OPTIONS.map((item) => (
            <Pill
              key={item.minutes}
              label={item.label}
              selected={config.intervalMinutes === item.minutes}
              onPress={() => updateConfig({ intervalMinutes: item.minutes })}
              palette={colors.pillHealth}
            />
          ))}
        </View>

        {/* Daily Goal Selection */}
        <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Daily Goal</Text>
        <View style={styles.pillWrap}>
          {GOAL_OPTIONS.map((item) => (
            <Pill
              key={item.glasses}
              label={item.label}
              selected={config.dailyGoal === item.glasses}
              onPress={() => updateConfig({ dailyGoal: item.glasses })}
              palette={colors.pillHealth}
            />
          ))}
        </View>

        {/* Daytime Schedule Window */}
        <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Active Hours Window (24h)</Text>
        <View style={styles.timeRow}>
          <InputField
            style={styles.timeInput}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="Start (08:00)"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>to</Text>
          <InputField
            style={styles.timeInput}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="End (22:00)"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <PrimaryButton title="Save Schedule Window" onPress={handleSaveTimes} style={{ marginTop: 12 }} />
      </View>

      {/* 3. Today's Hydration Log Timeline */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <SectionHeader>Today's Log Timeline</SectionHeader>
        {todayLogs.length === 0 ? (
          <Text style={[styles.emptyLogs, { color: colors.textHint }]}>No water logged yet today. Tap +1 Glass above to start!</Text>
        ) : (
          todayLogs.map((log) => (
            <View key={log.id} style={[styles.timelineItem, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.timelineLeft}>
                <Ionicons name="water" size={16} color={colors.tealLight} />
                <Text style={[styles.timelineTime, { color: colors.textPrimary }]}>{log.time}</Text>
              </View>
              <Text style={[styles.timelineAmount, { color: colors.textSecondary }]}>
                +{log.glasses} glass{log.glasses > 1 ? 'es' : ''} ({log.glasses * 250}ml)
              </Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  statContainer: {
    gap: 6,
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  goalNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  litersText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  quickButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  undoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchCopy: { flex: 1, paddingRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '700' },
  settingDesc: { fontSize: 12 },
  subLabel: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1 },
  timeSeparator: { fontSize: 14, fontWeight: '600' },
  emptyLogs: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timelineLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineTime: { fontSize: 14, fontWeight: '700' },
  timelineAmount: { fontSize: 13, fontWeight: '600' },
});
