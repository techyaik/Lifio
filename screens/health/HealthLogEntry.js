import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { parseISO, subDays, format as formatDate } from 'date-fns';
import { Ionicons } from "../../components/LineIcon";
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { FLOW_LEVELS, ENERGY_LEVELS, HEALTH_MOODS, SYMPTOMS, useHealth } from '../../hooks/useHealth';
import { useHealthUnits } from '../../hooks/useHealthUnits';
import { displayDate, todayKey } from '../../utils/dates';
import { showToast, safeConfirm } from '../../utils/feedback';
import { RADIUS } from '../../constants/theme';
import { scheduleCycleReminderNotification } from '../../utils/cycleNotifications';

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
  const insets = useSafeAreaInsets();
  const { logs, addLog, updateLog, deleteLog, refresh } = useHealth();
  const { colors, triggerDataRefresh } = useTheme();
  const { weightUnit } = useHealthUnits();

  const isCycleOnly = route.params?.isCycleOnly === true;

  // Step states for wizards
  const [cycleStep, setCycleStep] = useState(1);
  const [generalStep, setGeneralStep] = useState(1);
  const [isCustomDate, setIsCustomDate] = useState(false);

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
    heartRate: '',
    mood: '',
    energy: '',
    symptoms: [],
    medication: '',
    notes: '',
    waterGoal: DEFAULTS.waterGoal,
    stepGoal: DEFAULTS.stepGoal,
    sleepGoal: DEFAULTS.sleepGoal,
    period: false,
    cycleEnabled: isCycleOnly,
    lastPeriodStart: route.params?.date || todayKey(),
    cycleLength: DEFAULTS.cycleLength,
    periodDuration: DEFAULTS.periodDuration,
    periodReminderDays: DEFAULTS.periodReminderDays,
    flowIntensity: 'Medium',
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
      heartRate: editing.heartRate || editing.heartRate === 0 ? String(editing.heartRate) : '',
      mood: editing.mood || '',
      energy: editing.energy || '',
      symptoms: Array.isArray(editing.symptoms) ? editing.symptoms : [],
      medication: editing.medication || '',
      notes: editing.notes || '',
      waterGoal: editing.waterGoal ? String(editing.waterGoal) : DEFAULTS.waterGoal,
      stepGoal: editing.stepGoal ? String(editing.stepGoal) : DEFAULTS.stepGoal,
      sleepGoal: editing.sleepGoal ? String(editing.sleepGoal) : DEFAULTS.sleepGoal,
      period: Boolean(editing.period),
      cycleEnabled: Boolean(editing.cycleEnabled || editing.lastPeriodStart || editing.period || isCycleOnly),
      lastPeriodStart: editing.lastPeriodStart || (editing.period ? editing.date : editing.date || todayKey()),
      cycleLength: editing.cycleLength ? String(editing.cycleLength) : DEFAULTS.cycleLength,
      periodDuration: editing.periodDuration ? String(editing.periodDuration) : DEFAULTS.periodDuration,
      periodReminderDays: editing.periodReminderDays || editing.periodReminderDays === 0 ? String(editing.periodReminderDays) : DEFAULTS.periodReminderDays,
      flowIntensity: editing.flowIntensity || 'Medium',
      cycleSymptoms: Array.isArray(editing.cycleSymptoms) ? editing.cycleSymptoms : [],
    });
  }, [editing, isCycleOnly]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSelectCycleDate = (selectedDate) => {
    setForm((current) => ({ ...current, lastPeriodStart: selectedDate }));
    setCycleStep(2);
  };

  const handleSelectCycleFlow = (flow) => {
    setForm((current) => ({ ...current, flowIntensity: flow }));
    setCycleStep(3);
  };

  const validateNumber = (key, label, options = {}) => {
    const rawVal = form[key];
    if (rawVal === null || rawVal === undefined) return true;
    const raw = String(rawVal).trim();
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

    if (!isCycleOnly) {
      if (!validateNumber('weight', 'weight', { message: 'Please enter a valid positive number for weight.' })) return;
      if (!validateNumber('sleep', 'sleep hours', { max: 24, message: 'Please enter sleep between 0 and 24 hours.' })) return;
      if (!validateNumber('steps', 'steps', { message: 'Please enter a valid positive step count.' })) return;
      if (!validateNumber('water', 'water count', { message: 'Please enter a valid positive water count.' })) return;
      if (!validateNumber('heartRate', 'heart rate', { min: 30, max: 250, message: 'Please enter a valid heart rate (30-250 BPM).' })) return;
      if (!validateNumber('waterGoal', 'water goal', { min: 1 })) return;
      if (!validateNumber('stepGoal', 'step goal', { min: 1 })) return;
      if (!validateNumber('sleepGoal', 'sleep goal', { min: 1, max: 24 })) return;
    }

    let lastPeriodStart = form.lastPeriodStart ? String(form.lastPeriodStart).trim() : '';
    if (isCycleOnly || form.cycleEnabled || form.period) {
      if (!lastPeriodStart || !isValidDate(lastPeriodStart)) {
        Alert.alert('Cycle date required', 'Please enter the last period start date in YYYY-MM-DD format.');
        return;
      }
    }

    const existingSources = editing?.sources || existingForDate?.sources || {};
    const newSources = { ...existingSources };
    if (form.weight !== '') newSources.weight = 'MANUAL';
    if (form.sleep !== '') newSources.sleep = 'MANUAL';
    if (form.steps !== '') newSources.steps = 'MANUAL';
    if (form.water !== '') newSources.water = 'MANUAL';
    if (form.heartRate !== '') newSources.heartRate = 'MANUAL';

    const payload = {
      ...editing,
      ...existingForDate,
      date: trimmedDate,
      weight: form.weight !== '' ? Number(form.weight) : (editing?.weight ?? null),
      sleep: form.sleep !== '' ? Number(form.sleep) : (editing?.sleep ?? null),
      steps: form.steps !== '' ? Number.parseInt(form.steps, 10) : (editing?.steps ?? null),
      water: form.water !== '' ? Number.parseInt(form.water, 10) : (editing?.water ?? null),
      heartRate: form.heartRate !== '' ? Number.parseInt(form.heartRate, 10) : (editing?.heartRate ?? null),
      mood: form.mood || editing?.mood || '',
      energy: form.energy || editing?.energy || '',
      symptoms: form.symptoms.length ? form.symptoms : (editing?.symptoms || []),
      medication: form.medication.trim() || editing?.medication || '',
      notes: form.notes.trim() || editing?.notes || '',
      waterGoal: Number.parseInt(form.waterGoal || DEFAULTS.waterGoal, 10),
      stepGoal: Number.parseInt(form.stepGoal || DEFAULTS.stepGoal, 10),
      sleepGoal: Number(form.sleepGoal || DEFAULTS.sleepGoal),
      period: isCycleOnly ? true : Boolean(form.period),
      cycleEnabled: isCycleOnly ? true : Boolean(form.cycleEnabled),
      lastPeriodStart,
      cycleLength: Number.parseInt(form.cycleLength || DEFAULTS.cycleLength, 10),
      periodDuration: Number.parseInt(form.periodDuration || DEFAULTS.periodDuration, 10),
      periodReminderDays: Number.parseInt(form.periodReminderDays || DEFAULTS.periodReminderDays, 10),
      flowIntensity: form.flowIntensity,
      cycleSymptoms: form.cycleSymptoms,
      sources: newSources,
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

      if (payload.cycleEnabled) {
        await scheduleCycleReminderNotification({
          lastPeriodStart,
          cycleLength: payload.cycleLength,
          periodReminderDays: payload.periodReminderDays,
        });
      }

      await refresh();
      triggerDataRefresh();
      showToast(isCycleOnly ? 'Period logged ✓' : 'Health logged ✓');
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
        showToast('Log deleted ✓');
        navigation.navigate('HealthDashboard');
      } catch (error) {
        console.error('Delete health log failed:', error);
        showToast('Failed to delete log: ' + error.message);
      }
    };
    safeConfirm('Delete log?', 'This log entry will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  const cardBorderColor = colors.border || '#CBD5E1';
  const mainPrimaryColor = isCycleOnly ? '#FF6B8B' : '#2D6A4F';

  // 1. CYCLE TRACKER DEDICATED WIZARD (3 Steps)
  if (isCycleOnly) {
    return (
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentStyle={styles.content}>
          <AppHeader
            title={editing ? 'Edit Cycle Log' : 'Log Period 🌸'}
            onBack={() => {
              if (cycleStep > 1) setCycleStep(cycleStep - 1);
              else navigation.goBack();
            }}
          />

          {/* Step Progress Bar */}
          <View style={styles.stepProgressRow}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: i === cycleStep ? '#FF6B8B' : i < cycleStep ? '#FFB6C1' : colors.surfaceTint,
                    width: i === cycleStep ? 36 : 12,
                  },
                ]}
              />
            ))}
          </View>

          {/* QUESTION 1: Period Start Date */}
          {cycleStep === 1 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
              <View style={styles.questionBox}>
                <Text style={styles.stepNumberText}>QUESTION 1 OF 3</Text>
                <Text style={styles.questionTitle}>When did your period start?</Text>
                <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                  Tap a quick date or select Custom Date.
                </Text>
              </View>

              <View style={styles.optionsGrid}>
                {[
                  { label: 'Today', subtitle: displayDate(todayKey(), 'MMM d'), date: todayKey(), icon: 'today-outline', isCustom: false },
                  { label: 'Yesterday', subtitle: displayDate(formatDate(subDays(new Date(), 1), 'yyyy-MM-dd'), 'MMM d'), date: formatDate(subDays(new Date(), 1), 'yyyy-MM-dd'), icon: 'time-outline', isCustom: false },
                  { label: '2 days ago', subtitle: displayDate(formatDate(subDays(new Date(), 2), 'yyyy-MM-dd'), 'MMM d'), date: formatDate(subDays(new Date(), 2), 'yyyy-MM-dd'), icon: 'calendar-outline', isCustom: false },
                  { label: 'Custom Date', subtitle: isCustomDate ? displayDate(form.lastPeriodStart, 'MMM d') : 'Pick custom date', date: form.lastPeriodStart, icon: 'calendar-number-outline', isCustom: true },
                ].map((item) => {
                  const isSelected = item.isCustom ? isCustomDate : (!isCustomDate && form.lastPeriodStart === item.date);
                  return (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (item.isCustom) {
                          setIsCustomDate(true);
                        } else {
                          setIsCustomDate(false);
                          handleSelectCycleDate(item.date);
                        }
                      }}
                      style={[
                        styles.bigOptionCard,
                        {
                          backgroundColor: isSelected ? 'rgba(255, 107, 139, 0.15)' : colors.surface,
                          borderColor: isSelected ? '#FF6B8B' : cardBorderColor,
                        },
                      ]}
                    >
                      <View style={[styles.optionIconCircle, { backgroundColor: isSelected ? '#FF6B8B' : 'rgba(255, 107, 139, 0.12)' }]}>
                        <Ionicons name={item.icon} size={22} color={isSelected ? '#FFFFFF' : '#FF6B8B'} />
                      </View>
                      <Text style={[styles.bigOptionTitle, { color: isSelected ? '#D81B60' : colors.textPrimary }]}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.subtitle}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isCustomDate && (
                <View style={styles.customDateBox}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Enter Custom Start Date (YYYY-MM-DD)</Text>
                  <InputField
                    value={form.lastPeriodStart}
                    onChangeText={(v) => setValue('lastPeriodStart', v)}
                    placeholder="YYYY-MM-DD"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (!isValidDate(form.lastPeriodStart.trim())) {
                        Alert.alert('Invalid date', 'Please enter a valid date in YYYY-MM-DD format.');
                        return;
                      }
                      setCycleStep(2);
                    }}
                    style={styles.confirmCustomButton}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Confirm Date & Continue ➔</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* QUESTION 2: Flow Intensity */}
          {cycleStep === 2 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
              <View style={styles.questionBox}>
                <Text style={styles.stepNumberText}>QUESTION 2 OF 3</Text>
                <Text style={styles.questionTitle}>How is your flow today?</Text>
                <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                  Tap your flow level to continue.
                </Text>
              </View>

              <View style={styles.verticalOptionList}>
                {[
                  { label: 'Spotting 💧', val: 'Spotting', desc: 'Very light droplets' },
                  { label: 'Light 🌸', val: 'Light', desc: 'Light period flow' },
                  { label: 'Medium 🌺', val: 'Medium', desc: 'Normal moderate flow' },
                  { label: 'Heavy 🌹', val: 'Heavy', desc: 'Heavy period flow' },
                ].map((item) => {
                  const isSelected = form.flowIntensity === item.val;
                  return (
                    <TouchableOpacity
                      key={item.val}
                      activeOpacity={0.7}
                      onPress={() => handleSelectCycleFlow(item.val)}
                      style={[
                        styles.flowOptionCard,
                        {
                          backgroundColor: isSelected ? 'rgba(255, 107, 139, 0.15)' : colors.surface,
                          borderColor: isSelected ? '#FF6B8B' : cardBorderColor,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#D81B60' : colors.textPrimary }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.desc}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                        size={24}
                        color={isSelected ? '#FF6B8B' : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* QUESTION 3: Symptoms & Save */}
          {cycleStep === 3 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
              <View style={styles.questionBox}>
                <Text style={styles.stepNumberText}>QUESTION 3 OF 3</Text>
                <Text style={styles.questionTitle}>How are you feeling today?</Text>
                <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                  Tap any symptoms you have today, then save your log.
                </Text>
              </View>

              <View style={styles.symptomsGrid}>
                {[
                  { name: 'Cramps', emoji: '⚡' },
                  { name: 'Acne', emoji: '✨' },
                  { name: 'Headache', emoji: '🤕' },
                  { name: 'Mood swings', emoji: '🌪️' },
                  { name: 'Tired', emoji: '😴' },
                  { name: 'Bloated', emoji: '💧' },
                ].map((item) => {
                  const isSelected = form.cycleSymptoms.includes(item.name);
                  return (
                    <TouchableOpacity
                      key={item.name}
                      activeOpacity={0.8}
                      onPress={() => setValue('cycleSymptoms', toggleInList(form.cycleSymptoms, item.name))}
                      style={[
                        styles.symptomChip,
                        {
                          backgroundColor: isSelected ? 'rgba(255, 107, 139, 0.15)' : colors.surface,
                          borderColor: isSelected ? '#FF6B8B' : cardBorderColor,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#D81B60' : colors.textPrimary,
                        }}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {editing && (
                <TouchableOpacity activeOpacity={0.8} onPress={confirmDelete} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>Delete this log</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Persistent High-Contrast Footer Buttons */}
          <View style={styles.navFooter}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (cycleStep > 1) setCycleStep(cycleStep - 1);
                else navigation.goBack();
              }}
              style={[styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: '#94A3B8' }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              <Text style={[styles.navButtonTextSecondary, { color: colors.textPrimary }]}>
                {cycleStep === 1 ? 'Cancel' : 'Back'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (cycleStep < 3) setCycleStep(cycleStep + 1);
                else save();
              }}
              disabled={saving}
              style={[styles.navButtonPrimary, { backgroundColor: '#FF6B8B' }]}
            >
              <Text style={styles.navButtonTextPrimary}>
                {saving ? 'Saving...' : cycleStep === 3 ? 'Save Period Log ✓' : 'Next Step'}
              </Text>
              {cycleStep < 3 && <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  // 2. GENERAL HEALTH LOG INTERACTIVE STEP-BY-STEP WIZARD (4 Steps)
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <AppHeader
          title={editing ? 'Edit Health Log' : 'Log Health 📊'}
          onBack={() => {
            if (generalStep > 1) setGeneralStep(generalStep - 1);
            else navigation.goBack();
          }}
        />

        {/* Step Progress Bar */}
        <View style={styles.stepProgressRow}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                {
                  backgroundColor: i === generalStep ? '#2D6A4F' : i < generalStep ? '#86EFAC' : colors.surfaceTint,
                  width: i === generalStep ? 36 : 12,
                },
              ]}
            />
          ))}
        </View>

        {/* QUESTION 1: Date & Primary Vitals */}
        {generalStep === 1 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
            <View style={styles.questionBox}>
              <Text style={[styles.stepNumberText, { color: '#2D6A4F' }]}>QUESTION 1 OF 4</Text>
              <Text style={styles.questionTitle}>Date & Body Vitals</Text>
              <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                Enter your date, weight, and sleep hours for today.
              </Text>
            </View>

            <View style={{ gap: 14, marginTop: 4 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Log Date</Text>
                <InputField value={form.date} onChangeText={(v) => setValue('date', v)} placeholder="YYYY-MM-DD" />
              </View>

              <View style={styles.twoCol}>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight ({weightUnit})</Text>
                  <InputField value={form.weight} onChangeText={(v) => setValue('weight', v)} placeholder="e.g. 68" keyboardType="decimal-pad" />
                </View>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sleep (Hours)</Text>
                  <InputField value={form.sleep} onChangeText={(v) => setValue('sleep', v)} placeholder="e.g. 7.5" keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* QUESTION 2: Activity & Hydration */}
        {generalStep === 2 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
            <View style={styles.questionBox}>
              <Text style={[styles.stepNumberText, { color: '#2D6A4F' }]}>QUESTION 2 OF 4</Text>
              <Text style={styles.questionTitle}>Steps & Hydration</Text>
              <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                Enter your activity, water, and heart rate.
              </Text>
            </View>

            <View style={{ gap: 14, marginTop: 4 }}>
              <View style={styles.twoCol}>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Steps</Text>
                  <InputField value={form.steps} onChangeText={(v) => setValue('steps', v)} placeholder="e.g. 8000" keyboardType="number-pad" />
                </View>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Water (Glasses)</Text>
                  <InputField value={form.water} onChangeText={(v) => setValue('water', v)} placeholder="e.g. 6" keyboardType="number-pad" />
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Heart Rate (BPM)</Text>
                <InputField value={form.heartRate} onChangeText={(v) => setValue('heartRate', v)} placeholder="e.g. 72" keyboardType="number-pad" />
              </View>
            </View>
          </View>
        )}

        {/* QUESTION 3: Mood & Energy */}
        {generalStep === 3 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
            <View style={styles.questionBox}>
              <Text style={[styles.stepNumberText, { color: '#2D6A4F' }]}>QUESTION 3 OF 4</Text>
              <Text style={styles.questionTitle}>Mood & Symptoms</Text>
              <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                Tap how you feel today and any symptoms.
              </Text>
            </View>

            <View style={{ gap: 16, marginTop: 4 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>Mood</Text>
                <View style={styles.pillWrap}>
                  {HEALTH_MOODS.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      selected={form.mood === item}
                      onPress={() => setValue('mood', form.mood === item ? '' : item)}
                      palette={colors.pillLearning}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>Energy Level</Text>
                <View style={styles.pillWrap}>
                  {ENERGY_LEVELS.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      selected={form.energy === item}
                      onPress={() => setValue('energy', form.energy === item ? '' : item)}
                      palette={colors.pillHealth}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>Symptoms Today</Text>
                <View style={styles.pillWrap}>
                  {SYMPTOMS.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      selected={form.symptoms.includes(item)}
                      onPress={() => setValue('symptoms', toggleInList(form.symptoms, item))}
                      palette={colors.pillFitness}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* QUESTION 4: Goals, Notes & Save */}
        {generalStep === 4 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
            <View style={styles.questionBox}>
              <Text style={[styles.stepNumberText, { color: '#2D6A4F' }]}>QUESTION 4 OF 4</Text>
              <Text style={styles.questionTitle}>Daily Goals & Notes</Text>
              <Text style={[styles.questionSub, { color: colors.textSecondary }]}>
                Confirm target goals and add notes.
              </Text>
            </View>

            <View style={{ gap: 14, marginTop: 4 }}>
              <View style={styles.threeCol}>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Water Goal</Text>
                  <InputField value={form.waterGoal} onChangeText={(v) => setValue('waterGoal', v)} placeholder="8" keyboardType="number-pad" />
                </View>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Step Goal</Text>
                  <InputField value={form.stepGoal} onChangeText={(v) => setValue('stepGoal', v)} placeholder="10000" keyboardType="number-pad" />
                </View>
                <View style={styles.inputFlex}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sleep Goal</Text>
                  <InputField value={form.sleepGoal} onChangeText={(v) => setValue('sleepGoal', v)} placeholder="8" keyboardType="decimal-pad" />
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Medication / Notes</Text>
                <InputField value={form.notes} onChangeText={(v) => setValue('notes', v)} placeholder="Anything else about today..." multiline />
              </View>
            </View>
          </View>
        )}

        {/* Persistent High-Contrast General Footer Buttons */}
        <View style={styles.navFooter}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (generalStep > 1) setGeneralStep(generalStep - 1);
              else navigation.goBack();
            }}
            style={[styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: '#94A3B8' }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            <Text style={[styles.navButtonTextSecondary, { color: colors.textPrimary }]}>
              {generalStep === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (generalStep < 4) setGeneralStep(generalStep + 1);
              else save();
            }}
            disabled={saving}
            style={[styles.navButtonPrimary, { backgroundColor: '#2D6A4F' }]}
          >
            <Text style={styles.navButtonTextPrimary}>
              {saving ? 'Saving...' : generalStep === 4 ? 'Save Health Log ✓' : 'Next Step'}
            </Text>
            {generalStep < 4 && <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {editing && (
          <TouchableOpacity activeOpacity={0.8} onPress={confirmDelete} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>Delete this log</Text>
          </TouchableOpacity>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 16 },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 18,
    gap: 16,
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
  questionBox: {
    gap: 4,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B8B',
    letterSpacing: 0.8,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  questionSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  bigOptionCard: {
    width: '48%',
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 6,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  customDateBox: {
    marginTop: 10,
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 107, 139, 0.08)',
    borderWidth: 1,
    borderColor: '#FF6B8B',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  confirmCustomButton: {
    backgroundColor: '#FF6B8B',
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  verticalOptionList: {
    gap: 10,
  },
  flowOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  symptomChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  bigSaveButton: {
    backgroundColor: '#FF6B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: RADIUS.md,
    marginTop: 12,
  },
  bigSaveText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 4,
  },
  navButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
  },
});
