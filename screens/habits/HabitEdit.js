import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text as RNText, View, KeyboardAvoidingView } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useTheme } from '../../theme/ThemeContext';
import { CATEGORIES, GOALS } from '../../constants/categories';
import { AppHeader } from '../../components/AppHeader';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { useHabits } from '../../hooks/useHabits';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { showToast, safeConfirm } from '../../utils/feedback';

export default function HabitEdit({ navigation, route }) {
  const { habits, updateHabit, deleteHabit, refresh } = useHabits();
  const { colors, triggerDataRefresh } = useTheme();

  const habit = habits.find((item) => item.id === route.params?.habit?.id) || route.params?.habit;
  const [name, setName] = useState(habit?.name || '');
  const [category, setCategory] = useState(habit?.category || 'health');
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime || '');
  const [goal, setGoal] = useState(habit?.goal || 'daily');
  const [saving, setSaving] = useState(false);

  const [nameError, setNameError] = useState('');
  const [timeError, setTimeError] = useState('');

  const save = async () => {
    let hasError = false;
    setNameError('');
    setTimeError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Give this habit a name before saving.');
      hasError = true;
    }
    if (saving) return;

    const trimmedTime = reminderTime.trim();
    if (trimmedTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(trimmedTime)) {
        setTimeError('Please enter reminder time in HH:MM format (24-hour, e.g. 07:30 or 18:45).');
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      setSaving(true);
      await updateHabit(habit.id, { name: trimmedName, category, reminderTime: trimmedTime || null, goal });
      await refresh();
      triggerDataRefresh();
      showToast('Habit updated ✓');
      navigation.navigate('HabitsToday');
    } catch (error) {
      console.error('Update habit failed:', error);
      Alert.alert('Error', 'Failed to save habit: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    const performDelete = async () => {
      try {
        await deleteHabit(habit.id);
        await refresh();
        triggerDataRefresh();
        showToast('Habit deleted ✓');
        navigation.navigate('HabitsToday');
      } catch (error) {
        console.error('Delete habit failed:', error);
        showToast('Failed to delete habit: ' + error.message);
      }
    };
    safeConfirm('Delete habit?', 'This removes the habit and all completion history.', performDelete, 'Cancel', 'Delete');
  };

  if (!habit) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <AppHeader title="Edit habit" onBack={() => navigation.goBack()} />
        <View style={styles.form}>
          <InputField
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (nameError) setNameError('');
            }}
            placeholder="Habit name"
          />
          {nameError ? <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text> : null}

          <SectionHeader>Category</SectionHeader>
          <View style={styles.wrap}>
            {CATEGORIES.map((item) => (
              <Pill key={item.key} label={item.label} palette={item.color} selected={category === item.key} onPress={() => setCategory(item.key)} />
            ))}
          </View>
          <InputField
            value={reminderTime}
            onChangeText={(val) => {
              setReminderTime(val);
              if (timeError) setTimeError('');
            }}
            placeholder="Reminder time, e.g. 07:00"
          />
          {timeError ? <Text style={[styles.errorText, { color: colors.danger }]}>{timeError}</Text> : null}

          <SectionHeader>Goal</SectionHeader>
          <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {GOALS.map((item) => {
              const active = goal === item;
              return (
                <Text
                  key={item}
                  onPress={() => setGoal(item)}
                  style={[
                    styles.segmentText,
                    { color: colors.textSecondary },
                    active && {
                      backgroundColor: colors.surface,
                      borderRadius: RADIUS.sm,
                      color: colors.pillLearning.text,
                      ...SHADOWS.subtle,
                    },
                  ]}
                >
                  {item}
                </Text>
              );
            })}
          </View>
        </View>
        <PrimaryButton
          title={saving ? 'Saving changes...' : 'Save changes'}
          color={colors.pillLearning.text}
          onPress={save}
          disabled={saving}
        />
        <PrimaryButton
          title="Delete habit"
          color={colors.danger}
          onPress={confirmDelete}
          disabled={saving}
          style={{ marginTop: 8 }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', padding: 5 },
  segmentText: { flex: 1, fontSize: 12, fontWeight: '600', padding: 11, textAlign: 'center', textTransform: 'capitalize' },
  errorText: { fontSize: 12, fontWeight: '600', marginTop: -4, marginLeft: 4 },
});
