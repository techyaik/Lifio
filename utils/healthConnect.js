import { Platform, Linking } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  revokeAllPermissions as revokeAllPermissionsNative,
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
  weight: { recordType: 'Weight', permission: 'android.permission.health.READ_WEIGHT', label: 'Weight' },
  height: { recordType: 'Height', permission: 'android.permission.health.READ_HEIGHT', label: 'Height' },
  hydration: { recordType: 'Hydration', permission: 'android.permission.health.READ_HYDRATION', label: 'Hydration' },
  bodyFat: { recordType: 'BodyFat', permission: 'android.permission.health.READ_BODY_FAT', label: 'Body Fat' },
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
 * Revoke all granted Health Connect permissions for this app.
 */
export async function revokeAllPermissions() {
  try {
    await initializeHealthConnect();
    if (typeof revokeAllPermissionsNative === 'function') {
      await revokeAllPermissionsNative();
    }
    return true;
  } catch (e) {
    console.warn('Failed to revoke Health Connect permissions:', e);
    return false;
  }
}

/**
 * Returns the set of record types (keys from METRIC_CONFIG) the user has
 * currently granted to the app, empty array if none.
 */
export async function getGrantedHealthPermissions() {
  try {
    await initializeHealthConnect();
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
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { operator: 'between', startTime: startTime.toISOString(), endTime: endTime.toISOString() };
}

function getSleepRange() {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0, 0, 0); // yesterday 6 PM
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { operator: 'between', startTime: startTime.toISOString(), endTime: endTime.toISOString() };
}

/**
 * Fetch real Health Connect data for the current day.
 *
 * Deduplicates multi-source records (e.g. Google Fit vs system step counters)
 * and aggregates metrics cleanly.
 */
export async function fetchHealthConnectData(permissions) {
  const results = {
    steps: null,
    distance: null,
    activeMinutes: null,
    calories: null,
    heartRate: null,
    sleep: null,
    weight: null,
    height: null,
    water: null,
    bodyFat: null,
    bloodOxygen: null,
    workout: null,
  };

  try {
    await initializeHealthConnect();
  } catch (e) {
    console.warn('Failed to initialize Health Connect before read:', e);
  }

  const timeRangeFilter = getTodayRange();
  const sleepTimeRangeFilter = getSleepRange();

  let grantedKeys = [];
  try {
    grantedKeys = await getGrantedHealthPermissions();
  } catch (e) {
    console.warn('Could not query granted health permissions:', e);
  }

  // Strictly enforce that native Android permission is granted before attempting readRecords,
  // preventing SecurityException when permissions are denied or revoked in Health Connect settings.
  const effectivePermissions = {
    steps: grantedKeys.includes('steps') && (permissions ? permissions.steps !== false : true),
    distance: grantedKeys.includes('distance') && (permissions ? permissions.distance !== false : true),
    calories: grantedKeys.includes('calories') && (permissions ? permissions.calories !== false : true),
    heartRate: grantedKeys.includes('heartRate') && (permissions ? permissions.heartRate !== false : true),
    sleep: grantedKeys.includes('sleep') && (permissions ? permissions.sleep !== false : true),
    weight: grantedKeys.includes('weight') && (permissions ? permissions.weight !== false : true),
    height: grantedKeys.includes('height') && (permissions ? permissions.height !== false : true),
    hydration: grantedKeys.includes('hydration') && (permissions ? permissions.hydration !== false : true),
    bodyFat: grantedKeys.includes('bodyFat') && (permissions ? permissions.bodyFat !== false : true),
    bloodOxygen: grantedKeys.includes('bloodOxygen') && (permissions ? permissions.bloodOxygen !== false : true),
    workout: grantedKeys.includes('workout') && (permissions ? permissions.workout !== false : true),
  };

  // Helper to deduplicate records across data sources (e.g. Google Fit vs Phone sensor)
  const extractMaxByOrigin = (records, getVal) => {
    if (!records || records.length === 0) return null;
    const byOrigin = {};
    records.forEach((record) => {
      const origin = record.metadata?.dataOrigin || 'default';
      const val = getVal(record);
      byOrigin[origin] = (byOrigin[origin] || 0) + val;
    });

    // If Google Fit package is present, prioritize its total
    if (byOrigin['com.google.android.apps.fitness']) {
      return byOrigin['com.google.android.apps.fitness'];
    }
    const values = Object.values(byOrigin);
    return values.length > 0 ? Math.max(...values) : null;
  };

  // 1. Steps
  if (effectivePermissions.steps) {
    try {
      const { records } = await readRecords('Steps', { timeRangeFilter });
      const maxSteps = extractMaxByOrigin(records, (r) => r.count || 0);
      if (maxSteps != null) results.steps = maxSteps;
    } catch (e) {
      console.warn('Health Connect steps read failed:', e);
    }
  }

  // 2. Distance (km)
  if (effectivePermissions.distance) {
    try {
      const { records } = await readRecords('Distance', { timeRangeFilter });
      const maxMeters = extractMaxByOrigin(records, (r) => r.distance?.inMeters || 0);
      if (maxMeters != null) results.distance = parseFloat((maxMeters / 1000).toFixed(2));
    } catch (e) {
      console.warn('Health Connect distance read failed:', e);
    }
  }

  // 3. Calories / Energy
  if (effectivePermissions.calories) {
    try {
      const { records } = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      let maxCalories = extractMaxByOrigin(records, (r) => r.energy?.inKilocalories || 0);

      // Fallback to TotalCaloriesBurned if ActiveCaloriesBurned has no records
      if (maxCalories == null || maxCalories === 0) {
        try {
          const { records: totalRecords } = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
          maxCalories = extractMaxByOrigin(totalRecords, (r) => r.energy?.inKilocalories || 0);
        } catch (e) {
          // ignore fallback error
        }
      }

      if (maxCalories != null && maxCalories > 0) {
        results.calories = Math.round(maxCalories);
      }
    } catch (e) {
      console.warn('Health Connect calories read failed:', e);
    }
  }

  // 4. Heart Rate (average across today's samples)
  if (effectivePermissions.heartRate) {
    try {
      const { records } = await readRecords('HeartRate', { timeRangeFilter });
      let totalBpm = 0;
      let count = 0;
      records.forEach((record) => {
        record.samples?.forEach((sample) => {
          if (sample.beatsPerMinute) {
            totalBpm += sample.beatsPerMinute;
            count++;
          }
        });
      });
      if (count > 0) results.heartRate = Math.round(totalBpm / count);
    } catch (e) {
      console.warn('Health Connect heart rate read failed:', e);
    }
  }

  // 5. Sleep (hours from overnight / today sleep sessions)
  if (effectivePermissions.sleep) {
    try {
      const { records } = await readRecords('SleepSession', { timeRangeFilter: sleepTimeRangeFilter });
      if (records && records.length > 0) {
        // Group sessions by origin
        const sleepByOrigin = {};
        records.forEach((record) => {
          const origin = record.metadata?.dataOrigin || 'default';
          const start = new Date(record.startTime).getTime();
          const end = new Date(record.endTime).getTime();
          if (end > start) {
            const hours = (end - start) / 3600000;
            sleepByOrigin[origin] = (sleepByOrigin[origin] || 0) + hours;
          }
        });

        // Filter positive durations and select max valid sleep session duration across origins
        const validDurations = Object.values(sleepByOrigin).filter((h) => h > 0);
        if (validDurations.length > 0) {
          results.sleep = parseFloat(Math.max(...validDurations).toFixed(1));
        }
      }
    } catch (e) {
      console.warn('Health Connect sleep read failed:', e);
    }
  }

  // 6. Weight (kg)
  if (effectivePermissions.weight) {
    try {
      const { records } = await readRecords('Weight', { timeRangeFilter });
      if (records && records.length > 0) {
        const latestRecord = records[records.length - 1];
        const weightKg = latestRecord.weight?.inKilograms;
        if (weightKg) results.weight = parseFloat(weightKg.toFixed(1));
      }
    } catch (e) {
      console.warn('Health Connect weight read failed:', e);
    }
  }

  // 7. Height (cm)
  if (effectivePermissions.height) {
    try {
      const { records } = await readRecords('Height', { timeRangeFilter });
      if (records && records.length > 0) {
        const latestRecord = records[records.length - 1];
        const heightMeters = latestRecord.height?.inMeters;
        if (heightMeters) results.height = Math.round(heightMeters * 100);
      }
    } catch (e) {
      console.warn('Health Connect height read failed:', e);
    }
  }

  // 8. Hydration (water intake in glasses / liters)
  if (effectivePermissions.hydration) {
    try {
      const { records } = await readRecords('Hydration', { timeRangeFilter });
      const maxLiters = extractMaxByOrigin(records, (r) => r.volume?.inLiters || 0);
      if (maxLiters != null && maxLiters > 0) {
        results.water = parseFloat(maxLiters.toFixed(2));
      }
    } catch (e) {
      console.warn('Health Connect hydration read failed:', e);
    }
  }

  // 9. Body Fat (%)
  if (effectivePermissions.bodyFat) {
    try {
      const { records } = await readRecords('BodyFat', { timeRangeFilter });
      if (records && records.length > 0) {
        const latestRecord = records[records.length - 1];
        const percentage = latestRecord.percentage;
        if (percentage) results.bodyFat = parseFloat(percentage.toFixed(1));
      }
    } catch (e) {
      console.warn('Health Connect body fat read failed:', e);
    }
  }

  // 8. Blood oxygen (average percentage)
  if (effectivePermissions.bloodOxygen) {
    try {
      const { records } = await readRecords('OxygenSaturation', { timeRangeFilter });
      if (records && records.length > 0) {
        let totalSpO2 = 0;
        records.forEach((record) => {
          if (record.percentage) totalSpO2 += record.percentage;
        });
        results.bloodOxygen = Math.round(totalSpO2 / records.length);
      }
    } catch (e) {
      console.warn('Health Connect blood oxygen read failed:', e);
    }
  }

  // 9. Workout / Exercise Session + active minutes
  if (effectivePermissions.workout) {
    try {
      const { records } = await readRecords('ExerciseSession', { timeRangeFilter });
      if (records && records.length > 0) {
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