import { Platform, Linking } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  revokeAllPermissions as revokeAllPermissionsNative,
  getSdkStatus,
  readRecords,
  aggregateRecord,
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
  totalCalories: { recordType: 'TotalCaloriesBurned', permission: 'android.permission.health.READ_TOTAL_CALORIES_BURNED', label: 'Total Calories' },
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
    console.info('[HealthConnect] Availability check: Platform is not Android.');
    return {
      available: false,
      requireInstall: false,
      requireUpdate: false,
      message: 'Health Connect is only available on Android.',
    };
  }

  try {
    const status = await getSdkStatus();
    console.info('[HealthConnect] SDK Availability Status:', status);

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
      console.warn('[HealthConnect] SDK Unavailable: Running inside Expo Go.');
      return {
        available: false,
        isExpoGo: true,
        requireInstall: false,
        requireUpdate: false,
        message: 'Health Connect requires a native Android build. Custom native modules are not available in Expo Go.',
      };
    }
    console.warn('[HealthConnect] Failed to check Health Connect status:', e);
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
    console.info('[HealthConnect] Opening Play Store link:', HEALTH_CONNECT_MARKET_URL);
    await Linking.openURL(HEALTH_CONNECT_MARKET_URL);
  } catch (e) {
    console.warn('[HealthConnect] Failed to open Health Connect Play Store listing:', e);
  }
}

/**
 * Open the Health Connect settings screen for this app so users can manage
 * the permissions they granted/revoked.
 */
export function openHealthConnectSettings() {
  console.info('[HealthConnect] Opening native Health Connect App Settings screen...');
  openHealthConnectSettingsNative();
}

/**
 * Initialize the Health Connect client. Must be called before reading or
 * requesting permissions for a given session.
 */
export async function initializeHealthConnect() {
  try {
    const res = await initialize();
    console.info('[HealthConnect] SDK Client Initialized Successfully:', res);
    return res;
  } catch (e) {
    if (e.message && e.message.includes('Expo Go')) {
      console.warn('[HealthConnect] Health Connect is not available in Expo Go. Use a development build.');
    } else {
      console.warn('[HealthConnect] Failed to initialize Health Connect SDK:', e);
    }
    return false;
  }
}

/**
 * Revoke all granted Health Connect permissions for this app.
 */
export async function revokeAllPermissions() {
  try {
    console.info('[HealthConnect] Revoking all permissions...');
    await initializeHealthConnect();
    if (typeof revokeAllPermissionsNative === 'function') {
      await revokeAllPermissionsNative();
    }
    console.info('[HealthConnect] All permissions revoked successfully.');
    return true;
  } catch (e) {
    console.warn('[HealthConnect] Failed to revoke permissions:', e);
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
    console.info('[HealthConnect] Raw granted permissions from OS:', JSON.stringify(granted));
    
    // Map permissions flexibly regardless of whether object structure has recordType, permission string, or accessType
    const grantedKeys = granted
      .map((permission) => {
        if (permission?.recordType && RECORD_TYPE_TO_KEY[permission.recordType]) {
          if (!permission.accessType || permission.accessType.toLowerCase().includes('read')) {
            return RECORD_TYPE_TO_KEY[permission.recordType];
          }
        }
        const permString = String(permission?.permission || permission || '');
        const entry = Object.entries(METRIC_CONFIG).find(([_, cfg]) => cfg.permission.toLowerCase() === permString.toLowerCase());
        if (entry) return entry[0];
        return null;
      })
      .filter(Boolean);

    const uniqueKeys = [...new Set(grantedKeys)];
    console.info('[HealthConnect] Parsed granted metric keys:', uniqueKeys);
    return uniqueKeys;
  } catch (e) {
    console.warn('[HealthConnect] Failed to fetch granted permissions:', e);
    // Return all keys as fallback so individual try/catch blocks in fetchHealthConnectData can attempt reads
    return Object.keys(METRIC_CONFIG);
  }
}

/**
 * Default permissions config for all supported health metrics in Lifio.
 */
export const DEFAULT_HEALTH_PERMISSIONS = {
  steps: true,
  distance: true,
  calories: true,
  heartRate: true,
  sleep: true,
  weight: true,
  height: true,
  hydration: true,
  bodyFat: true,
  bloodOxygen: true,
  workout: true,
  activeMinutes: true,
};

/**
 * Build the permission request list from the app's metric toggles.
 */
function buildPermissionList(requestedPermissions) {
  const merged = { ...DEFAULT_HEALTH_PERMISSIONS, ...(requestedPermissions || {}) };
  return Object.keys(METRIC_CONFIG)
    .filter((key) => merged[key] !== false)
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
 */
export async function requestHealthPermissions(requestedPermissions = DEFAULT_HEALTH_PERMISSIONS) {
  const permsToRequest = requestedPermissions && typeof requestedPermissions === 'object'
    ? { ...DEFAULT_HEALTH_PERMISSIONS, ...requestedPermissions }
    : DEFAULT_HEALTH_PERMISSIONS;

  const requested = buildPermissionList(permsToRequest);
  console.info('[HealthConnect] Requesting OS permissions dialog for:', requested.map((r) => r.recordType));

  if (requested.length === 0) {
    console.info('[HealthConnect] No permissions were selected in app config.');
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

    console.info('[HealthConnect] Permission Dialog Result -> Granted:', [...grantedKeys], '| Denied:', deniedKeys);

    return {
      ok: grantedKeys.size > 0,
      allGranted: grantedKeys.size === allRequested.length,
      granted: deniedKeys.length === 0 ? allRequested : grantedRecordTypes,
      denied: deniedKeys,
      grantedKeys: grantedAsConfig,
      message: buildPermissionResultMessage(grantedAsConfig, deniedKeys),
    };
  } catch (e) {
    console.error('[HealthConnect] Failed to request permissions dialog:', e);
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
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0, 0, 0);
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

  console.info('[HealthConnect] ====================================================');
  console.info('[HealthConnect] 🚀 Starting Health Connect Sync Session...');

  try {
    await initializeHealthConnect();
  } catch (e) {
    console.warn('[HealthConnect] Warning during initialize before read:', e);
  }

  const now = new Date();
  const timeRangeFilter = getTodayRange();
  console.info('[HealthConnect] Today query window:', timeRangeFilter.startTime, 'to', timeRangeFilter.endTime);

  let grantedKeys = [];
  try {
    grantedKeys = await getGrantedHealthPermissions();
    console.info('[HealthConnect] Currently granted OS permission keys:', grantedKeys);
  } catch (e) {
    console.warn('[HealthConnect] Could not query granted health permissions:', e);
  }

  // Check if a metric key has been granted at the OS level (or fallback to true if query failed)
  const isGranted = (key) => grantedKeys.length === 0 || grantedKeys.includes(key);

  // Evaluate effective permissions based on BOTH user metric toggles AND granted OS permissions
  const effectivePermissions = {
    steps: (!permissions || permissions.steps !== false) && isGranted('steps'),
    distance: (!permissions || permissions.distance !== false) && isGranted('distance'),
    calories: (!permissions || permissions.calories !== false) && isGranted('calories'),
    heartRate: (!permissions || permissions.heartRate !== false) && isGranted('heartRate'),
    sleep: (!permissions || permissions.sleep !== false) && isGranted('sleep'),
    weight: (!permissions || permissions.weight !== false) && isGranted('weight'),
    height: (!permissions || permissions.height !== false) && isGranted('height'),
    hydration: (!permissions || permissions.hydration !== false) && isGranted('hydration'),
    bodyFat: (!permissions || permissions.bodyFat !== false) && isGranted('bodyFat'),
    bloodOxygen: (!permissions || permissions.bloodOxygen !== false) && isGranted('bloodOxygen'),
    workout: (!permissions || permissions.workout !== false) && isGranted('workout'),
  };

  console.info('[HealthConnect] Enabled & Granted metric read targets:', Object.keys(effectivePermissions).filter((k) => effectivePermissions[k]));

  // Helper to deduplicate records across data sources cleanly
  const extractMaxByOrigin = (records, getVal) => {
    if (!records || records.length === 0) return null;
    const byOrigin = {};
    records.forEach((record) => {
      const origin = record.metadata?.dataOrigin || 'default';
      const val = getVal(record);
      byOrigin[origin] = (byOrigin[origin] || 0) + val;
    });

    const values = Object.values(byOrigin);
    return values.length > 0 ? Math.max(...values) : null;
  };

  // Safe readRecords wrapper guaranteeing non-null options parameter with valid timeRangeFilter
  const safeReadRecords = async (recordType, options) => {
    const opts = {
      timeRangeFilter,
      ...(options && typeof options === 'object' ? options : {}),
    };
    return await readRecords(recordType, opts);
  };

  // Helper to attempt OS native aggregate calculations
  const safeAggregate = async (request) => {
    try {
      if (typeof aggregateRecord === 'function') {
        return await aggregateRecord(request);
      }
    } catch (e) {
      console.info(`[HealthConnect] [Aggregate] Note for ${request.recordType}:`, e?.message || e);
    }
    return null;
  };

  // 1. Steps (strictly for current day timeRangeFilter)
  if (effectivePermissions.steps) {
    try {
      // Primary: Native OS aggregation
      const agg = await safeAggregate({ recordType: 'Steps', timeRangeFilter });
      if (agg && typeof agg.COUNT_TOTAL === 'number') {
        results.steps = agg.COUNT_TOTAL;
      }

      // Fallback: Individual raw records calculation for today
      if (results.steps == null) {
        let { records } = await safeReadRecords('Steps', { timeRangeFilter });
        const rawRecords = records || [];
        const maxSteps = extractMaxByOrigin(rawRecords, (r) => r.count || 0);
        if (maxSteps != null && maxSteps >= 0) results.steps = maxSteps;
        console.info(`[HealthConnect] [Steps] Read ${rawRecords.length} raw records for today -> Result: ${results.steps} steps`);
      } else {
        console.info(`[HealthConnect] [Steps] OS Aggregate -> Result: ${results.steps} steps`);
      }
    } catch (e) {
      console.warn('[HealthConnect] [Steps] Read error:', e?.message || e);
    }
  }

  // 2. Distance (km)
  if (effectivePermissions.distance) {
    try {
      // Primary: Native OS aggregation
      const agg = await safeAggregate({ recordType: 'Distance', timeRangeFilter });
      const distMeters = agg?.DISTANCE?.inMeters ?? (agg?.DISTANCE?.inKilometers ? agg.DISTANCE.inKilometers * 1000 : null);
      if (distMeters != null && distMeters > 0) {
        results.distance = parseFloat((distMeters / 1000).toFixed(2));
      }

      // Fallback: Individual record calculation
      if (results.distance == null) {
        let { records } = await safeReadRecords('Distance', { timeRangeFilter });
        const maxMeters = extractMaxByOrigin(records, (r) => r.distance?.inMeters || 0);
        if (maxMeters != null && maxMeters >= 0) results.distance = parseFloat((maxMeters / 1000).toFixed(2));
        console.info(`[HealthConnect] [Distance] Read ${records?.length || 0} raw records -> Result: ${results.distance} km`);
      } else {
        console.info(`[HealthConnect] [Distance] OS Aggregate -> Result: ${results.distance} km`);
      }
    } catch (e) {
      console.warn('[HealthConnect] [Distance] Read error:', e?.message || e);
    }
  }

  // 3. Calories / Energy
  if (effectivePermissions.calories) {
    try {
      // Primary: Native OS aggregation
      const agg = await safeAggregate({ recordType: 'ActiveCaloriesBurned', timeRangeFilter });
      let cal = agg?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
      if ((cal == null || cal === 0) && isGranted('totalCalories')) {
        const totalAgg = await safeAggregate({ recordType: 'TotalCaloriesBurned', timeRangeFilter });
        cal = totalAgg?.ENERGY_TOTAL?.inKilocalories;
      }
      if (cal != null && cal > 0) {
        results.calories = Math.round(cal);
      }

      // Fallback: Individual record calculation
      if (results.calories == null) {
        const { records } = await safeReadRecords('ActiveCaloriesBurned', { timeRangeFilter });
        let maxCalories = extractMaxByOrigin(records, (r) => r.energy?.inKilocalories || 0);

        if ((maxCalories == null || maxCalories === 0) && isGranted('totalCalories')) {
          try {
            const { records: totalRecords } = await safeReadRecords('TotalCaloriesBurned', { timeRangeFilter });
            maxCalories = extractMaxByOrigin(totalRecords, (r) => r.energy?.inKilocalories || 0);
          } catch (e) {
            // ignore fallback
          }
        }

        if (maxCalories != null && maxCalories > 0) {
          results.calories = Math.round(maxCalories);
        }
        console.info(`[HealthConnect] [Calories] Read ${records?.length || 0} raw records -> Result: ${results.calories} kcal`);
      } else {
        console.info(`[HealthConnect] [Calories] OS Aggregate -> Result: ${results.calories} kcal`);
      }
    } catch (e) {
      console.warn('[HealthConnect] [Calories] Read error:', e?.message || e);
    }
  }

  // 4. Heart Rate
  if (effectivePermissions.heartRate) {
    try {
      let { records } = await safeReadRecords('HeartRate', { timeRangeFilter });
      if (!records || records.length === 0) {
        try {
          const fallback = await safeReadRecords('HeartRate', {
            timeRangeFilter: { operator: 'between', startTime: new Date(now.getTime() - (48 * 3600000)).toISOString(), endTime: now.toISOString() }
          });
          records = fallback?.records || [];
        } catch (err) {
          // ignore fallback error
        }
      }

      let totalBpm = 0;
      let count = 0;
      records?.forEach((record) => {
        record.samples?.forEach((sample) => {
          if (sample.beatsPerMinute) {
            totalBpm += sample.beatsPerMinute;
            count++;
          }
        });
      });
      if (count > 0) results.heartRate = Math.round(totalBpm / count);
      console.info(`[HealthConnect] [HeartRate] Read ${records?.length || 0} records (${count} samples) -> Result: ${results.heartRate} BPM`);
    } catch (e) {
      console.warn('[HealthConnect] [HeartRate] Read error:', e?.message || e);
    }
  }

  // 5. Sleep (hours from sleep sessions)
  if (effectivePermissions.sleep) {
    try {
      console.info('[HealthConnect] [Sleep] Querying SleepSession records...');
      const sleepStartTime = new Date(now.getTime() - (48 * 3600000)).toISOString(); // last 48 hrs
      let records = [];
      try {
        const res = await safeReadRecords('SleepSession', {
          timeRangeFilter: { operator: 'between', startTime: sleepStartTime, endTime: now.toISOString() }
        });
        records = res?.records || [];
      } catch (e) {
        try {
          const res = await safeReadRecords('SleepSession', {
            timeRangeFilter: { operator: 'between', startTime: '2020-01-01T00:00:00.000Z', endTime: now.toISOString() }
          });
          records = res?.records || [];
        } catch (err) {
          console.warn('[HealthConnect] [Sleep] Fallback query error:', err?.message || err);
        }
      }
      
      console.info(`[HealthConnect] [Sleep] Raw sessions count: ${records?.length || 0}`);
      if (records && records.length > 0) {
        console.info('[HealthConnect] [Sleep] Raw session records:', JSON.stringify(records));
        const sleepByOrigin = {};
        const thirtySixHoursAgo = now.getTime() - (36 * 3600000);
        
        records.forEach((record) => {
          const origin = record.metadata?.dataOrigin || 'default';
          const start = new Date(record.startTime || record.time || 0).getTime();
          const end = new Date(record.endTime || record.time || 0).getTime();
          if (end > start && end >= thirtySixHoursAgo) {
            const hours = (end - start) / 3600000;
            sleepByOrigin[origin] = (sleepByOrigin[origin] || 0) + hours;
            console.info(`[HealthConnect] [Sleep] Found session (${origin}): ${hours.toFixed(2)} hrs`);
          }
        });

        const validDurations = Object.values(sleepByOrigin).filter((h) => h > 0);
        if (validDurations.length > 0) {
          results.sleep = parseFloat(Math.max(...validDurations).toFixed(1));
        } else {
          // Pick latest recorded session duration if no session ended in recent 36h
          const sorted = [...records].sort((a, b) => new Date(a.endTime || a.startTime || 0) - new Date(b.endTime || b.startTime || 0));
          const latest = sorted[sorted.length - 1];
          const start = new Date(latest.startTime || latest.time || 0).getTime();
          const end = new Date(latest.endTime || latest.time || 0).getTime();
          if (end > start) {
            results.sleep = parseFloat(((end - start) / 3600000).toFixed(1));
          }
        }
      }
      console.info(`[HealthConnect] [Sleep] Final Sleep Result: ${results.sleep} hrs`);
    } catch (e) {
      console.warn('[HealthConnect] [Sleep] Read error:', e?.message || e);
    }
  }

  // 6. Weight (kg)
  if (effectivePermissions.weight) {
    try {
      console.info('[HealthConnect] [Weight] Querying Weight records...');
      let records = [];
      try {
        const res = await safeReadRecords('Weight', {
          timeRangeFilter: { operator: 'between', startTime: '2020-01-01T00:00:00.000Z', endTime: now.toISOString() }
        });
        records = res?.records || [];
      } catch (e) {
        try {
          const res = await safeReadRecords('Weight', {
            timeRangeFilter: { operator: 'after', startTime: '2020-01-01T00:00:00.000Z' }
          });
          records = res?.records || [];
        } catch (err) {
          console.warn('[HealthConnect] [Weight] Fallback query error:', err?.message || err);
        }
      }

      console.info(`[HealthConnect] [Weight] Raw records count: ${records?.length || 0}`);
      if (records && records.length > 0) {
        console.info('[HealthConnect] [Weight] Raw records:', JSON.stringify(records));
        const sorted = [...records].sort((a, b) => new Date(a.time || a.startTime || 0) - new Date(b.time || b.startTime || 0));
        const latestRecord = sorted[sorted.length - 1];
        const weightKg = latestRecord.weight?.inKilograms ?? latestRecord.weightInKg ?? latestRecord.weight;
        if (weightKg && typeof weightKg === 'number') results.weight = parseFloat(weightKg.toFixed(1));
        else if (latestRecord.weight?.inPounds) results.weight = parseFloat((latestRecord.weight.inPounds * 0.453592).toFixed(1));
      }
      console.info(`[HealthConnect] [Weight] Final Weight Result: ${results.weight} kg`);
    } catch (e) {
      console.warn('[HealthConnect] [Weight] Read error:', e?.message || e);
    }
  }

  // 7. Height (cm)
  if (effectivePermissions.height) {
    try {
      console.info('[HealthConnect] [Height] Querying Height records...');
      let records = [];
      try {
        const res = await safeReadRecords('Height', {
          timeRangeFilter: { operator: 'between', startTime: '2020-01-01T00:00:00.000Z', endTime: now.toISOString() }
        });
        records = res?.records || [];
      } catch (e) {
        try {
          const res = await safeReadRecords('Height', {
            timeRangeFilter: { operator: 'after', startTime: '2020-01-01T00:00:00.000Z' }
          });
          records = res?.records || [];
        } catch (err) {
          console.warn('[HealthConnect] [Height] Fallback query error:', err?.message || err);
        }
      }

      console.info(`[HealthConnect] [Height] Raw records count: ${records?.length || 0}`);
      if (records && records.length > 0) {
        console.info('[HealthConnect] [Height] Raw records:', JSON.stringify(records));
        const sorted = [...records].sort((a, b) => new Date(a.time || a.startTime || 0) - new Date(b.time || b.startTime || 0));
        const latestRecord = sorted[sorted.length - 1];
        const heightMeters = latestRecord.height?.inMeters ?? (latestRecord.heightInCm ? latestRecord.heightInCm / 100 : null) ?? latestRecord.height;
        if (heightMeters && typeof heightMeters === 'number') {
          results.height = heightMeters > 3 ? Math.round(heightMeters) : Math.round(heightMeters * 100);
        }
      }
      console.info(`[HealthConnect] [Height] Final Height Result: ${results.height} cm`);
    } catch (e) {
      console.warn('[HealthConnect] [Height] Read error:', e?.message || e);
    }
  }

  // 8. Hydration / Water
  if (effectivePermissions.hydration) {
    try {
      console.info('[HealthConnect] [Hydration] Querying Hydration records...');
      let records = [];
      try {
        const res = await safeReadRecords('Hydration', { timeRangeFilter });
        records = res?.records || [];
      } catch (e) {
        try {
          const res = await safeReadRecords('Hydration', {
            timeRangeFilter: { operator: 'between', startTime: new Date(now.getTime() - (48 * 3600000)).toISOString(), endTime: now.toISOString() }
          });
          records = res?.records || [];
        } catch (err) {
          console.warn('[HealthConnect] [Hydration] Fallback query error:', err?.message || err);
        }
      }

      console.info(`[HealthConnect] [Hydration] Raw records count: ${records?.length || 0}`);
      if (records && records.length > 0) {
        console.info('[HealthConnect] [Hydration] Raw records:', JSON.stringify(records));
        const maxLiters = extractMaxByOrigin(records, (r) => r.volume?.inLiters || r.volumeInLiters || r.volume || 0);
        if (maxLiters != null && maxLiters > 0) {
          const glasses = parseFloat((maxLiters * 4).toFixed(1));
          results.water = glasses;
        }
      }
      console.info(`[HealthConnect] [Hydration] Final Water Result: ${results.water} glasses`);
    } catch (e) {
      console.warn('[HealthConnect] [Hydration] Read error:', e?.message || e);
    }
  }

  // 9. Body Fat (%)
  if (effectivePermissions.bodyFat) {
    try {
      let records = [];
      try {
        const res = await safeReadRecords('BodyFat', {
          timeRangeFilter: { operator: 'between', startTime: '2020-01-01T00:00:00.000Z', endTime: now.toISOString() }
        });
        records = res?.records || [];
      } catch (e) {
        try {
          const res = await safeReadRecords('BodyFat', {
            timeRangeFilter: { operator: 'after', startTime: '2020-01-01T00:00:00.000Z' }
          });
          records = res?.records || [];
        } catch (err) {
          console.warn('[HealthConnect] [BodyFat] Fallback query error:', err?.message || err);
        }
      }

      if (records && records.length > 0) {
        const sorted = [...records].sort((a, b) => new Date(a.time || a.startTime || 0) - new Date(b.time || b.startTime || 0));
        const latestRecord = sorted[sorted.length - 1];
        const percentage = latestRecord.percentage;
        if (percentage) results.bodyFat = parseFloat(percentage.toFixed(1));
      }
      console.info(`[HealthConnect] [BodyFat] Read ${records?.length || 0} records -> Result: ${results.bodyFat} %`);
    } catch (e) {
      console.warn('[HealthConnect] [BodyFat] Read error:', e?.message || e);
    }
  }

  // 10. Blood oxygen
  if (effectivePermissions.bloodOxygen) {
    try {
      const { records } = await safeReadRecords('OxygenSaturation', { timeRangeFilter });
      if (records && records.length > 0) {
        let totalSpO2 = 0;
        records.forEach((record) => {
          if (record.percentage) totalSpO2 += record.percentage;
        });
        results.bloodOxygen = Math.round(totalSpO2 / records.length);
      }
      console.info(`[HealthConnect] [SpO2] Read ${records?.length || 0} records -> Result: ${results.bloodOxygen} %`);
    } catch (e) {
      console.warn('[HealthConnect] [SpO2] Read error:', e?.message || e);
    }
  }

  // 11. Workout / Exercise Session
  if (effectivePermissions.workout) {
    try {
      const { records } = await safeReadRecords('ExerciseSession', { timeRangeFilter });
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
      console.info(`[HealthConnect] [Workout] Read ${records?.length || 0} sessions -> Result: ${results.workout}, Active mins: ${results.activeMinutes}`);
    } catch (e) {
      console.warn('[HealthConnect] [Workout] Read error:', e?.message || e);
    }
  }

  console.info('[HealthConnect] ✅ Sync Session Complete! Aggregated Payload:');
  console.info(JSON.stringify(results, null, 2));
  console.info('[HealthConnect] ====================================================');

  return results;
}