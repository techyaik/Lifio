import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '../storage/safeAsyncStorage';
import { useTheme } from '../theme/ThemeContext';
import { todayKey } from '../utils/dates';
import { useHealth } from './useHealth';

const CONFIG_KEY = 'water_reminder_config';
const LOGS_KEY = 'water_reminder_logs';

export const DEFAULT_WATER_CONFIG = {
  enabled: true,
  intervalMinutes: 120, // 2 hours
  startTime: '08:00',
  endTime: '22:00',
  dailyGoal: 8, // 8 glasses (2.0L)
  glassVolumeMl: 250,
};

export const INTERVAL_OPTIONS = [
  { label: 'Every 30m', minutes: 30 },
  { label: 'Every 1 hr', minutes: 60 },
  { label: 'Every 1.5 hrs', minutes: 90 },
  { label: 'Every 2 hrs', minutes: 120 },
  { label: 'Every 3 hrs', minutes: 180 },
  { label: 'Every 4 hrs', minutes: 240 },
];

export const GOAL_OPTIONS = [
  { label: '6 Glasses (1.5L)', glasses: 6 },
  { label: '8 Glasses (2.0L)', glasses: 8 },
  { label: '10 Glasses (2.5L)', glasses: 10 },
  { label: '12 Glasses (3.0L)', glasses: 12 },
];

export function useWaterReminders() {
  const { dataVersion, triggerDataRefresh } = useTheme();
  const { getTodayLog, addLog, updateLog } = useHealth();
  const [config, setConfig] = useState(DEFAULT_WATER_CONFIG);
  const [waterLogs, setWaterLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const rawConfig = await AsyncStorage.getItem(CONFIG_KEY);
      if (rawConfig) {
        setConfig({ ...DEFAULT_WATER_CONFIG, ...JSON.parse(rawConfig) });
      }

      const rawLogs = await AsyncStorage.getItem(LOGS_KEY);
      if (rawLogs) {
        setWaterLogs(JSON.parse(rawLogs));
      } else {
        setWaterLogs([]);
      }
    } catch (e) {
      console.error('Error loading water reminders:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const updateConfig = async (newConfig) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    triggerDataRefresh();
  };

  const todayLogs = useMemo(() => {
    const key = todayKey();
    return waterLogs.filter((item) => item.date === key).sort((a, b) => b.timestamp - a.timestamp);
  }, [waterLogs]);

  const todayDrankGlasses = useMemo(() => {
    return todayLogs.reduce((sum, item) => sum + (item.glasses || 1), 0);
  }, [todayLogs]);

  const logWaterDrank = async (glasses = 1) => {
    const now = new Date();
    const newEntry = {
      id: Date.now().toString(),
      date: todayKey(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      glasses,
    };

    const updatedLogs = [...waterLogs, newEntry];
    setWaterLogs(updatedLogs);
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));

    // Sync water count to Health Log
    const todayLog = getTodayLog();
    const currentWater = todayLog?.water || 0;
    const newTotalWater = Math.max(0, currentWater + glasses);

    if (todayLog) {
      await updateLog(todayLog.id, { water: newTotalWater });
    } else {
      await addLog({
        id: Date.now().toString(),
        date: todayKey(),
        water: newTotalWater,
        createdAt: new Date().toISOString(),
      });
    }

    triggerDataRefresh();
    return newTotalWater;
  };

  const undoWaterDrank = async () => {
    if (todayLogs.length === 0) return;
    const lastEntry = todayLogs[0];
    const updatedLogs = waterLogs.filter((item) => item.id !== lastEntry.id);
    setWaterLogs(updatedLogs);
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));

    const todayLog = getTodayLog();
    const currentWater = todayLog?.water || 0;
    const newTotalWater = Math.max(0, currentWater - (lastEntry.glasses || 1));

    if (todayLog) {
      await updateLog(todayLog.id, { water: newTotalWater });
    }
    triggerDataRefresh();
  };

  const nextReminderLabel = useMemo(() => {
    if (!config.enabled) return 'Reminders disabled';
    const now = new Date();
    const [startH, startM] = config.startTime.split(':').map(Number);
    const [endH, endM] = config.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes < startMinutes) {
      return `Next at ${config.startTime}`;
    }
    if (currentMinutes >= endMinutes) {
      return `Done for today (Resumes ${config.startTime})`;
    }

    const elapsed = currentMinutes - startMinutes;
    const nextOffset = Math.ceil(elapsed / config.intervalMinutes) * config.intervalMinutes;
    const nextMinutes = startMinutes + nextOffset;

    if (nextMinutes >= endMinutes) {
      return `Last reminder at ${config.endTime}`;
    }

    const nextH = Math.floor(nextMinutes / 60);
    const nextM = nextMinutes % 60;
    const timeStr = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
    return `Next at ${timeStr}`;
  }, [config]);

  return {
    config,
    waterLogs,
    todayLogs,
    todayDrankGlasses,
    loading,
    updateConfig,
    logWaterDrank,
    undoWaterDrank,
    nextReminderLabel,
  };
}
