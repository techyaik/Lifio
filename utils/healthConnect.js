import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';

/**
 * Initialize Health Connect Client
 */
export async function initializeHealthConnect() {
  try {
    const isInitialized = await initialize();
    return isInitialized;
  } catch (e) {
    console.error('Failed to initialize Health Connect:', e);
    return false;
  }
}

/**
 * Request permissions based on the requested metrics
 */
export async function requestHealthPermissions(requestedPermissions) {
  const permissions = [];
  
  if (requestedPermissions.steps) permissions.push({ accessType: 'read', recordType: 'Steps' });
  if (requestedPermissions.distance) permissions.push({ accessType: 'read', recordType: 'Distance' });
  if (requestedPermissions.calories) permissions.push({ accessType: 'read', recordType: 'ActiveCaloriesBurned' });
  if (requestedPermissions.heartRate) permissions.push({ accessType: 'read', recordType: 'HeartRate' });
  if (requestedPermissions.sleep) permissions.push({ accessType: 'read', recordType: 'SleepSession' });
  if (requestedPermissions.bloodOxygen) permissions.push({ accessType: 'read', recordType: 'OxygenSaturation' });
  if (requestedPermissions.workout) permissions.push({ accessType: 'read', recordType: 'ExerciseSession' });

  if (permissions.length === 0) return true;

  try {
    const granted = await requestPermission(permissions);
    return granted.length > 0;
  } catch (e) {
    console.error('Failed to request Health Connect permissions:', e);
    return false;
  }
}

/**
 * Fetch health data for the current day
 */
export async function fetchHealthConnectData(permissions) {
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);
  
  const endTime = new Date();
  endTime.setHours(23, 59, 59, 999);
  
  const timeRangeFilter = {
    operator: 'between',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };

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

  try {
    // 1. Steps
    if (permissions.steps) {
      const { records } = await readRecords('Steps', { timeRangeFilter });
      const totalSteps = records.reduce((sum, record) => sum + (record.count || 0), 0);
      if (records.length > 0) results.steps = totalSteps;
    }

    // 2. Distance
    if (permissions.distance) {
      const { records } = await readRecords('Distance', { timeRangeFilter });
      const totalDistance = records.reduce((sum, record) => sum + (record.distance?.inMeters || 0), 0);
      if (records.length > 0) results.distance = parseFloat((totalDistance / 1000).toFixed(2));
    }

    // 3. Calories
    if (permissions.calories) {
      const { records } = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      const totalCalories = records.reduce((sum, record) => sum + (record.energy?.inKilocalories || 0), 0);
      if (records.length > 0) results.calories = Math.round(totalCalories);
    }

    // 4. Heart Rate (Average)
    if (permissions.heartRate) {
      const { records } = await readRecords('HeartRate', { timeRangeFilter });
      let totalBpm = 0;
      let count = 0;
      records.forEach(record => {
        record.samples?.forEach(sample => {
          totalBpm += sample.beatsPerMinute;
          count++;
        });
      });
      if (count > 0) results.heartRate = Math.round(totalBpm / count);
    }

    // 5. Sleep Session
    if (permissions.sleep) {
      const { records } = await readRecords('SleepSession', { timeRangeFilter });
      let totalSleepMillis = 0;
      records.forEach(record => {
        const start = new Date(record.startTime).getTime();
        const end = new Date(record.endTime).getTime();
        totalSleepMillis += (end - start);
      });
      if (records.length > 0) results.sleep = parseFloat((totalSleepMillis / 3600000).toFixed(1));
    }

    // 6. Blood Oxygen
    if (permissions.bloodOxygen) {
      const { records } = await readRecords('OxygenSaturation', { timeRangeFilter });
      let totalSpO2 = 0;
      records.forEach(record => {
        totalSpO2 += record.percentage;
      });
      if (records.length > 0) results.bloodOxygen = Math.round(totalSpO2 / records.length);
    }

    // 7. Workout / Exercise Session
    if (permissions.workout) {
      const { records } = await readRecords('ExerciseSession', { timeRangeFilter });
      if (records.length > 0) {
        // Just take the most prominent session type string (e.g. 71 for walking etc.)
        const latestSession = records[records.length - 1];
        // The API returns an exerciseType (number). You map it to string, here we just return the ID or a generic string.
        // E.g., exerciseType === 79 is walking, 56 is running.
        const typeStr = latestSession.exerciseType === 79 ? 'Walking' : 
                        latestSession.exerciseType === 56 ? 'Running' : 
                        latestSession.exerciseType === 8 ? 'Biking' : 'Workout';
        results.workout = typeStr;
        
        // Bonus: estimate active minutes from exercise sessions
        let totalActiveMillis = 0;
        records.forEach(record => {
           const start = new Date(record.startTime).getTime();
           const end = new Date(record.endTime).getTime();
           totalActiveMillis += (end - start);
        });
        results.activeMinutes = Math.round(totalActiveMillis / 60000);
      }
    }
  } catch (error) {
    console.error('Error fetching Health Connect records:', error);
  }

  return results;
}
