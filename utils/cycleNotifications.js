import { Platform } from 'react-native';
import { addDays, parseISO, isAfter } from 'date-fns';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications module not loaded:', e);
}

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('Failed to set notification handler:', e);
  }
}

export async function requestNotificationPermissions() {
  if (!Notifications || Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

export async function scheduleCycleReminderNotification({ lastPeriodStart, cycleLength = 28, periodReminderDays = 2 }) {
  if (!Notifications || Platform.OS === 'web') {
    return { success: false, reason: 'Notifications not supported on this device/platform.' };
  }

  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      return { success: false, reason: 'Notification permissions were not granted.' };
    }

    // Cancel previous cycle reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content?.data?.type === 'CYCLE_REMINDER') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!periodReminderDays || Number(periodReminderDays) <= 0) {
      return { success: true, message: 'Reminders turned off.' };
    }

    const lastStart = parseISO(lastPeriodStart);
    const nextExpected = addDays(lastStart, Number(cycleLength));
    const alertDate = addDays(nextExpected, -Number(periodReminderDays));

    // Set reminder time to 9:00 AM on alertDate
    alertDate.setHours(9, 0, 0, 0);

    const now = new Date();
    if (!isAfter(alertDate, now)) {
      return { success: false, reason: 'Target notification time has already passed.' };
    }

    const title = '🌸 Period Tracker Alert';
    const body = `Your period is expected in ${periodReminderDays} day${periodReminderDays > 1 ? 's' : ''}. Take care and stay prepared!`;

    const trigger = {
      date: alertDate,
    };

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
        data: { type: 'CYCLE_REMINDER', lastPeriodStart, cycleLength, periodReminderDays },
      },
      trigger,
    });

    return {
      success: true,
      identifier: notifId,
      scheduledTime: alertDate.toISOString(),
      title,
      body,
    };
  } catch (error) {
    console.error('Failed to schedule cycle notification:', error);
    return { success: false, error: error.message };
  }
}

export async function scheduleDailyReminderNotification({ enabled, timeStr = '09:00' }) {
  if (!Notifications || Platform.OS === 'web') {
    return { success: false, reason: 'Notifications not supported on this device/platform.' };
  }

  try {
    // Cancel existing daily reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content?.data?.type === 'DAILY_REMINDER') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!enabled) {
      return { success: true, message: 'Daily reminder disabled.' };
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      return { success: false, reason: 'Notification permissions not granted.' };
    }

    const parts = (timeStr || '09:00').split(':');
    const hours = parseInt(parts[0], 10) || 9;
    const minutes = parseInt(parts[1], 10) || 0;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Daily Lifio Reminder',
        body: 'Time to log your daily health metrics and check your habits!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
        data: { type: 'DAILY_REMINDER', timeStr },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    return { success: true, identifier: notifId };
  } catch (error) {
    console.error('Failed to schedule daily reminder:', error);
    return { success: false, error: error.message };
  }
}

