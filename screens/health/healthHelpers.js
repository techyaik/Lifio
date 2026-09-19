import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { displayDate, todayKey } from '../../utils/dates';

export const formatSteps = (steps) => (steps || steps === 0 ? Number(steps).toLocaleString() : '0');

export const PERMISSION_LABELS = {
  steps: 'Steps',
  distance: 'Distance',
  calories: 'Calories',
  heartRate: 'Heart rate',
  sleep: 'Sleep',
  weight: 'Weight',
  height: 'Height',
  hydration: 'Water / Hydration',
  bodyFat: 'Body fat',
  bloodOxygen: 'Blood oxygen',
  workout: 'Exercise',
};

export const percent = (value, goal) => {
  const parsedValue = Number(value) || 0;
  const parsedGoal = Number(goal) || 0;
  if (!parsedGoal) return 0;
  return Math.min(100, Math.round((parsedValue / parsedGoal) * 100));
};

export const average = (items, key) => {
  const values = items.map((item) => Number(item[key])).filter((value) => !Number.isNaN(value) && value > 0);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const HEALTH_TIPS = [
  "Drink a glass of water first thing in the morning to rehydrate after sleep.",
  "Take a 5-minute walk every two hours to improve circulation.",
  "Aim for 7-9 hours of quality sleep to support cognitive function and recovery.",
  "Incorporate a serving of leafy greens into at least one meal today.",
  "Practice deep breathing for 2 minutes to lower stress and heart rate.",
  "Swap sugary snacks for nuts or fruit to keep your energy levels stable.",
  "Screen time can disrupt sleep—try turning off devices an hour before bed.",
  "Stretching your hamstrings and back can help alleviate sitting fatigue.",
  "Eat mindfully without distractions to better recognize fullness cues.",
  "Sunlight exposure early in the day helps regulate your circadian rhythm.",
  "A short nap (15-20 minutes) can boost alertness without causing grogginess.",
  "Strength training twice a week helps maintain muscle mass and bone density.",
  "Stay hydrated during workouts to prevent early fatigue.",
  "Chew your food slowly to improve digestion and nutrient absorption.",
  "Replace one processed food item with a whole food alternative today.",
];

export const getDailyTip = () => {
  const key = todayKey(); 
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HEALTH_TIPS[Math.abs(hash) % HEALTH_TIPS.length];
};

export const getLast7DaysData = (logs, field) => {
  const byDate = new Map((logs || []).map((log) => [log.date, log]));
  const result = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = byDate.get(key);
    result.push({
      id: key,
      date: key,
      [field]: log?.[field] ?? 0,
      isToday: i === 0,
    });
  }
  return result;
};

export const getCycleInfo = (logs) => {
  const cycleLog =
    logs.find((log) => log.cycleEnabled && log.lastPeriodStart) ||
    logs.find((log) => log.period && (log.lastPeriodStart || log.date));

  if (!cycleLog) {
    return {
      title: 'Cycle reminders off',
      detail: 'Add your last period date to enable private local reminders.',
      nextDate: null,
      reminder: '',
    };
  }

  const lastStart = cycleLog.lastPeriodStart || cycleLog.date;
  try {
    const last = parseISO(lastStart);
    const cycleLength = Number(cycleLog.cycleLength) || 28;
    const duration = Number(cycleLog.periodDuration) || 5;
    const reminderDays = Number(cycleLog.periodReminderDays) || 0;
    const next = addDays(last, cycleLength);
    const daysUntil = differenceInCalendarDays(next, parseISO(todayKey()));
    const reminderDate = addDays(next, -reminderDays);

    return {
      title: daysUntil < 0 ? `Expected ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago` : `Expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      detail: `Last start ${displayDate(lastStart, 'MMM d')} · ${cycleLength}-day cycle · ${duration}-day period`,
      nextDate: displayDate(next, 'MMM d'),
      reminder: reminderDays ? `Reminder from ${displayDate(reminderDate, 'MMM d')}` : 'Reminder on expected date',
      flow: cycleLog.flowIntensity,
      symptoms: cycleLog.cycleSymptoms || [],
    };
  } catch (e) {
    return {
      title: 'Cycle date needs review',
      detail: 'Open the latest health log and check the saved date.',
      nextDate: null,
      reminder: '',
    };
  }
};
