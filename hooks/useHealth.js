import { useMemo, useState, useEffect, useCallback } from 'react';
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
    setWatchConfig(null);
    await AsyncStorage.removeItem(WATCH_CONFIG_KEY);
  };

  const syncWatch = async (devMode = false, configOverride = null) => {
    const config = configOverride || watchConfig;
    if (!config || !config.connected) return;

    let syncedMetrics = null;

    if (devMode) {
      console.log('[DevMode] Injecting mock Health Connect data.');
      syncedMetrics = {
        steps: config.permissions.steps ? 8432 : null,
        distance: config.permissions.distance ? 6.2 : null,
        activeMinutes: config.permissions.activeMinutes ? 45 : null,
        calories: config.permissions.calories ? 342 : null,
        heartRate: config.permissions.heartRate ? 72 : null,
        sleep: config.permissions.sleep ? 7.5 : null,
        bloodOxygen: config.permissions.bloodOxygen ? 98 : null,
        workout: config.permissions.workout ? 'Running' : null,
      };
    } else if (config.provider === 'health_connect') {
      try {
        syncedMetrics = await fetchHealthConnectData(config.permissions);
      } catch (err) {
        console.warn('Error fetching Health Connect data, returning zeroed state:', err);
        // On failure, return zeroed metrics based on permissions
        syncedMetrics = {
          steps: config.permissions.steps ? 0 : null,
          distance: config.permissions.distance ? 0 : null,
          activeMinutes: config.permissions.activeMinutes ? 0 : null,
          calories: config.permissions.calories ? 0 : null,
          heartRate: config.permissions.heartRate ? 0 : null,
          sleep: config.permissions.sleep ? 0 : null,
          bloodOxygen: config.permissions.bloodOxygen ? 0 : null,
          workout: config.permissions.workout ? 'None' : null,
        };
      }
    }

    if (!syncedMetrics) {
      return;
    }

    const todayDate = todayKey();
    const existingToday = items.find((log) => log.date === todayDate);

    const reconcileField = (existingRecord, field, syncedValue) => {
      const sources = existingRecord?.sources || {};
      const isManual = sources[field] === 'MANUAL';
      
      // If user hasn't manually entered it, and we have a valid synced value, overwrite with Health Connect
      if (!isManual && syncedValue != null) {
        // Only set if > 0 so we don't overwrite null with 0
        if (syncedValue > 0) {
           return { value: syncedValue, source: 'HEALTH_CONNECT' };
        }
      }
      return { value: existingRecord?.[field] ?? null, source: sources[field] || null };
    };

    let updatedLogs;
    if (existingToday) {
      updatedLogs = items.map((log) => {
        if (log.date === todayDate) {
          const stepsData = reconcileField(log, 'steps', syncedMetrics.steps);
          const sleepData = reconcileField(log, 'sleep', syncedMetrics.sleep);
          
          return {
            ...log,
            steps: stepsData.value,
            sleep: sleepData.value,
            watchData: syncedMetrics,
            sources: {
              ...(log.sources || {}),
              steps: stepsData.source,
              sleep: sleepData.source,
            }
          };
        }
        return log;
      });
    } else {
      updatedLogs = [
        ...items,
        {
          id: Date.now().toString(),
          date: todayDate,
          createdAt: new Date().toISOString(),
          steps: syncedMetrics.steps > 0 ? syncedMetrics.steps : null,
          sleep: syncedMetrics.sleep > 0 ? syncedMetrics.sleep : null,
          watchData: syncedMetrics,
          sources: {
            steps: syncedMetrics.steps > 0 ? 'HEALTH_CONNECT' : null,
            sleep: syncedMetrics.sleep > 0 ? 'HEALTH_CONNECT' : null,
          }
        },
      ];
    }

    await saveAll(updatedLogs);

    const updatedConfig = {
      ...config,
      lastSynced: new Date().toISOString(),
    };
    setWatchConfig(updatedConfig);
    await AsyncStorage.setItem(WATCH_CONFIG_KEY, JSON.stringify(updatedConfig));
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
