import { useMemo } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { useStoredList } from './useStoredList';
import { todayKey } from '../utils/dates';
import { useTheme } from '../theme/ThemeContext';

const KEY = 'health_medicine_reminders';

export const MEDICINE_REPEAT_OPTIONS = [
  { key: 'daily', label: 'Daily' },
  { key: 'selected', label: 'Selected days' },
];

export const MEDICINE_DAYS = [
  { key: 0, short: 'S', label: 'Sun' },
  { key: 1, short: 'M', label: 'Mon' },
  { key: 2, short: 'T', label: 'Tue' },
  { key: 3, short: 'W', label: 'Wed' },
  { key: 4, short: 'T', label: 'Thu' },
  { key: 5, short: 'F', label: 'Fri' },
  { key: 6, short: 'S', label: 'Sat' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeReminder = (reminder, existingReminder = null) => {
  const name = String(reminder?.name || '').trim().replace(/\s+/g, ' ');
  const dosage = String(reminder?.dosage || '').trim().replace(/\s+/g, ' ');
  const time = String(reminder?.time || '').trim();
  const repeatType = reminder?.repeatType === 'selected' ? 'selected' : 'daily';
  const days = Array.isArray(reminder?.days)
    ? [...new Set(reminder.days.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [];

  if (!name) {
    throw new Error('Medicine name is required.');
  }

  if (!TIME_PATTERN.test(time)) {
    throw new Error('Reminder time must be in HH:MM format.');
  }

  if (repeatType === 'selected' && !days.length) {
    throw new Error('Choose at least one repeat day.');
  }

  return {
    id: reminder?.id || existingReminder?.id || Date.now().toString(),
    name,
    dosage,
    time,
    repeatType,
    days,
    enabled: reminder?.enabled !== false,
    takenDates: Array.isArray(existingReminder?.takenDates) ? existingReminder.takenDates : Array.isArray(reminder?.takenDates) ? reminder.takenDates : [],
    createdAt: existingReminder?.createdAt || reminder?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const isReminderScheduledForDate = (reminder, dateKey) => {
  try {
    const weekday = parseISO(dateKey).getDay();
    if (reminder.repeatType !== 'selected') return true;
    return reminder.days?.includes(weekday);
  } catch (error) {
    return reminder.repeatType !== 'selected';
  }
};

export const isReminderTakenOnDate = (reminder, dateKey = todayKey()) =>
  Array.isArray(reminder?.takenDates) && reminder.takenDates.includes(dateKey);

export const getReminderScheduleLabel = (reminder) => {
  if (reminder.repeatType !== 'selected') {
    return `Daily • ${reminder.time}`;
  }

  const labels = MEDICINE_DAYS.filter((day) => reminder.days?.includes(day.key)).map((day) => day.label);
  return `${labels.join(', ')} • ${reminder.time}`;
};

export const getReminderNextOccurrence = (reminder, startDateKey = todayKey()) => {
  for (let offset = 0; offset < 21; offset += 1) {
    const date = format(addDays(parseISO(startDateKey), offset), 'yyyy-MM-dd');
    if (isReminderScheduledForDate(reminder, date)) {
      return {
        date,
        time: reminder.time,
        taken: isReminderTakenOnDate(reminder, date),
        label: offset === 0 ? `Today • ${reminder.time}` : `${format(parseISO(date), 'EEE, MMM d')} • ${reminder.time}`,
      };
    }
  }

  return {
    date: startDateKey,
    time: reminder.time,
    taken: false,
    label: reminder.time,
  };
};

export function useMedicineReminders() {
  const { items, loading, saveAll, refresh } = useStoredList(KEY);
  const { triggerDataRefresh } = useTheme();

  const reminders = useMemo(() => {
    return [...items].sort((a, b) => {
      const aNext = getReminderNextOccurrence(a);
      const bNext = getReminderNextOccurrence(b);
      const aRank = `${a.enabled === false ? '1' : '0'}${aNext.date}${aNext.time}`;
      const bRank = `${b.enabled === false ? '1' : '0'}${bNext.date}${bNext.time}`;
      return aRank.localeCompare(bRank) || a.name.localeCompare(b.name);
    });
  }, [items]);

  const addReminder = async (reminder) => {
    const nextReminder = normalizeReminder(reminder);
    await saveAll((current) => [...current, nextReminder]);
    triggerDataRefresh();
    return nextReminder;
  };

  const updateReminder = async (id, updates) => {
    await saveAll((current) =>
      current.map((reminder) => (reminder.id === id ? normalizeReminder({ ...reminder, ...updates }, reminder) : reminder))
    );
    triggerDataRefresh();
  };

  const deleteReminder = async (id) => {
    await saveAll((current) => current.filter((reminder) => reminder.id !== id));
    triggerDataRefresh();
  };

  const markTaken = async (id, dateKey = todayKey()) => {
    await saveAll((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? {
              ...reminder,
              takenDates: [...new Set([...(reminder.takenDates || []), dateKey])],
              updatedAt: new Date().toISOString(),
            }
          : reminder
      )
    );
    triggerDataRefresh();
  };

  const getUpcomingReminders = (limit = reminders.length) =>
    reminders
      .filter((reminder) => reminder.enabled !== false)
      .map((reminder) => ({
        ...reminder,
        nextOccurrence: getReminderNextOccurrence(reminder),
        takenToday: isReminderTakenOnDate(reminder),
      }))
      .slice(0, limit);

  return {
    reminders,
    loading,
    refresh,
    addReminder,
    updateReminder,
    deleteReminder,
    markTaken,
    isTakenToday: isReminderTakenOnDate,
    getUpcomingReminders,
  };
}
