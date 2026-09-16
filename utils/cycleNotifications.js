/**
 * cycleNotifications.js
 *
 * Production-ready notification utilities for the Cycle Tracking feature.
 *
 * Responsibilities:
 *  - Bootstrap: register handler + create Android channel (called once at app startup)
 *  - Request / inspect notification permissions
 *  - Schedule a one-shot CYCLE_REMINDER at (nextPeriodDate - reminderDays) @ 09:00
 *  - Cancel all pending CYCLE_REMINDER notifications (called when tracking is turned off)
 *  - Schedule / cancel the repeating DAILY_REMINDER
 *
 * Trigger format uses `{ type: 'date', date }` as required by expo-notifications ≥ 0.28 / SDK 51+.
 * Android notification channel 'cycle_reminders' is created once and reused for all cycle alerts.
 */

import { Platform } from 'react-native';
import { addDays, parseISO, isAfter } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPE_CYCLE = 'CYCLE_REMINDER';
const NOTIFICATION_TYPE_DAILY = 'DAILY_REMINDER';

const CYCLE_CHANNEL_ID = 'cycle_reminders';
const DAILY_CHANNEL_ID = 'daily_reminders';

// ─── Lazy module load (keeps web/test environments safe) ─────────────────────

let Notifications = null;

const getNotifications = () => {
  if (Notifications) return Notifications;
  if (Platform.OS === 'web') return null;
  try {
    Notifications = require('expo-notifications');
    return Notifications;
  } catch (e) {
    console.warn('[cycleNotifications] expo-notifications not available:', e.message);
    return null;
  }
};

// ─── App Bootstrap (call ONCE in App.js) ─────────────────────────────────────

/**
 * setupNotificationHandler()
 *
 * Must be called once at app startup (in App.js, outside any component) before
 * any notification can be received or displayed. Sets the foreground display
 * policy and creates the required Android notification channels.
 */
export async function setupNotificationHandler() {
  const N = getNotifications();
  if (!N) return;

  // Set how notifications are presented when the app is in the foreground
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Create Android notification channels (no-op on iOS / web)
  if (Platform.OS === 'android') {
    try {
      await N.setNotificationChannelAsync(CYCLE_CHANNEL_ID, {
        name: 'Cycle Reminders',
        description: 'Reminders about your upcoming period based on your cycle.',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B8B',
        sound: true,
        enableLights: true,
        showBadge: false,
      });

      await N.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
        name: 'Daily Reminders',
        description: 'Daily prompt to log your health metrics and habits.',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: true,
        enableLights: true,
        showBadge: false,
      });
    } catch (e) {
      console.warn('[cycleNotifications] Failed to create notification channels:', e.message);
    }
  }
}

// ─── Permission Helpers ───────────────────────────────────────────────────────

/**
 * requestNotificationPermissions()
 *
 * Requests OS notification permissions if not already granted.
 * Returns true if permissions are granted, false otherwise.
 */
export async function requestNotificationPermissions() {
  const N = getNotifications();
  if (!N || Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await N.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await N.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return status === 'granted';
  } catch (error) {
    console.warn('[cycleNotifications] Error requesting permissions:', error.message);
    return false;
  }
}

/**
 * getNotificationPermissionStatus()
 *
 * Returns the current permission status string without prompting the user.
 * Possible values: 'granted' | 'denied' | 'undetermined' | 'unavailable'
 */
export async function getNotificationPermissionStatus() {
  const N = getNotifications();
  if (!N || Platform.OS === 'web') return 'unavailable';

  try {
    const { status } = await N.getPermissionsAsync();
    return status;
  } catch (error) {
    console.warn('[cycleNotifications] Error getting permission status:', error.message);
    return 'unavailable';
  }
}

// ─── Cycle Reminder ───────────────────────────────────────────────────────────

/**
 * cancelCycleReminders()
 *
 * Cancels ALL scheduled notifications with data.type === 'CYCLE_REMINDER'.
 * Call this when cycle tracking is toggled OFF.
 */
export async function cancelCycleReminders() {
  const N = getNotifications();
  if (!N || Platform.OS === 'web') return;

  try {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (notif) => notif.content?.data?.type === NOTIFICATION_TYPE_CYCLE
    );
    await Promise.all(
      toCancel.map((notif) => N.cancelScheduledNotificationAsync(notif.identifier))
    );
    if (toCancel.length > 0) {
      console.info(`[cycleNotifications] Cancelled ${toCancel.length} cycle reminder(s).`);
    }
  } catch (error) {
    console.warn('[cycleNotifications] Error cancelling cycle reminders:', error.message);
  }
}

/**
 * scheduleCycleReminderNotification({ lastPeriodStart, cycleLength, periodReminderDays })
 *
 * Schedules a one-shot local notification at 09:00 on the day that is
 * (nextExpectedPeriodDate - periodReminderDays).
 *
 * - Cancels any existing CYCLE_REMINDER notifications first (deduplication).
 * - If periodReminderDays <= 0, all pending reminders are cancelled and no new one is scheduled.
 * - If the target date is in the past, returns a descriptive failure object.
 * - Uses { type: 'date', date } trigger (expo-notifications SDK 51+ / 0.28+).
 *
 * @param {string} lastPeriodStart - ISO 8601 date string of last period start (e.g. '2025-01-15')
 * @param {number} cycleLength     - Cycle length in days (default 28)
 * @param {number} periodReminderDays - Days before expected period to send alert (default 2)
 * @returns {Promise<{success: boolean, ...}>}
 */
export async function scheduleCycleReminderNotification({
  lastPeriodStart,
  cycleLength = 28,
  periodReminderDays = 2,
}) {
  const N = getNotifications();
  if (!N || Platform.OS === 'web') {
    return { success: false, reason: 'Notifications not supported on this platform.' };
  }

  // Always cancel existing cycle reminders first (prevents duplicates)
  await cancelCycleReminders();

  // If reminders are disabled, stop here
  const reminderDays = Number(periodReminderDays);
  if (!reminderDays || reminderDays <= 0) {
    return { success: true, message: 'Cycle reminder disabled (reminderDays <= 0).' };
  }

  // Validate input date
  if (!lastPeriodStart) {
    return { success: false, reason: 'lastPeriodStart is required.' };
  }

  // Request permissions (prompts user if not yet granted)
  const granted = await requestNotificationPermissions();
  if (!granted) {
    return { success: false, reason: 'Notification permissions were not granted.' };
  }

  try {
    const lastStart = parseISO(lastPeriodStart);
    if (isNaN(lastStart.getTime())) {
      return { success: false, reason: `Invalid date: ${lastPeriodStart}` };
    }

    const cycleLen = Number(cycleLength) || 28;
    const nextExpected = addDays(lastStart, cycleLen);
    const alertDate = addDays(nextExpected, -reminderDays);

    // Deliver at 09:00 AM local time on the alert day
    alertDate.setHours(9, 0, 0, 0);

    const now = new Date();
    if (!isAfter(alertDate, now)) {
      return {
        success: false,
        reason: `Alert date (${alertDate.toISOString()}) is in the past. Log a more recent period start to reschedule.`,
      };
    }

    const title = '🌸 Period Reminder';
    const body =
      reminderDays === 1
        ? 'Your period is expected tomorrow. Stay prepared!'
        : `Your period is expected in ${reminderDays} days. Take care and stay prepared!`;

    const notifId = await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        // Android-specific: use the dedicated channel and HIGH priority
        ...(Platform.OS === 'android' && {
          channelId: CYCLE_CHANNEL_ID,
          priority: N.AndroidNotificationPriority?.HIGH ?? 'high',
        }),
        data: {
          type: NOTIFICATION_TYPE_CYCLE,
          lastPeriodStart,
          cycleLength: cycleLen,
          periodReminderDays: reminderDays,
        },
      },
      // SDK 51+ / expo-notifications ≥ 0.28 trigger format
      trigger: {
        type: 'date',
        date: alertDate,
      },
    });

    console.info(
      `[cycleNotifications] Cycle reminder scheduled → ${alertDate.toISOString()} (id: ${notifId})`
    );

    return {
      success: true,
      identifier: notifId,
      scheduledTime: alertDate.toISOString(),
      title,
      body,
    };
  } catch (error) {
    console.error('[cycleNotifications] Failed to schedule cycle notification:', error);
    return { success: false, error: error.message };
  }
}

// ─── Daily Reminder ───────────────────────────────────────────────────────────

/**
 * scheduleDailyReminderNotification({ enabled, timeStr })
 *
 * Schedules (or cancels) a repeating daily reminder at the given local time.
 *
 * @param {boolean} enabled  - true = schedule, false = cancel
 * @param {string}  timeStr  - 'HH:MM' 24-hour format (default '09:00')
 * @returns {Promise<{success: boolean, ...}>}
 */
export async function scheduleDailyReminderNotification({ enabled, timeStr = '09:00' }) {
  const N = getNotifications();
  if (!N || Platform.OS === 'web') {
    return { success: false, reason: 'Notifications not supported on this platform.' };
  }

  try {
    // Cancel any existing daily reminders first
    const scheduled = await N.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (notif) => notif.content?.data?.type === NOTIFICATION_TYPE_DAILY
    );
    await Promise.all(
      toCancel.map((notif) => N.cancelScheduledNotificationAsync(notif.identifier))
    );

    if (!enabled) {
      return { success: true, message: 'Daily reminder disabled.' };
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      return { success: false, reason: 'Notification permissions not granted.' };
    }

    const [hourStr, minuteStr] = (timeStr || '09:00').split(':');
    const hours = parseInt(hourStr, 10) || 9;
    const minutes = parseInt(minuteStr, 10) || 0;

    const notifId = await N.scheduleNotificationAsync({
      content: {
        title: '☀️ Daily Lifio Reminder',
        body: 'Time to log your daily health metrics and check your habits!',
        sound: true,
        ...(Platform.OS === 'android' && {
          channelId: DAILY_CHANNEL_ID,
          priority: N.AndroidNotificationPriority?.HIGH ?? 'high',
        }),
        data: { type: NOTIFICATION_TYPE_DAILY, timeStr },
      },
      trigger: {
        type: 'daily',
        hour: hours,
        minute: minutes,
      },
    });

    console.info(`[cycleNotifications] Daily reminder scheduled at ${hours}:${String(minutes).padStart(2, '0')} (id: ${notifId})`);

    return { success: true, identifier: notifId };
  } catch (error) {
    console.error('[cycleNotifications] Failed to schedule daily reminder:', error);
    return { success: false, error: error.message };
  }
}
