import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '../storage/safeAsyncStorage';
import { parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { useStoredList } from './useStoredList';
import { todayKey } from '../utils/dates';
import { fetchHealthConnectData } from '../utils/healthConnect';
import { useTheme } from '../theme/ThemeContext';

const KEY = 'health_logs';
const WATCH_CONFIG_KEY = 'wearable_config';

export const HEALTH_MOODS = ['Great', 'Good', 'Okay', 'Low', 'Stressed'];
export const ENERGY_LEVELS = ['High', 'Steady', 'Low', 'Drained'];
export const SYMPTOMS = ['Headache', 'Cramps', 'Fatigue', 'Acne', 'Mood changes', 'Sore throat', 'Cough', 'Other'];
export const FLOW_LEVELS = ['Light', 'Medium', 'Heavy', 'Spotting'];

export function useHealth() {
  const { items, loading, saveAll, refresh } = useStoredList(KEY);
  const [watchConfig, setWatchConfig] = useState(null);
  const { dataVersion, triggerDataRefresh } = useTheme();
  // Prevents concurrent syncs from racing each other
  const isSyncingRef = useRef(false);

  const loadWatchConfig = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(WATCH_CONFIG_KEY);
      if (val) {
        const parsed = JSON.parse(val);
        setWatchConfig(parsed);
      } else {
        setWatchConfig(null);
      }
    } catch (e) {
      console.error('Error loading watch config:', e);
    }
  }, []);

  useEffect(() => {
    loadWatchConfig();
  }, [loadWatchConfig, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      loadWatchConfig();
    }, [loadWatchConfig])
  );

  const logs = useMemo(
    () => [...items].sort((a, b) => parseISO(b.date) - parseISO(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  const addLog = async (log) => {
    const nextDate = String(log?.date || '').trim();
    if (!nextDate) {
      throw new Error('Log date is required.');
    }

    await saveAll((current) => {
      const existing = current.find((item) => item.date === nextDate);
      if (existing) {
        return current.map((item) =>
          item.id === existing.id
            ? {
                ...existing,
                ...log,
                id: existing.id,
                createdAt: existing.createdAt || log.createdAt,
                updatedAt: log.updatedAt || new Date().toISOString(),
              }
            : item
        );
      }
      return [...current, log];
    });
    triggerDataRefresh();
  };
  const updateLog = async (id, updates) => {
    const nextDate = updates?.date ? String(updates.date).trim() : null;
    await saveAll((current) => {
      const duplicate = nextDate
        ? current.some((item) => item.id !== id && item.date === nextDate)
        : false;
      if (duplicate) {
        throw new Error('A health log already exists for this date.');
      }
      return current.map((log) => (log.id === id ? { ...log, ...updates } : log));
    });
    triggerDataRefresh();
  };
  const deleteLog = async (id) => {
    await saveAll((current) => current.filter((log) => log.id !== id));
    triggerDataRefresh();
  };
  const getTodayLog = () => logs.find((log) => log.date === todayKey());
  const getLogsByDate = (date) => logs.filter((log) => log.date === date);

  const connectWatch = async (permissions, provider = 'default', accessToken = null, clientId = null, deviceName = null, deviceId = null, status = null) => {
    const config = {
      connected: true,
      lastSynced: null,
      permissions,
      provider,
      accessToken,
      clientId,
      deviceName,
      deviceId,
      status,
    };
    setWatchConfig(config);
    await AsyncStorage.setItem(WATCH_CONFIG_KEY, JSON.stringify(config));
  };

  const updateWatchConfig = async (updates) => {
    if (!watchConfig) return;
    const config = { ...watchConfig, ...updates };
    setWatchConfig(config);
    await AsyncStorage.setItem(WATCH_CONFIG_KEY, JSON.stringify(config));
  };

  const disconnectWatch = async () => {
    try {
      const { revokeAllPermissions } = require('../utils/healthConnect');
      await revokeAllPermissions();
    } catch (e) {
      console.warn('Could not revoke Health Connect permissions on disconnect:', e);
    }
    setWatchConfig(null);
    await AsyncStorage.removeItem(WATCH_CONFIG_KEY);
    triggerDataRefresh();
  };

  const syncWatch = async (devMode = false, configOverride = null, force = false) => {
    const config = configOverride || watchConfig;
    if (!config || !config.connected) return;

    // Prevent concurrent syncs from racing each other
    if (isSyncingRef.current) {
      console.info('[useHealth] Skipping sync — another sync is already in progress.');
      return;
    }

    // Cooldown throttle: ignore auto-sync if last sync completed less than 15 seconds ago
    if (!force && config.lastSynced) {
      const elapsedMs = Date.now() - new Date(config.lastSynced).getTime();
      if (elapsedMs < 15000) {
        console.info(`[useHealth] Skipping auto sync (throttled, last sync was ${Math.round(elapsedMs / 1000)}s ago).`);
        return;
      }
    }

    isSyncingRef.current = true;

    try {
      // Auto-heal permissions to ensure all metrics are enabled by default
      const activePermissions = {
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
        ...(config.permissions || {}),
      };

      let syncedMetrics = null;

      if (devMode) {
        console.log('[DevMode] Injecting mock Health Connect data.');
        syncedMetrics = {
          steps: activePermissions.steps ? 8432 : null,
          distance: activePermissions.distance ? 6.2 : null,
          activeMinutes: activePermissions.activeMinutes ? 45 : null,
          calories: activePermissions.calories ? 342 : null,
          heartRate: activePermissions.heartRate ? 72 : null,
          sleep: activePermissions.sleep ? 7.5 : null,
          weight: activePermissions.weight ? 70.5 : null,
          height: activePermissions.height ? 175 : null,
          bloodOxygen: activePermissions.bloodOxygen ? 98 : null,
          workout: activePermissions.workout ? 'Running' : null,
        };
      } else if (config.provider === 'health_connect') {
        try {
          console.info('[useHealth] Requesting Health Connect metrics for enabled permissions:', activePermissions);
          syncedMetrics = await fetchHealthConnectData(activePermissions);
          console.info('[useHealth] Successfully fetched metrics from Health Connect:', syncedMetrics);
        } catch (err) {
          console.warn('[useHealth] Error fetching Health Connect data, returning zeroed state:', err);
          syncedMetrics = {
            steps: activePermissions.steps ? 0 : null,
            distance: activePermissions.distance ? 0 : null,
            activeMinutes: activePermissions.activeMinutes ? 0 : null,
            calories: activePermissions.calories ? 0 : null,
            heartRate: activePermissions.heartRate ? 0 : null,
            sleep: activePermissions.sleep ? 0 : null,
            weight: activePermissions.weight ? 0 : null,
            height: activePermissions.height ? 0 : null,
            bloodOxygen: activePermissions.bloodOxygen ? 0 : null,
            workout: activePermissions.workout ? 'None' : null,
          };
        }
      }

      if (!syncedMetrics) {
        console.info('[useHealth] No metrics to sync — skipping save.');
        return;
      }

      // Differentiate daily activity metrics (which reset daily) from profile metrics (which persist)
      const reconcileDailyField = (existingRecord, field, syncedValue) => {
        const isManual = existingRecord?.sources?.[field] === 'MANUAL';
        if (isManual) {
          return { value: existingRecord?.[field] ?? null, source: 'MANUAL' };
        }
        // Daily activity metric: reflects incoming syncedValue for today
        return {
          value: syncedValue ?? null,
          source: syncedValue != null ? 'HEALTH_CONNECT' : null,
        };
      };

      const reconcileProfileField = (existingRecord, field, syncedValue) => {
        const isManual = existingRecord?.sources?.[field] === 'MANUAL';
        if (isManual) {
          return { value: existingRecord?.[field] ?? null, source: 'MANUAL' };
        }
        if (syncedValue != null && syncedValue !== '') {
          return { value: syncedValue, source: 'HEALTH_CONNECT' };
        }
        return {
          value: existingRecord?.[field] ?? null,
          source: existingRecord?.sources?.[field] || null,
        };
      };

      // saveAll receives a function updater so it always reads from the freshest in-memory state
      await saveAll((currentLogs) => {
        const todayDate = todayKey();
        const existingToday = currentLogs.find((log) => log.date === todayDate);

        if (existingToday) {
          return currentLogs.map((log) => {
            if (log.date !== todayDate) return log;

            const stepsData = reconcileDailyField(log, 'steps', syncedMetrics.steps);
            const distanceData = reconcileDailyField(log, 'distance', syncedMetrics.distance);
            const caloriesData = reconcileDailyField(log, 'calories', syncedMetrics.calories);
            const activeMinutesData = reconcileDailyField(log, 'activeMinutes', syncedMetrics.activeMinutes);
            const heartRateData = reconcileDailyField(log, 'heartRate', syncedMetrics.heartRate);
            const sleepData = reconcileDailyField(log, 'sleep', syncedMetrics.sleep);
            const workoutVal = syncedMetrics.workout ?? (log.sources?.workout === 'MANUAL' ? log.workout : null);

            const weightData = reconcileProfileField(log, 'weight', syncedMetrics.weight);
            const heightData = reconcileProfileField(log, 'height', syncedMetrics.height);
            const waterData = reconcileDailyField(log, 'water', syncedMetrics.water);
            const bodyFatData = reconcileProfileField(log, 'bodyFat', syncedMetrics.bodyFat);
            const bloodOxygenData = reconcileProfileField(log, 'bloodOxygen', syncedMetrics.bloodOxygen);

            return {
              ...log,
              steps: stepsData.value,
              sleep: sleepData.value,
              heartRate: heartRateData.value,
              distance: distanceData.value,
              calories: caloriesData.value,
              activeMinutes: activeMinutesData.value,
              workout: workoutVal,
              weight: weightData.value,
              height: heightData.value,
              water: waterData.value,
              bodyFat: bodyFatData.value,
              bloodOxygen: bloodOxygenData.value,
              watchData: syncedMetrics,
              sources: {
                ...(log.sources || {}),
                steps: stepsData.source,
                sleep: sleepData.source,
                heartRate: heartRateData.source,
                distance: distanceData.source,
                calories: caloriesData.source,
                activeMinutes: activeMinutesData.source,
                workout: syncedMetrics.workout != null ? 'HEALTH_CONNECT' : log.sources?.workout || null,
                weight: weightData.source,
                height: heightData.source,
                water: waterData.source,
                bodyFat: bodyFatData.source,
                bloodOxygen: bloodOxygenData.source,
              },
            };
          });
        }

        // Find latest log for profile fallbacks (weight/height)
        const latestLog = currentLogs.length > 0 ? currentLogs[0] : null;

        // Create today's log ensuring today's record exists and reflects today's state
        return [
          ...currentLogs,
          {
            id: Date.now().toString(),
            date: todayDate,
            createdAt: new Date().toISOString(),
            steps: syncedMetrics.steps ?? null,
            distance: syncedMetrics.distance ?? null,
            calories: syncedMetrics.calories ?? null,
            activeMinutes: syncedMetrics.activeMinutes ?? null,
            heartRate: syncedMetrics.heartRate ?? null,
            sleep: syncedMetrics.sleep ?? null,
            workout: syncedMetrics.workout ?? null,
            weight: syncedMetrics.weight ?? latestLog?.weight ?? null,
            height: syncedMetrics.height ?? latestLog?.height ?? null,
            water: syncedMetrics.water ?? null,
            bodyFat: syncedMetrics.bodyFat ?? latestLog?.bodyFat ?? null,
            bloodOxygen: syncedMetrics.bloodOxygen ?? latestLog?.bloodOxygen ?? null,
            watchData: syncedMetrics,
            sources: {
              steps: syncedMetrics.steps != null ? 'HEALTH_CONNECT' : null,
              distance: syncedMetrics.distance != null ? 'HEALTH_CONNECT' : null,
              calories: syncedMetrics.calories != null ? 'HEALTH_CONNECT' : null,
              activeMinutes: syncedMetrics.activeMinutes != null ? 'HEALTH_CONNECT' : null,
              heartRate: syncedMetrics.heartRate != null ? 'HEALTH_CONNECT' : null,
              sleep: syncedMetrics.sleep != null ? 'HEALTH_CONNECT' : null,
              workout: syncedMetrics.workout != null ? 'HEALTH_CONNECT' : null,
              weight: syncedMetrics.weight != null ? 'HEALTH_CONNECT' : latestLog?.sources?.weight || null,
              height: syncedMetrics.height != null ? 'HEALTH_CONNECT' : latestLog?.sources?.height || null,
              water: syncedMetrics.water != null ? 'HEALTH_CONNECT' : null,
              bodyFat: syncedMetrics.bodyFat != null ? 'HEALTH_CONNECT' : latestLog?.sources?.bodyFat || null,
              bloodOxygen: syncedMetrics.bloodOxygen != null ? 'HEALTH_CONNECT' : latestLog?.sources?.bloodOxygen || null,
            },
          },
        ];
      });

      // Notify all mounted screens (Home, HealthDashboard, etc.) to re-render with fresh data
      triggerDataRefresh();

      const updatedConfig = { ...config, lastSynced: new Date().toISOString() };
      setWatchConfig(updatedConfig);
      await AsyncStorage.setItem(WATCH_CONFIG_KEY, JSON.stringify(updatedConfig));
    } finally {
      isSyncingRef.current = false;
    }
  };


  return {
    logs,
    loading,
    refresh,
    addLog,
    updateLog,
    deleteLog,
    getTodayLog,
    getLogsByDate,
    watchConfig,
    connectWatch,
    updateWatchConfig,
    disconnectWatch,
    syncWatch,
  };
}
