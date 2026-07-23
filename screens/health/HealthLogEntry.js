import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { FLOW_LEVELS, ENERGY_LEVELS, HEALTH_MOODS, SYMPTOMS, useHealth } from '../../hooks/useHealth';
import { useHealthUnits } from '../../hooks/useHealthUnits';
import { displayDate, todayKey } from '../../utils/dates';
import { showToast, safeConfirm } from '../../utils/feedback';
import { RADIUS, SHADOWS } from '../../constants/theme';

const DEFAULTS = {
  waterGoal: '8',
  stepGoal: '10000',
  sleepGoal: '8',
  cycleLength: '28',
  periodDuration: '5',
  periodReminderDays: '2',
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime()) && displayDate(value) !== 'Invalid date';
};

const toggleInList = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export default function HealthLogEntry({ navigation, route }) {
  const { logs, addLog, updateLog, deleteLog, refresh } = useHealth();
  const { colors, triggerDataRefresh } = useTheme();
  const { weightUnit } = useHealthUnits();

  const editing = useMemo(
    () => logs.find((log) => log.id === route.params?.entryId) || route.params?.entry,
    [logs, route.params?.entry, route.params?.entryId]
  );

  const [form, setForm] = useState({
    date: route.params?.date || todayKey(),
    weight: '',
    sleep: '',
    steps: '',
    water: '',
    mood: '',
    energy: '',
    symptoms: [],
    medication: '',
    notes: '',
    waterGoal: DEFAULTS.waterGoal,
    stepGoal: DEFAULTS.stepGoal,
    sleepGoal: DEFAULTS.sleepGoal,
    period: false,
    cycleEnabled: false,
    lastPeriodStart: '',
    cycleLength: DEFAULTS.cycleLength,
    periodDuration: DEFAULTS.periodDuration,
    periodReminderDays: DEFAULTS.periodReminderDays,
    flowIntensity: '',
    cycleSymptoms: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setForm({
      date: editing.date || todayKey(),
      weight: editing.weight || editing.weight === 0 ? String(editing.weight) : '',
      sleep: editing.sleep || editing.sleep === 0 ? String(editing.sleep) : '',
      steps: editing.steps || editing.steps === 0 ? String(editing.steps) : '',
      water: editing.water || editing.water === 0 ? String(editing.water) : '',
      mood: editing.mood || '',
      energy: editing.energy || '',
      symptoms: Array.isArray(editing.symptoms) ? editing.symptoms : [],
      medication: editing.medication || '',
      notes: editing.notes || '',
      waterGoal: editing.waterGoal ? String(editing.waterGoal) : DEFAULTS.waterGoal,
      stepGoal: editing.stepGoal ? String(editing.stepGoal) : DEFAULTS.stepGoal,
      sleepGoal: editing.sleepGoal ? String(editing.sleepGoal) : DEFAULTS.sleepGoal,
      period: Boolean(editing.period),
      cycleEnabled: Boolean(editing.cycleEnabled || editing.lastPeriodStart || editing.period),
      lastPeriodStart: editing.lastPeriodStart || (editing.period ? editing.date : ''),
      cycleLength: editing.cycleLength ? String(editing.cycleLength) : DEFAULTS.cycleLength,
      periodDuration: editing.periodDuration ? String(editing.periodDuration) : DEFAULTS.periodDuration,
      periodReminderDays: editing.periodReminderDays || editing.periodReminderDays === 0 ? String(editing.periodReminderDays) : DEFAULTS.periodReminderDays,
      flowIntensity: editing.flowIntensity || '',
      cycleSymptoms: Array.isArray(editing.cycleSymptoms) ? editing.cycleSymptoms : [],
    });
  }, [editing]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validateNumber = (key, label, options = {}) => {
    const raw = String(form[key]).trim();
    if (!raw) return true;
    const value = Number(raw);
    if (Number.isNaN(value) || value < (options.min ?? 0) || (options.max !== undefined && value > options.max)) {
      Alert.alert(`Invalid ${label}`, options.message || `Please enter a valid ${label}.`);
      return false;
    }
    return true;
  };

  const save = async () => {
    if (saving) return;

    const trimmedDate = form.date.trim();
    const existingForDate = logs.find((log) => log.date === trimmedDate && log.id !== editing?.id);
    if (!isValidDate(trimmedDate)) {
      Alert.alert('Invalid date', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    const hasMetric =
      ['weight', 'sleep', 'steps', 'water', 'mood', 'energy', 'medication', 'notes'].some((key) => String(form[key]).trim()) ||
      form.symptoms.length > 0 ||
      form.period ||
      form.cycleEnabled;

    if (!hasMetric) {
      Alert.alert('Add at least one detail', 'Fill one field before saving this health log.');
      return;
    }

    if (!validateNumber('weight', 'weight', { message: 'Please enter a valid positive number for weight.' })) return;
    if (!validateNumber('sleep', 'sleep hours', { max: 24, message: 'Please enter sleep between 0 and 24 hours.' })) return;
    if (!validateNumber('steps', 'steps', { message: 'Please enter a valid positive step count.' })) return;
    if (!validateNumber('water', 'water count', { message: 'Please enter a valid positive water count.' })) return;
    if (!validateNumber('waterGoal', 'water goal', { min: 1 })) return;
    if (!validateNumber('stepGoal', 'step goal', { min: 1 })) return;
    if (!validateNumber('sleepGoal', 'sleep goal', { min: 1, max: 24 })) return;

    let lastPeriodStart = form.lastPeriodStart.trim();
    if (form.period && !lastPeriodStart) lastPeriodStart = trimmedDate;

    if (form.cycleEnabled || form.period || lastPeriodStart) {
      if (!lastPeriodStart || !isValidDate(lastPeriodStart)) {
        Alert.alert('Cycle date required', 'Please enter the last period start date in YYYY-MM-DD format.');
        return;
      }
      if (!validateNumber('cycleLength', 'cycle length', { min: 15, max: 60 })) return;
      if (!validateNumber('periodDuration', 'period duration', { min: 1, max: 14 })) return;
      if (!validateNumber('periodReminderDays', 'reminder days', { min: 0, max: 14 })) return;
    }

    const payload = {
      date: trimmedDate,
      weight: form.weight ? Number(form.weight) : null,
      sleep: form.sleep ? Number(form.sleep) : null,
      steps: form.steps ? Number.parseInt(form.steps, 10) : null,
      water: form.water ? Number.parseInt(form.water, 10) : null,
      mood: form.mood,
      energy: form.energy,
      symptoms: form.symptoms,
      medication: form.medication.trim(),
      notes: form.notes.trim(),
      waterGoal: Number.parseInt(form.waterGoal || DEFAULTS.waterGoal, 10),
      stepGoal: Number.parseInt(form.stepGoal || DEFAULTS.stepGoal, 10),
      sleepGoal: Number(form.sleepGoal || DEFAULTS.sleepGoal),
      period: form.period,
      cycleEnabled: form.cycleEnabled || form.period,
      lastPeriodStart,
      cycleLength: Number.parseInt(form.cycleLength || DEFAULTS.cycleLength, 10),
      periodDuration: Number.parseInt(form.periodDuration || DEFAULTS.periodDuration, 10),
      periodReminderDays: Number.parseInt(form.periodReminderDays || DEFAULTS.periodReminderDays, 10),
      flowIntensity: form.flowIntensity,
      cycleSymptoms: form.cycleSymptoms,
    };

    try {
      setSaving(true);
      if (editing) {
        await updateLog(editing.id, { ...payload, updatedAt: new Date().toISOString() });
      } else if (existingForDate) {
        await updateLog(existingForDate.id, {
          ...existingForDate,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addLog({
          id: Date.now().toString(),
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await refresh();
      triggerDataRefresh();
      showToast('Health logged ✓');
      navigation.navigate('HealthDashboard');
    } catch (error) {
      console.error('Failed to save health log:', error);
      Alert.alert('Could not save log', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    const performDelete = async () => {
      try {
        await deleteLog(editing.id);
        await refresh();
        triggerDataRefresh();
        showToast('Health log deleted ✓');
        navigation.navigate('HealthDashboard');
      } catch (error) {
        console.error('Delete health log failed:', error);
        showToast('Failed to delete log: ' + error.message);
      }
    };
    safeConfirm('Delete log?', 'This health log will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <AppHeader title={editing ? 'Edit health' : 'Log health'} onBack={() => navigation.goBack()} />

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <SectionHeader>Daily overview</SectionHeader>
          <InputField value={form.date} onChangeText={(v) => setValue('date', v)} placeholder="Date (YYYY-MM-DD)" />
          <View style={styles.twoCol}>
            <InputField style={styles.inputFlex} value={form.weight} onChangeText={(v) => setValue('weight', v)} placeholder={`Weight (${weightUnit})`} keyboardType="decimal-pad" />
            <InputField style={styles.inputFlex} value={form.sleep} onChangeText={(v) => setValue('sleep', v)} placeholder="Sleep (hours)" keyboardType="decimal-pad" />
          </View>
          <View style={styles.twoCol}>
            <InputField style={styles.inputFlex} value={form.steps} onChangeText={(v) => setValue('steps', v)} placeholder="Steps" keyboardType="number-pad" />
            <InputField style={styles.inputFlex} value={form.water} onChangeText={(v) => setValue('water', v)} placeholder="Water (glasses)" keyboardType="number-pad" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <SectionHeader>Mood and body</SectionHeader>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mood</Text>
          <View style={styles.pillWrap}>
            {HEALTH_MOODS.map((item) => (
              <Pill key={item} label={item} selected={form.mood === item} onPress={() => setValue('mood', form.mood === item ? '' : item)} palette={colors.pillLearning} />
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Energy</Text>
          <View style={styles.pillWrap}>
            {ENERGY_LEVELS.map((item) => (
              <Pill key={item} label={item} selected={form.energy === item} onPress={() => setValue('energy', form.energy === item ? '' : item)} palette={colors.pillHealth} />
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Symptoms</Text>
          <View style={styles.pillWrap}>
            {SYMPTOMS.map((item) => (
              <Pill key={item} label={item} selected={form.symptoms.includes(item)} onPress={() => setValue('symptoms', toggleInList(form.symptoms, item))} palette={colors.pillFitness} />
            ))}
          </View>
          <InputField value={form.medication} onChangeText={(v) => setValue('medication', v)} placeholder="Medication or supplement reminder" />
        </View>

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <SectionHeader>Health goals</SectionHeader>
          <View style={styles.threeCol}>
            <InputField style={styles.inputFlex} value={form.waterGoal} onChangeText={(v) => setValue('waterGoal', v)} placeholder="Water goal" keyboardType="number-pad" />
            <InputField style={styles.inputFlex} value={form.stepGoal} onChangeText={(v) => setValue('stepGoal', v)} placeholder="Step goal" keyboardType="number-pad" />
            <InputField style={styles.inputFlex} value={form.sleepGoal} onChangeText={(v) => setValue('sleepGoal', v)} placeholder="Sleep goal" keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <SectionHeader>Cycle reminder</SectionHeader>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>Stored locally with your health logs.</Text>
            </View>
            <Switch
              value={form.cycleEnabled}
              onValueChange={(v) => setValue('cycleEnabled', v)}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          {form.cycleEnabled ? (
            <View style={styles.cycleFields}>
              <InputField value={form.lastPeriodStart} onChangeText={(v) => setValue('lastPeriodStart', v)} placeholder="Last period start (YYYY-MM-DD)" />
              <View style={styles.threeCol}>
                <InputField style={styles.inputFlex} value={form.cycleLength} onChangeText={(v) => setValue('cycleLength', v)} placeholder="Cycle days" keyboardType="number-pad" />
                <InputField style={styles.inputFlex} value={form.periodDuration} onChangeText={(v) => setValue('periodDuration', v)} placeholder="Period days" keyboardType="number-pad" />
                <InputField style={styles.inputFlex} value={form.periodReminderDays} onChangeText={(v) => setValue('periodReminderDays', v)} placeholder="Remind days" keyboardType="number-pad" />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Period started today</Text>
                <Switch
                  value={form.period}
                  onValueChange={(v) => {
                    setForm((current) => ({
                      ...current,
                      period: v,
                      lastPeriodStart: v && !current.lastPeriodStart ? current.date : current.lastPeriodStart,
                    }));
                  }}
                  trackColor={{ false: colors.border, true: colors.health }}
                  thumbColor={colors.white}
                />
              </View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Flow intensity</Text>
              <View style={styles.pillWrap}>
                {FLOW_LEVELS.map((item) => (
                  <Pill key={item} label={item} selected={form.flowIntensity === item} onPress={() => setValue('flowIntensity', form.flowIntensity === item ? '' : item)} palette={colors.pillMindful} />
                ))}
              </View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Cycle symptoms</Text>
              <View style={styles.pillWrap}>
                {['Cramps', 'Acne', 'Headache', 'Mood changes', 'Fatigue'].map((item) => (
                  <Pill key={item} label={item} selected={form.cycleSymptoms.includes(item)} onPress={() => setValue('cycleSymptoms', toggleInList(form.cycleSymptoms, item))} palette={colors.pillFitness} />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <SectionHeader>Notes</SectionHeader>
          <InputField value={form.notes} onChangeText={(v) => setValue('notes', v)} placeholder="Anything else about today..." multiline />
        </View>

        <PrimaryButton
          title={saving ? (editing ? 'Updating log...' : 'Saving log...') : 'Save log'}
          color={colors.health}
          onPress={save}
          disabled={saving}
          icon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />}
        />
        {editing ? (
          <View style={styles.deleteWrap}>
            <PrimaryButton
              title="Delete log"
              color={colors.danger}
              onPress={confirmDelete}
              disabled={saving}
              icon={<Ionicons name="trash-outline" size={18} color={colors.white} />}
            />
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    ...SHADOWS.subtle,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  threeCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputFlex: { flex: 1, minWidth: 82 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  switchCopy: { flex: 1, gap: 4 },
  switchLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  helpText: { fontSize: 12, lineHeight: 17 },
  cycleFields: { gap: 10 },
  deleteWrap: { marginTop: -8 },
});
