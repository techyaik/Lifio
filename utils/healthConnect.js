import { Platform, Linking } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  getSdkStatus,
  readRecords,
  openHealthConnectSettings as openHealthConnectSettingsNative,
  SdkAvailabilityStatus,
  ExerciseType,
} from 'react-native-health-connect';

const HEALTH_CONNECT_MARKET_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

/**
 * Maps an internal metric key (the shape used across the app) to its
 * Health Connect record type + Android permission string.
 */
const METRIC_CONFIG = {
  steps: { recordType: 'Steps', permission: 'android.permission.health.READ_STEPS', label: 'Steps' },
  distance: { recordType: 'Distance', permission: 'android.permission.health.READ_DISTANCE', label: 'Distance' },
  calories: { recordType: 'ActiveCaloriesBurned', permission: 'android.permission.health.READ_ACTIVE_CALORIES_BURNED', label: 'Calories' },
  heartRate: { recordType: 'HeartRate', permission: 'android.permission.health.READ_HEART_RATE', label: 'Heart rate' },
  sleep: { recordType: 'SleepSession', permission: 'android.permission.health.READ_SLEEP', label: 'Sleep' },
  bloodOxygen: { recordType: 'OxygenSaturation', permission: 'android.permission.health.READ_OXYGEN_SATURATION', label: 'Blood oxygen' },
  workout: { recordType: 'ExerciseSession', permission: 'android.permission.health.READ_EXERCISE', label: 'Exercise' },
};

const RECORD_TYPE_TO_KEY = Object.fromEntries(
  Object.entries(METRIC_CONFIG).map(([key, cfg]) => [cfg.recordType, key])
);

/**
 * Check whether Health Connect is installed, up to date and usable on this
 * device. Returns a structured availability result so callers can guide the
 * user (install / update / proceed) instead of guessing.
 */
export async function getHealthConnectAvailability() {
  if (Platform.OS !== 'android') {
    return {
      available: false,
      requireInstall: false,
      requireUpdate: false,
      message: 'Health Connect is only available on Android.',
    };
  }

  try {
    const status = await getSdkStatus();

    switch (status) {
      case SdkAvailabilityStatus.SDK_UNAVAILABLE:
        return {
          available: false,
          requireInstall: true,
          requireUpdate: false,
          message: 'Health Connect is not installed on this device.',
        };
      case SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
        return {
          available: false,
          requireInstall: false,
          requireUpdate: true,
          message: 'Health Connect needs to be updated on this device.',
        };
      case SdkAvailabilityStatus.SDK_AVAILABLE:
        return {
          available: true,
          requireInstall: false,
          requireUpdate: false,
          message: null,
        };
      default:
        return {
          available: false,
          requireInstall: true,
          requireUpdate: false,
          message: 'Health Connect is not available on this device.',
        };
    }
  } catch (e) {
    const errorStr = String(e?.message || e || '');
    if (errorStr.includes("doesn't seem to be linked")) {
      return {
        available: false,
        isExpoGo: true,
        requireInstall: false,
        requireUpdate: false,
        message: 'Health Connect requires a native Android build. Custom native modules are not available in Expo Go.',
      };
    }
    console.warn('Failed to check Health Connect status:', e);
    return {
      available: false,
      requireInstall: true,
      requireUpdate: false,
      message: 'Unable to check Health Connect availability.',
    };
  }
}

/**
 * Open the Play Store listing for Health Connect so users can install/update it.
 */
export async function openHealthConnectStore() {
  try {
    await Linking.openURL(HEALTH_CONNECT_MARKET_URL);
  } catch (e) {
    console.warn('Failed to open Health Connect Play Store listing:', e);
  }
}

/**
 * Open the Health Connect settings screen for this app so users can manage
 * the permissions they granted/revoked.
 */
export function openHealthConnectSettings() {
  openHealthConnectSettingsNative();
}

/**
 * Initialize the Health Connect client. Must be called before reading or
 * requesting permissions for a given session.
 */
export async function initializeHealthConnect() {
  try {
    return await initialize();
  } catch (e) {
    if (e.message && e.message.includes('Expo Go')) {
      console.warn('Health Connect is not available in Expo Go. Use a development build to test this feature.');
    } else {
      console.warn('Failed to initialize Health Connect:', e);
    }
    return false;
  }
}

/**
 * Returns the set of record types (keys from METRIC_CONFIG) the user has
 * currently granted to the app, empty array if none.
 */
export async function getGrantedHealthPermissions() {
  try {
    const granted = await getGrantedPermissions();
    return granted
      .filter((permission) => permission.accessType === 'read')
      .map((permission) => RECORD_TYPE_TO_KEY[permission.recordType])
      .filter(Boolean);
  } catch (e) {
    console.warn('Failed to fetch granted Health Connect permissions:', e);
    return [];
  }
}

/**
 * Build the permission request list from the app's metric toggles.
 */
function buildPermissionList(requestedPermissions) {
  return Object.keys(METRIC_CONFIG)
    .filter((key) => requestedPermissions && requestedPermissions[key])
    .map((key) => ({
      accessType: 'read',
      recordType: METRIC_CONFIG[key].recordType,
    }));
}

function toConfigShape(grantedRecordTypes) {
  const config = {};
  Object.keys(METRIC_CONFIG).forEach((key) => {
    config[key] = grantedRecordTypes.includes(key);
  });
  return config;
}

/**
 * Request Health Connect read permissions for the requested metrics.
 *
 * Returns a structured result so the UI can distinguish between:
 *  - nothing selected
 *  - partial grant (some accepted, some denied)
 *  - full denial
 *  - an unexpected failure during the request
 */
export async function requestHealthPermissions(requestedPermissions) {
  const requested = buildPermissionList(requestedPermissions);

  if (requested.length === 0) {
    return {
      ok: true,
      allGranted: true,
      granted: [],
      denied: [],
      grantedKeys: {},
      message: 'No permissions were selected.',
    };
  }

  try {
    const granted = await requestPermission(requested);

    const grantedRecordTypes = granted.map((permission) => permission.recordType);
    const allRequested = requested.map((permission) => permission.recordType);
    const grantedKeys = new Set(
      grantedRecordTypes.map((recordType) => RECORD_TYPE_TO_KEY[recordType]).filter(Boolean)
    );
    const deniedRecordTypes = allRequested.filter((recordType) => !grantedRecordTypes.includes(recordType));
    const deniedKeys = deniedRecordTypes.map((recordType) => RECORD_TYPE_TO_KEY[recordType]).filter(Boolean);
    const grantedAsConfig = toConfigShape([...grantedKeys]);

    return {
      ok: grantedKeys.size > 0,
      allGranted: grantedKeys.size === allRequested.length,
      granted: deniedKeys.length === 0 ? allRequested : grantedRecordTypes,
      denied: deniedKeys,
      grantedKeys: grantedAsConfig,
      message: buildPermissionResultMessage(grantedAsConfig, deniedKeys),
    };
  } catch (e) {
    console.error('Failed to request Health Connect permissions:', e);
    return {
      ok: false,
      allGranted: false,
      granted: [],
      denied: Object.keys(METRIC_CONFIG).filter((key) => requestedPermissions && requestedPermissions[key]),
      grantedKeys: {},
      error: e && e.message ? e.message : String(e),
      message: 'Health Connect failed to open the permission dialog. Please try again.',
    };
  }
}

function buildPermissionResultMessage(grantedAsConfig, deniedKeys) {
  if (deniedKeys.length === 0) {
    return 'All requested permissions were granted.';
  }
  const deniedLabels = deniedKeys.map((key) => METRIC_CONFIG[key]?.label || key);
  const grantedLabels = Object.keys(METRIC_CONFIG).filter((key) => grantedAsConfig[key]).map((key) => METRIC_CONFIG[key].label);
  const prefix = grantedLabels.length === 0 ? 'All' : `Some`;
  return `${prefix} permissions were denied: ${deniedLabels.join(', ')}.`;
}

function getTodayRange() {
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);
  const endTime = new Date();
  endTime.setHours(23, 59, 59, 999);
  return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
}

function rangeFilter() {
  const { startTime, endTime } = getTodayRange();
  return { operator: 'between', startTime, endTime };
}

/**
 * Fetch real Health Connect data for the current day.
 *
 * Only reads record types that were actually granted. When aggregating step /
 * distance / calorie totals it uses sum over records so apps writing multiple
 * small interval records during the day still aggregate correctly.
 */
export async function fetchHealthConnectData(permissions) {
  const results = {
    steps: null,
    distance: null,
    activeMinutes: null,
    calories: null,
    heartRate: null,
    sleep: null,
    bloodOxygen: null,
    workout: null,
  };

  const timeRangeFilter = rangeFilter();

  // 1. Steps
  if (permissions.steps) {
    try {
      const { records } = await readRecords('Steps', { timeRangeFilter });
      const totalSteps = records.reduce((sum, record) => sum + (record.count || 0), 0);
      if (records.length > 0) results.steps = totalSteps;
    } catch (e) {
      console.warn('Health Connect steps read failed:', e);
    }
  }

  // 2. Distance (km)
  if (permissions.distance) {
    try {
      const { records } = await readRecords('Distance', { timeRangeFilter });
      const totalMeters = records.reduce((sum, record) => sum + (record.distance?.inMeters || 0), 0);
      if (records.length > 0) results.distance = parseFloat((totalMeters / 1000).toFixed(2));
    } catch (e) {
      console.warn('Health Connect distance read failed:', e);
    }
  }

  // 3. Calories
  if (permissions.calories) {
    try {
      const { records } = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      const totalCalories = records.reduce((sum, record) => sum + (record.energy?.inKilocalories || 0), 0);
      if (records.length > 0) results.calories = Math.round(totalCalories);
    } catch (e) {
      console.warn('Health Connect calories read failed:', e);
    }
  }

  // 4. Heart Rate (average across samples)
  if (permissions.heartRate) {
    try {
      const { records } = await readRecords('HeartRate', { timeRangeFilter });
      let totalBpm = 0;
      let count = 0;
      records.forEach((record) => {
        record.samples?.forEach((sample) => {
          totalBpm += sample.beatsPerMinute;
          count++;
        });
      });
      if (count > 0) results.heartRate = Math.round(totalBpm / count);
    } catch (e) {
      console.warn('Health Connect heart rate read failed:', e);
    }
  }

  // 5. Sleep (hours, from overlapping SleepSession intervals)
  if (permissions.sleep) {
    try {
      const { records } = await readRecords('SleepSession', { timeRangeFilter });
      if (records.length > 0) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

        let totalSleepMillis = 0;
        records.forEach((record) => {
          const start = Math.max(new Date(record.startTime).getTime(), startOfDay.getTime());
          const end = Math.min(new Date(record.endTime).getTime(), endOfDay.getTime());
          if (end > start) totalSleepMillis += end - start;
        });
        if (totalSleepMillis > 0) results.sleep = parseFloat((totalSleepMillis / 3600000).toFixed(1));
      }
    } catch (e) {
      console.warn('Health Connect sleep read failed:', e);
    }
  }

  // 6. Blood oxygen (average percentage)
  if (permissions.bloodOxygen) {
    try {
      const { records } = await readRecords('OxygenSaturation', { timeRangeFilter });
      if (records.length > 0) {
        let totalSpO2 = 0;
        records.forEach((record) => {
          totalSpO2 += record.percentage;
        });
        results.bloodOxygen = Math.round(totalSpO2 / records.length);
      }
    } catch (e) {
      console.warn('Health Connect blood oxygen read failed:', e);
    }
  }

  // 7. Workout / Exercise Session + active minutes
  if (permissions.workout) {
    try {
      const { records } = await readRecords('ExerciseSession', { timeRangeFilter });
      if (records.length > 0) {
        const EXERCISE_LABELS = {
          [ExerciseType.WALKING]: 'Walking',
          [ExerciseType.RUNNING]: 'Running',
          [ExerciseType.BIKING]: 'Biking',
          [ExerciseType.SWIMMING_POOL]: 'Swimming',
          [ExerciseType.HIKING]: 'Hiking',
          [ExerciseType.YOGA]: 'Yoga',
          [ExerciseType.STRENGTH_TRAINING]: 'Strength training',
        };

        const latestSession = records[records.length - 1];
        const exerciseType = latestSession.exerciseType;
        results.workout =
          EXERCISE_LABELS[exerciseType] || (exerciseType != null && exerciseType !== undefined ? `Workout (${exerciseType})` : 'Workout');

        let totalActiveMillis = 0;
        records.forEach((record) => {
          const start = new Date(record.startTime).getTime();
          const end = new Date(record.endTime).getTime();
          if (end > start) totalActiveMillis += end - start;
        });
        results.activeMinutes = Math.round(totalActiveMillis / 60000);
      }
    } catch (e) {
      console.warn('Health Connect exercise read failed:', e);
    }
  }

  return results;
}