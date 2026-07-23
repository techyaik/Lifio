import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import {
  MEDICINE_DAYS,
  MEDICINE_REPEAT_OPTIONS,
  getReminderScheduleLabel,
  isReminderScheduledForDate,
  useMedicineReminders,
} from '../../hooks/useMedicineReminders';
import { todayKey } from '../../utils/dates';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { showToast } from '../../utils/feedback';

const emptyForm = {
  id: null,
  name: '',
  dosage: '',
  time: '',
  repeatType: 'daily',
  days: [],
  enabled: true,
};

export default function MedicineReminders({ navigation }) {
  const { colors } = useTheme();
  const { reminders, loading, addReminder, updateReminder, deleteReminder, markTaken, isTakenToday, getUpcomingReminders } = useMedicineReminders();

  const [editorVisible, setEditorVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const upcoming = useMemo(() => getUpcomingReminders(), [getUpcomingReminders]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditorVisible(true);
  };

  const openEdit = (reminder) => {
    setForm({
      id: reminder.id,
      name: reminder.name,
      dosage: reminder.dosage || '',
      time: reminder.time,
      repeatType: reminder.repeatType || 'daily',
      days: reminder.days || [],
      enabled: reminder.enabled !== false,
    });
    setEditorVisible(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorVisible(false);
    setForm(emptyForm);
  };

  const saveReminder = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await updateReminder(form.id, form);
        showToast('Medicine reminder updated ✓');
      } else {
        await addReminder(form);
        showToast('Medicine reminder added ✓');
      }
      closeEditor();
    } catch (error) {
      showToast(error.message || 'Could not save reminder.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (reminder) => {
    Alert.alert('Delete reminder?', `Remove reminder for ${reminder.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(reminder.id);
            showToast('Medicine reminder deleted ✓');
          } catch (error) {
            showToast(error.message || 'Could not delete reminder.');
          }
        },
      },
    ]);
  };

  const handleTaken = async (reminder) => {
    try {
      await markTaken(reminder.id);
      showToast(`${reminder.name} marked as taken ✓`);
    } catch (error) {
      showToast(error.message || 'Could not update reminder.');
    }
  };

  return (
    <View style={styles.container}>
      <Screen loading={loading}>
        <AppHeader title="Medicine reminders" onBack={() => navigation.goBack()} rightIcon="add" onRight={openCreate} accent={colors.health} />

        <View style={styles.section}>
          <SectionHeader>Upcoming</SectionHeader>
          {upcoming.length ? (
            upcoming.map((reminder) => {
              const scheduledToday = isReminderScheduledForDate(reminder, todayKey());
              const takenToday = isTakenToday(reminder);
              return (
                <View
                  key={reminder.id}
                  style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.flexOne}>
                      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {reminder.name}
                      </Text>
                      <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={2}>
                        {[reminder.dosage || 'Dosage optional', getReminderScheduleLabel(reminder)].join(' • ')}
                      </Text>
                    </View>
                    <View style={[styles.timeChip, { backgroundColor: colors.accentLight.health }]}>
                      <Text style={[styles.timeChipText, { color: colors.health }]}>{reminder.time}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.nextLabel, { color: colors.textHint }]} numberOfLines={1}>
                      {reminder.nextOccurrence?.label || 'Upcoming'}
                    </Text>
                    <View style={styles.actionRow}>
                      {scheduledToday ? (
                        <Pressable
                          onPress={() => handleTaken(reminder)}
                          disabled={takenToday}
                          style={[
                            styles.actionChip,
                            {
                              backgroundColor: takenToday ? colors.accentLight.health : colors.surface,
                              borderColor: takenToday ? colors.health : colors.borderLight,
                              opacity: takenToday ? 0.88 : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name={takenToday ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={14}
                            color={takenToday ? colors.health : colors.textSecondary}
                          />
                          <Text style={[styles.actionText, { color: takenToday ? colors.health : colors.textPrimary }]}>
                            {takenToday ? 'Taken' : 'Mark taken'}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => openEdit(reminder)} hitSlop={8}>
                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => confirmDelete(reminder)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState
              icon="medkit-outline"
              message="No medicine reminders yet."
              actionLabel="+ Add reminder"
              action={openCreate}
              accent={colors.health}
            />
          )}
        </View>

        {reminders.length ? (
          <View style={styles.section}>
            <SectionHeader>All reminders</SectionHeader>
            {reminders.map((reminder) => (
              <View key={reminder.id} style={[styles.miniRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.flexOne}>
                  <Text style={[styles.miniTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {reminder.name}
                  </Text>
                  <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={1}>
                    {getReminderScheduleLabel(reminder)}
                  </Text>
                </View>
                <Switch
                  value={reminder.enabled !== false}
                  onValueChange={(value) => updateReminder(reminder.id, { enabled: value })}
                  trackColor={{ false: colors.border, true: colors.health }}
                  thumbColor={colors.onAccent}
                />
              </View>
            ))}
          </View>
        ) : null}
      </Screen>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={closeEditor}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} />
          <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {form.id ? 'Edit reminder' : 'Add medicine reminder'}
              </Text>
              <Pressable onPress={closeEditor} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <InputField
                value={form.name}
                onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Medicine name"
              />
              <InputField
                value={form.dosage}
                onChangeText={(value) => setForm((current) => ({ ...current, dosage: value }))}
                placeholder="Dosage details (optional)"
              />
              <InputField
                value={form.time}
                onChangeText={(value) => setForm((current) => ({ ...current, time: value }))}
                placeholder="Reminder time (HH:MM)"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.group}>
                <SectionHeader>Repeat</SectionHeader>
                <View style={styles.pillRow}>
                  {MEDICINE_REPEAT_OPTIONS.map((option) => (
                    <Pill
                      key={option.key}
                      label={option.label}
                      selected={form.repeatType === option.key}
                      onPress={() => setForm((current) => ({ ...current, repeatType: option.key, days: option.key === 'daily' ? [] : current.days }))}
                      palette={colors.pillLearning}
                    />
                  ))}
                </View>
              </View>

              {form.repeatType === 'selected' ? (
                <View style={styles.group}>
                  <SectionHeader>Days</SectionHeader>
                  <View style={styles.pillRow}>
                    {MEDICINE_DAYS.map((day) => {
                      const selected = form.days.includes(day.key);
                      return (
                        <Pill
                          key={day.key}
                          label={day.short}
                          selected={selected}
                          onPress={() =>
                            setForm((current) => ({
                              ...current,
                              days: selected
                                ? current.days.filter((value) => value !== day.key)
                                : [...current.days, day.key].sort((a, b) => a - b),
                            }))
                          }
                          palette={colors.pillHealth}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={[styles.toggleRow, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                <View style={styles.flexOne}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Reminder active</Text>
                  <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>Keep it in your upcoming list</Text>
                </View>
                <Switch
                  value={form.enabled}
                  onValueChange={(value) => setForm((current) => ({ ...current, enabled: value }))}
                  trackColor={{ false: colors.border, true: colors.health }}
                  thumbColor={colors.onAccent}
                />
              </View>

              <PrimaryButton title={form.id ? 'Save changes' : 'Add reminder'} color={colors.health} onPress={saveReminder} disabled={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { gap: 10 },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    ...SHADOWS.subtle,
  },
  cardTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  flexOne: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  subtext: { fontSize: 12, lineHeight: 17 },
  timeChip: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timeChipText: { fontSize: 12, fontWeight: '800' },
  cardBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  nextLabel: { flex: 1, fontSize: 11, fontWeight: '600' },
  actionRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  actionChip: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  actionText: { fontSize: 11, fontWeight: '700' },
  miniRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  miniTitle: { fontSize: 14, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    maxHeight: '86%',
    padding: 18,
    ...SHADOWS.soft,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { gap: 12 },
  group: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleRow: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleSubtext: { fontSize: 11, marginTop: 2 },
});
