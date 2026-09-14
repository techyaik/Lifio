import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text as RNText, View, Modal, Switch, Alert, Platform, AppState, ScrollView, TextInput as RNTextInput, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { AppText as Text } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  differenceInCalendarDays,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import AsyncStorage from '../../storage/safeAsyncStorage';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { FeatureWalkthrough } from '../../components/FeatureWalkthrough';
import { ListRow } from '../../components/Rows';
import { MetricCard } from '../../components/MetricCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { useHealth } from '../../hooks/useHealth';
import { useMedicineReminders } from '../../hooks/useMedicineReminders';
import { useHealthUnits } from '../../hooks/useHealthUnits';
import { displayDate, todayKey } from '../../utils/dates';
import { showToast } from '../../utils/feedback';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { WALKTHROUGH_STEPS } from '../../constants/walkthroughs';
import { scheduleCycleReminderNotification } from '../../utils/cycleNotifications';

const formatSteps = (steps) => (steps || steps === 0 ? Number(steps).toLocaleString() : '—');

const PERMISSION_LABELS = {
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
const percent = (value, goal) => {
  const parsedValue = Number(value) || 0;
  const parsedGoal = Number(goal) || 0;
  if (!parsedGoal) return 0;
  return Math.min(100, Math.round((parsedValue / parsedGoal) * 100));
};
const average = (items, key) => {
  const values = items.map((item) => Number(item[key])).filter((value) => !Number.isNaN(value) && value > 0);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const HEALTH_TIPS = [
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

const getDailyTip = () => {
  const key = todayKey(); 
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HEALTH_TIPS[Math.abs(hash) % HEALTH_TIPS.length];
};

function BentoCard({ children, style }) {
  const { colors } = useTheme();
  return <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }, style]}>{children}</View>;
}

function ProgressLine({ label, value, detail, color }) {
  const { colors } = useTheme();
  return (
    <View style={styles.progressLine}>
      <View style={styles.progressTop}>
        <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceTint }]}>
        <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MiniBars({ logs, field, goal }) {
  const { colors } = useTheme();
  const recent = [...logs].slice(0, 7).reverse();
  const data = recent.length ? recent : Array.from({ length: 7 }, (_, index) => ({ id: String(index), [field]: 0 }));
  return (
    <View style={styles.miniBars}>
      {data.map((item, index) => {
        const height = Math.max(8, Math.min(46, percent(item[field], goal || Math.max(...data.map((d) => Number(d[field]) || 0), 1)) * 0.46));
        return <View key={item.id || index} style={[styles.miniBar, { height, backgroundColor: index === data.length - 1 ? colors.health : colors.accentLight.health }]} />;
      })}
    </View>
  );
}

const getCycleInfo = (logs) => {
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

import Svg, { Path } from 'react-native-svg';

const SourceBadge = ({ source, colors }) => {
  if (source === 'HEALTH_CONNECT') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="checkmark-circle" size={12} color={colors.pillHealth.text} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.pillHealth.text }}>Synced</Text>
      </View>
    );
  }
  if (source === 'MANUAL') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Manual</Text>
      </View>
    );
  }
  return null;
};

const HalfRingChart = ({ size = 160, strokeWidth = 24, percent = 0, color, trackColor }) => {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const path = `M ${strokeWidth/2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${cy}`;
  
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <View style={{ width: size, height: size / 2 + 10, alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + strokeWidth / 2}>
        <Path d={path} stroke={trackColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        <Path 
          d={path} 
          stroke={color} 
          strokeWidth={strokeWidth} 
          fill="none" 
          strokeLinecap="round" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
        />
      </Svg>
    </View>
  );
};

const SegmentedBar = ({ heightPct, colors, isLast }) => {
  const totalSegments = 10;
  const activeSegments = Math.round((heightPct / 100) * totalSegments);
  
  return (
    <View style={{ height: 120, width: 12, justifyContent: 'space-between' }}>
      {Array.from({ length: totalSegments }).map((_, i) => {
        const isActive = (totalSegments - i) <= activeSegments;
        return (
          <View 
            key={i} 
            style={{ 
              height: 10, 
              width: 12, 
              borderRadius: 3, 
              backgroundColor: isActive ? (isLast ? colors.primary : colors.health) : colors.surfaceTint 
            }} 
          />
        );
      })}
    </View>
  );
};

const LargeBars = ({ logs, field, goal, colors }) => {
  const recent = [...logs].slice(0, 7).reverse();
  const data = recent.length ? recent : Array.from({ length: 7 }, (_, index) => ({ id: String(index), [field]: 0 }));
  const maxVal = Math.max(...data.map((d) => Number(d[field]) || 0), goal || 1);
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', width: '100%' }}>
      {data.map((item, index) => {
        const val = Number(item[field]) || 0;
        const heightPct = Math.max(0, Math.min(100, (val / maxVal) * 100));
        return (
          <View key={item.id || index} style={{ alignItems: 'center' }}>
            <SegmentedBar heightPct={heightPct} colors={colors} isLast={index === data.length - 1} />
          </View>
        );
      })}
    </View>
  );
};

export default function HealthDashboard({ navigation }) {
  const {
    logs,
    loading,
    getTodayLog,
    watchConfig,
    connectWatch,
    updateWatchConfig,
    disconnectWatch,
    syncWatch,
    addLog,
    updateLog,
    deleteLog,
    refresh,
  } = useHealth();
  const { colors, triggerDataRefresh } = useTheme();
  const insets = useSafeAreaInsets();
  const { weightUnit, formatWeight } = useHealthUnits();
  const { reminders: medicineReminders, getUpcomingReminders, markTaken } = useMedicineReminders();
  const today = getTodayLog();
  const upcomingMedicineReminders = useMemo(() => getUpcomingReminders(3), [getUpcomingReminders]);

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [moreMetricsModalVisible, setMoreMetricsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportRange, setReportRange] = useState('7'); // '7' | '30' | 'all'
  const [reportFormat, setReportFormat] = useState('summary'); // 'summary' | 'csv' | 'json'
  const [deniedModal, setDeniedModal] = useState(null);

  const generateHealthReport = useCallback((rangeDays, formatType) => {
    let filteredLogs = [...logs];
    const now = new Date();
    if (rangeDays === '7') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      filteredLogs = logs.filter((l) => {
        try { return isWithinInterval(parseISO(l.date), { start: weekStart, end: now }); }
        catch (e) { return false; }
      });
    } else if (rangeDays === '30') {
      const monthStart = startOfMonth(now);
      filteredLogs = logs.filter((l) => {
        try { return isWithinInterval(parseISO(l.date), { start: monthStart, end: now }); }
        catch (e) { return false; }
      });
    }

    if (formatType === 'json') {
      return JSON.stringify(
        {
          appName: 'Lifio Health',
          generatedAt: new Date().toISOString(),
          range: rangeDays === 'all' ? 'All Time' : `Last ${rangeDays} Days`,
          totalEntries: filteredLogs.length,
          data: filteredLogs,
        },
        null,
        2
      );
    }

    if (formatType === 'csv') {
      const headers = ['Date', 'Steps', 'Weight(kg)', 'Height(cm)', 'Sleep(hrs)', 'Water(glasses)', 'HeartRate(BPM)', 'Calories(kcal)', 'Mood'];
      const rows = filteredLogs.map((l) => [
        l.date || '',
        l.steps || 0,
        l.weight || '',
        l.height || l.watchData?.height || '',
        l.sleep || 0,
        l.water || 0,
        l.heartRate || l.watchData?.heartRate || '',
        l.calories || l.watchData?.calories || '',
        l.mood || '',
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Summary text report
    const totalSteps = filteredLogs.reduce((sum, l) => sum + (Number(l.steps) || 0), 0);
    const avgSteps = filteredLogs.length ? Math.round(totalSteps / filteredLogs.length) : 0;
    const avgSleep = average(filteredLogs, 'sleep');
    const avgWeight = average(filteredLogs, 'weight');
    const avgHeartRate = average(filteredLogs, 'heartRate');

    return (
      `=== LIFIO HEALTH DATA REPORT ===\n` +
      `Period: ${rangeDays === 'all' ? 'All Time' : `Last ${rangeDays} Days`}\n` +
      `Generated: ${displayDate(todayKey(), 'MMM d, yyyy')}\n` +
      `Total Logged Days: ${filteredLogs.length}\n\n` +
      `--- AGGREGATED STATS ---\n` +
      `• Total Steps: ${totalSteps.toLocaleString()} steps\n` +
      `• Avg Steps/Day: ${avgSteps.toLocaleString()} steps\n` +
      `• Avg Sleep: ${avgSleep ? avgSleep.toFixed(1) + ' hrs' : 'N/A'}\n` +
      `• Avg Weight: ${avgWeight ? avgWeight.toFixed(1) + ' kg' : 'N/A'}\n` +
      `• Avg Heart Rate: ${avgHeartRate ? Math.round(avgHeartRate) + ' BPM' : 'N/A'}\n\n` +
      `--- DAILY BREAKDOWN ---\n` +
      (filteredLogs.length > 0
        ? filteredLogs
            .map(
              (l) =>
                `[${l.date}] Steps: ${l.steps || 0} | Weight: ${l.weight || '--'}kg | Sleep: ${l.sleep || '--'}h | HR: ${l.heartRate || '--'} BPM`
            )
            .join('\n')
        : 'No health logs available for this period.')
    );
  }, [logs]);

  const handleExportReport = async () => {
    try {
      const reportText = generateHealthReport(reportRange, reportFormat);
      const fileName = `Lifio_Health_Report_${reportRange}D_${todayKey()}.${reportFormat === 'json' ? 'json' : reportFormat === 'csv' ? 'csv' : 'txt'}`;

      if (Platform.OS === 'web') {
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Report downloaded ✓');
      } else {
        await Share.share({
          message: reportText,
          title: 'Lifio Health Data Report',
        });
        showToast('Report shared ✓');
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      showToast('Could not export report.');
    }
  };
  const awaitingHealthConnectReturn = useRef(false);
  const requestAndLinkRef = useRef(null);
  const [permissions, setPermissions] = useState({
    steps: true,
    sleep: true,
    heartRate: true,
    calories: true,
    distance: true,
    weight: true,
    height: true,
    hydration: true,
    bodyFat: true,
    activeMinutes: true,
    bloodOxygen: true,
    workout: true,
  });

  const [devMode, setDevMode] = useState(false);
  const [clientId, setClientId] = useState('');

  React.useEffect(() => {
    AsyncStorage.getItem('lifio_developer_mode').then((val) => {
      if (val === 'true') {
        setDevMode(true);
      }
    });
  }, []);

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConnect = async () => {
    setPermissionModalVisible(false);

    if (Platform.OS === 'web' && !devMode) {
      showToast('Health Connect is only supported on Android native apps.');
      return;
    }

    await requestAndLink();
  };

  const requestAndLink = async () => {
    setDeniedModal(null);

    const {
      initializeHealthConnect,
      requestHealthPermissions,
      getHealthConnectAvailability,
      openHealthConnectStore,
    } = require('../../utils/healthConnect');

    try {
      const availability = await getHealthConnectAvailability();
      if (!availability.available) {
        if (availability.isExpoGo) {
          Alert.alert(
            'Native Build Required',
            'Google Health Connect uses native Android libraries and cannot run inside Expo Go.\n\nTo link real Health Connect data on your device, build & run the native Android app using:\n\nnpx expo run:android',
            [{ text: 'OK' }]
          );
        } else if (availability.requireUpdate) {
          Alert.alert(
            'Health Connect update required',
            'Health Connect needs to be updated before Lifio can read your health data. You can update it on the Play Store.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Update', onPress: openHealthConnectStore },
            ]
          );
        } else {
          Alert.alert(
            'Health Connect not installed',
            'Lifio reads real health data through Google Health Connect. Install it from the Play Store to continue.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Install', onPress: openHealthConnectStore },
            ]
          );
        }
        return false;
      }

      const initialized = await initializeHealthConnect();
      if (!initialized) {
        showToast('Failed to initialize Health Connect on this device.');
        return false;
      }

      const result = await requestHealthPermissions(permissions);
      return await handlePermissionResult(result);
    } catch (err) {
      console.error('Health Connect error:', err);
      showToast('Error linking Health Connect.');
      return false;
    }
  };

  const handlePermissionResult = async (result) => {
    if (!result || !result.ok) {
      if (result && result.denied && result.denied.length > 0) {
        setDeniedModal({ denied: result.denied, linked: false });
        return false;
      }
      showToast((result && result.message) || 'Permission to access Health Connect was denied.');
      return false;
    }

    const grantedConfig = { ...result.grantedKeys };
    grantedConfig.activeMinutes = !!grantedConfig.workout;
    await connectWatch(grantedConfig, 'health_connect');

    if (result.allGranted) {
      showToast('Health Connect linked ✓');
    } else {
      showToast('Health Connect linked with limited access ✓');
      setDeniedModal({ denied: result.denied, linked: true });
    }

    try {
      await syncWatch(devMode, {
        connected: true,
        lastSynced: null,
        permissions: grantedConfig,
        provider: 'health_connect',
      });
    } catch (e) {
      console.warn('Auto-sync after linking Health Connect failed:', e);
    }
    return true;
  };

  requestAndLinkRef.current = requestAndLink;

  const openHealthConnectGrant = () => {
    const { openHealthConnectSettings } = require('../../utils/healthConnect');
    awaitingHealthConnectReturn.current = true;
    try {
      openHealthConnectSettings();
    } catch (e) {
      console.warn('Failed to open Health Connect settings:', e);
    }
  };

  const continueAfterGrant = async () => {
    setDeniedModal(null);
    await requestAndLink();
  };

  const closeDeniedModal = () => setDeniedModal(null);

  const isWatchConnected = !!(watchConfig && watchConfig.connected);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (isWatchConnected) {
          syncWatch(devMode, null, false).catch((e) => console.warn('Auto sync on resume failed:', e));
        }
        if (awaitingHealthConnectReturn.current) {
          awaitingHealthConnectReturn.current = false;
          setTimeout(() => {
            if (requestAndLinkRef.current) requestAndLinkRef.current();
          }, 600);
        }
      }
    });
    return () => subscription.remove();
  }, [isWatchConnected, syncWatch, devMode]);

  useFocusEffect(
    useCallback(() => {
      if (isWatchConnected) {
        syncWatch(devMode, null, false).catch((e) => console.warn('Auto sync on focus failed:', e));
      }
    }, [isWatchConnected, syncWatch, devMode])
  );

  const handleSync = async () => {
    try {
      await syncWatch(devMode, null, true);
      showToast('Wearable synced ✓');
    } catch (error) {
      if (Platform.OS === 'web') {
        alert(error.message + '\n\nEnable Developer Mode in Settings to test simulated syncing.');
      } else {
        Alert.alert(
          'Wearable Integration',
          error.message + '\n\nEnable Developer Mode in Settings to test simulated syncing.'
        );
      }
    }
  };

  const summary = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const weekLogs = logs.filter((log) => {
      try {
        return isWithinInterval(parseISO(log.date), { start: weekStart, end: now });
      } catch (e) {
        return false;
      }
    });
    const monthLogs = logs.filter((log) => {
      try {
        return isWithinInterval(parseISO(log.date), { start: monthStart, end: now });
      } catch (e) {
        return false;
      }
    });
    return {
      weekLogs,
      monthLogs,
      avgWeight: average(weekLogs, 'weight'),
      avgSleep: average(weekLogs, 'sleep'),
      avgWater: average(weekLogs, 'water'),
      cycle: getCycleInfo(logs),
    };
  }, [logs]);

  const goals = {
    water: today?.waterGoal || 8,
    steps: today?.stepGoal || 10000,
    sleep: today?.sleepGoal || 8,
  };

  const formatStepsGoal = (goal) => {
    const num = Number(goal) || 0;
    return num >= 1000 ? `${num / 1000}k` : num;
  };

  const sleepHours = today?.sleep || today?.watchData?.sleep || 0;
  const sleepVal = useMemo(() => {
    return {
      hours: Math.floor(sleepHours),
      minutes: Math.round((sleepHours % 1) * 60),
      score: Math.min(100, Math.round(sleepHours * 11)),
      deep: `${Math.round(sleepHours * 0.25)}h`,
      light: `${Math.floor(sleepHours * 0.4)}h ${Math.round(((sleepHours * 0.4) % 1) * 60)}m`,
      rem: `${Math.floor(sleepHours * 0.25)}h ${Math.round(((sleepHours * 0.25) % 1) * 60)}m`,
      awake: `${Math.round(((sleepHours * 0.1) % 1) * 60)}m`,
    };
  }, [sleepHours]);

  const handleMoodSelect = async (mood) => {
    if (today) {
      await updateLog(today.id, { mood });
      showToast(`Mood updated to ${mood} ✓`);
    } else {
      const newLog = {
        id: Math.random().toString(36).substring(7),
        date: todayKey(),
        mood,
        createdAt: new Date().toISOString(),
      };
      await addLog(newLog);
      showToast(`Mood logged: ${mood} ✓`);
    }
  };

  const confirmDeleteLog = (log) => {
    Alert.alert('Delete log?', 'This health log will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(log.id);
            triggerDataRefresh();
            await refresh();
            showToast('Health log deleted ✓');
          } catch (error) {
            Alert.alert('Could not delete log', error.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const openTodayLog = (isCycleOnly = false) => {
    const cycleOnly = isCycleOnly === true;
    if (today?.id) {
      navigation.navigate('HealthLogEntry', { entryId: today.id, entry: today, isCycleOnly: cycleOnly });
      return;
    }
    navigation.navigate('HealthLogEntry', { date: todayKey(), isCycleOnly: cycleOnly });
  };

  const activeCycleLog = useMemo(
    () => logs.find((log) => log.cycleEnabled && log.lastPeriodStart) || logs.find((log) => log.period && (log.lastPeriodStart || log.date)) || logs.find((log) => log.cycleEnabled),
    [logs]
  );
  const isCycleTrackingOn = Boolean(activeCycleLog?.cycleEnabled);

  const handleToggleCycleTracking = async (enabled) => {
    try {
      const targetLog = activeCycleLog || today;
      const targetDate = targetLog?.date || todayKey();

      if (targetLog) {
        await updateLog(targetLog.id, {
          ...targetLog,
          cycleEnabled: enabled,
          period: enabled ? Boolean(targetLog.period || targetLog.lastPeriodStart) : false,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addLog({
          id: Date.now().toString(),
          date: targetDate,
          cycleEnabled: enabled,
          period: enabled,
          lastPeriodStart: targetDate,
          cycleLength: 28,
          periodDuration: 5,
          periodReminderDays: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (enabled) {
        const lastStart = targetLog?.lastPeriodStart || targetDate;
        await scheduleCycleReminderNotification({
          lastPeriodStart: lastStart,
          cycleLength: targetLog?.cycleLength || 28,
          periodReminderDays: targetLog?.periodReminderDays || 2,
        });
        showToast('Cycle tracking ON ✓');
      } else {
        showToast('Cycle tracking OFF');
      }

      await refresh();
      triggerDataRefresh();
    } catch (e) {
      console.error('Failed to toggle cycle tracking:', e);
      Alert.alert('Could not toggle tracking', e.message || 'Please try again.');
    }
  };

  const handleMedicineTaken = async (reminder) => {
    try {
      await markTaken(reminder.id);
      showToast(`${reminder.name} marked as taken ✓`);
    } catch (error) {
      Alert.alert('Could not update reminder', error.message || 'Please try again.');
    }
  };

  return (
    <Screen loading={loading} contentStyle={styles.screenContent} withBottomNav>
      <AppHeader title="Health" showMenu={false} showSettings={false} />

      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>Today - {displayDate(todayKey(), 'MMM d')}</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary, letterSpacing: -0.5, fontSize: 26 }]}>Daily health overview</Text>
        </View>
        <Pressable
          onPress={openTodayLog}
          style={[styles.iconButton, { backgroundColor: colors.surface, width: 44, height: 44 }]}
        >
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Smartwatch Integration Status / Sync Banner (Only shown when NOT connected) */}
      {(!watchConfig || !watchConfig.connected) && (
        <Pressable
          onPress={requestAndLink}
          style={[styles.syncStatusBar, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginBottom: 16 }]}
        >
          <View style={styles.rowAlign}>
            <Ionicons name="fitness-outline" size={16} color={colors.textHint} style={{ marginRight: 6 }} />
            <Text style={[styles.syncStatusText, { color: colors.textSecondary }]}>
              No health data source linked. Tap to connect.
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={14} color={colors.textHint} />
        </Pressable>
      )}

      {/* Redesigned Bento Grid Panel matching Reference Image */}
      
      {/* 1. Hero Card: Steps Ring + Essential Vertical Metrics */}
      <BentoCard style={{ padding: 24, marginBottom: 16, backgroundColor: colors.surfaceElevated, borderRadius: RADIUS.xl, borderWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: colors.health, padding: 8, borderRadius: 12 }}>
              <Ionicons name="footsteps" size={18} color={colors.surfaceElevated} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>Daily Progress</Text>
          </View>
          <Pressable
            onPress={() => setMoreMetricsModalVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
            accessibilityLabel="View all health metrics"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <HalfRingChart 
              size={160} 
              strokeWidth={24} 
              percent={percent(today?.steps || 0, goals.steps || 10000)}
              color={colors.pillHealth.text} 
              trackColor={colors.surfaceTint} 
            />
            <View style={{ position: 'absolute', bottom: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: -0.5 }}>{today?.steps ? formatSteps(today.steps) : '0'}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHint }}>Total Steps</Text>
            </View>
          </View>
          
          <View style={{ flex: 1, paddingLeft: 16, gap: 10 }}>
            {/* Metric 1: Body Measurements (Weight & Height) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.surfaceTint, padding: 7, borderRadius: 10 }}>
                <Ionicons name="body-outline" size={14} color={colors.pillHealth.text} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>
                  {today?.weight ? (formatWeight(today.weight) || today.weight) : '--'}
                  {today?.weight && !formatWeight(today.weight) && <Text style={{ fontSize: 10 }}> {weightUnit}</Text>}
                  <Text style={{ fontSize: 11, color: colors.textHint }}> · </Text>
                  {(today?.height || today?.watchData?.height) ? `${Math.round(today?.height || today?.watchData?.height)} cm` : '--'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textHint }}>Body (Weight & Height)</Text>
              </View>
            </View>

            {/* Metric 2: Calories (Replaces Water in Daily Progress) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.surfaceTint, padding: 7, borderRadius: 10 }}>
                <Ionicons name="flame" size={14} color="#FF6B35" />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>
                  {(today?.calories || today?.watchData?.calories) ? `${Math.round(today?.calories || today?.watchData?.calories)} kcal` : '--'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textHint }}>Calories</Text>
              </View>
            </View>

            {/* Metric 3: Sleep */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.surfaceTint, padding: 7, borderRadius: 10 }}>
                <Ionicons name="moon" size={14} color={colors.pillLearning.text} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>
                  {today?.sleep ? `${Math.floor(today.sleep)}h ${Math.round((today.sleep % 1) * 60)}m` : '--'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textHint }}>Sleep</Text>
              </View>
            </View>

            {/* Metric 4: Heart Rate */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.surfaceTint, padding: 7, borderRadius: 10 }}>
                <Ionicons name="heart" size={14} color="#FF4B4B" />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>
                  {(today?.heartRate || today?.watchData?.heartRate) ? `${today?.heartRate || today?.watchData?.heartRate} BPM` : '--'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textHint }}>Heart Rate</Text>
              </View>
            </View>
          </View>
        </View>
      </BentoCard>

      {/* 2. Cycle Tracking & Reminders Bento Card */}
      <Pressable 
        onPress={() => openTodayLog(true)}
        style={({ pressed }) => [
          {
            padding: 16,
            marginBottom: 16,
            backgroundColor: colors.surface,
            borderColor: isCycleTrackingOn ? '#FF6B8B' : colors.borderLight,
            borderRadius: RADIUS.xl,
            borderWidth: 1.5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            opacity: pressed ? 0.9 : 1,
          },
          SHADOWS.soft,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ backgroundColor: 'rgba(255, 107, 139, 0.15)', padding: 10, borderRadius: 12 }}>
            <Ionicons name="flower" size={22} color="#FF6B8B" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>Cycle Tracking</Text>
              <View style={{ backgroundColor: isCycleTrackingOn ? 'rgba(255, 107, 139, 0.2)' : colors.surfaceTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isCycleTrackingOn ? '#D81B60' : colors.textSecondary }}>
                  {isCycleTrackingOn ? (summary.cycle?.nextDate ? `Expected ${summary.cycle.nextDate}` : 'Active') : 'Inactive'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }} numberOfLines={1}>
              {isCycleTrackingOn ? (summary.cycle?.title || 'Tracking active') : 'Cycle reminders off'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textHint }} numberOfLines={1}>
              {summary.cycle?.detail || 'Tap to log period & view cycle info.'}
            </Text>
          </View>
        </View>

        {/* ON / OFF Toggle Switch */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: isCycleTrackingOn ? '#D81B60' : colors.textSecondary }}>
            {isCycleTrackingOn ? 'ON' : 'OFF'}
          </Text>
          <Switch
            value={isCycleTrackingOn}
            onValueChange={handleToggleCycleTracking}
            trackColor={{ false: colors.border || '#CBD5E1', true: '#FF6B8B' }}
            thumbColor={colors.white}
          />
        </Pressable>
      </Pressable>

      {/* 2. Middle Quick Actions */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <Pressable onPress={() => navigation.navigate('HealthHistory')} style={[{ flex: 1, minWidth: 70 }, styles.actionSquare, { backgroundColor: colors.surface }]}>
          <View style={[styles.actionIconBg, { backgroundColor: '#2D6A4F' }]}>
            <Ionicons name="time" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>History &{"\n"}Logs</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('WaterReminders')} style={[{ flex: 1, minWidth: 70 }, styles.actionSquare, { backgroundColor: colors.surface }]}>
          <View style={[styles.actionIconBg, { backgroundColor: '#0EA5E9' }]}>
            <Ionicons name="water" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Water{"\n"}Reminders</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('MedicineReminders')} style={[{ flex: 1, minWidth: 70 }, styles.actionSquare, { backgroundColor: colors.surface }]}>
          <View style={[styles.actionIconBg, { backgroundColor: '#10B981' }]}>
            <Ionicons name="medkit" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Medicine{"\n"}Reminders</Text>
        </Pressable>

        <Pressable onPress={openTodayLog} style={[{ flex: 1, minWidth: 70 }, styles.actionSquare, { backgroundColor: colors.surface }]}>
          <View style={[styles.actionIconBg, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="create" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Add{"\n"}Log</Text>
        </Pressable>
      </View>

      {/* 3. Bottom Analytics (Bar Chart section) */}
      <BentoCard style={{ padding: 24, borderRadius: RADIUS.xl, backgroundColor: colors.surface, borderWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={[styles.tipDot, { backgroundColor: colors.health }]} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Weekly Activity</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Steps · Last 7 Days</Text>
          </View>
          <Pressable
            onPress={() => setReportModalVisible(true)}
            style={({ pressed }) => [{
              backgroundColor: colors.accentLight.health,
              borderColor: colors.health,
              borderWidth: 1,
              borderRadius: RADIUS.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: pressed ? 0.75 : 1,
            }]}
            accessibilityLabel="Extract health data report"
            accessibilityRole="button"
          >
            <Ionicons name="document-text-outline" size={13} color={colors.pillHealth.text} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.pillHealth.text }}>Get Report ▾</Text>
          </Pressable>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 20, marginTop: 10 }}>
          <View style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 }}>
               {summary.weekLogs.length > 0 
                  ? Math.round(summary.weekLogs.reduce((sum, log) => sum + (Number(log.steps) || 0), 0) / summary.weekLogs.length).toLocaleString()
                  : '0'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textHint, marginTop: 4 }}>Avg Steps / day{"\n"}This week</Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.primary }} />
                 <Text style={{ fontSize: 10, color: colors.textPrimary, fontWeight: '600' }}>Actual</Text>
               </View>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.health }} />
                 <Text style={{ fontSize: 10, color: colors.textPrimary, fontWeight: '600' }}>Goal</Text>
               </View>
            </View>
          </View>
          
          <View style={{ flex: 1.5, height: '100%' }}>
             <LargeBars logs={summary.weekLogs} field="steps" goal={goals.steps || 10000} colors={colors} />
          </View>
        </View>
      </BentoCard>

      {/* Daily Tip (Moved to bottom as additional feature) */}
      <BentoCard style={[styles.tipCard, { marginTop: 16 }]}>
        <View style={styles.tipEyebrowRow}>
          <View style={[styles.tipDot, { backgroundColor: colors.info }]} />
          <Text style={[styles.tipEyebrowText, { color: colors.textSecondary }]}>Daily Tips</Text>
        </View>
        <View style={styles.tipContentRow}>
          <Ionicons name="sparkles" size={24} color={colors.info} style={styles.tipIcon} />
          <Text style={[styles.tipText, { color: colors.textPrimary }]}>
            "{getDailyTip()}"
          </Text>
        </View>
      </BentoCard>
      <FeatureWalkthrough screenKey="health" steps={WALKTHROUGH_STEPS.health} />

      {permissionModalVisible && (
        <Modal visible={permissionModalVisible} transparent animationType="fade" onRequestClose={() => setPermissionModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="fitness-outline" size={22} color={colors.pillHealth.text} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Health Data Connection</Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    Choose which health metrics Lifio will request from Google Health Connect.
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputHelp, { color: colors.textSecondary }]}>
                  Turn switches ON for the metrics you want Lifio to read and sync automatically.
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Requested Metrics</Text>
              <View style={styles.permissionsList}>
                {Object.keys(permissions).map((key) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                  return (
                    <View key={key} style={[styles.permissionItem, { borderBottomColor: colors.borderLight }]}>
                      <Text style={[styles.permissionLabel, { color: colors.textPrimary }]}>{label}</Text>
                      <Switch
                        value={permissions[key]}
                        onValueChange={() => togglePermission(key)}
                        trackColor={{ false: colors.border, true: colors.health }}
                        thumbColor={colors.white}
                      />
                    </View>
                  );
                })}
              </View>

              <View style={styles.modalButtonsRow}>
                <Pressable
                  onPress={() => setPermissionModalVisible(false)}
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConnect}
                  style={[styles.modalBtn, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.pillHealth.text }]}>Connect</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {deniedModal && (
        <Modal visible transparent animationType="fade" onRequestClose={closeDeniedModal}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, styles.deniedCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.deniedScroll}
                contentContainerStyle={styles.deniedScrollBody}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.modalHeader}>
                <View style={[styles.deniedIconWrap, { backgroundColor: colors.dangerBg }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.danger} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {deniedModal.linked ? 'Limited access' : 'Health access required'}
                  </Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    {deniedModal.linked
                      ? `Lifio is linked, but can't read ${deniedModal.denied.length === 1 ? 'this' : 'these'} yet.`
                      : 'Lifio reads your real health data through Google Health Connect. Grant access to continue.'}
                  </Text>
                </View>
              </View>

              <View style={[styles.deniedBlock, { backgroundColor: colors.dangerBg }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Permissions needed</Text>
                <View style={styles.chipRow}>
                  {deniedModal.denied.map((key) => (
                    <View key={key} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.chipText, { color: colors.textPrimary }]}>{PERMISSION_LABELS[key] || key}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.deniedSteps}>
                {[
                  'Open the Google Health Connect app',
                  'Find "Lifio" in your app list',
                  'Turn on the permissions listed above',
                  'Return to Lifio — we\u2019ll finish automatically',
                ].map((instruction, index) => (
                  <View key={instruction} style={styles.deniedStep}>
                    <View style={[styles.deniedStepNum, { backgroundColor: colors.accentLight.health }]}>
                      <Text style={[styles.deniedStepNumText, { color: colors.pillHealth.text }]}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.deniedStepText, { color: colors.textSecondary }]}>{instruction}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.deniedNote, { backgroundColor: colors.accentLight.health }]}>
                <Ionicons name="sparkles-outline" size={14} color={colors.pillHealth.text} />
                <Text style={[styles.deniedNoteText, { color: colors.pillHealth.text }]}>
                  Lifio will automatically re-check your access the moment you come back.
                </Text>
              </View>

              <View style={styles.deniedButtons}>
                <Pressable
                  onPress={openHealthConnectGrant}
                  style={[styles.modalBtn, styles.deniedPrimaryBtn, { backgroundColor: colors.health, borderColor: colors.health }]}
                >
                  <Ionicons name="open-outline" size={15} color={colors.onAccent} />
                  <Text style={[styles.modalBtnText, { color: colors.onAccent }]}>Open Health Connect</Text>
                </Pressable>
                <Pressable
                  onPress={continueAfterGrant}
                  style={[styles.modalBtn, styles.deniedSecondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.textPrimary} />
                  <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>{'I\u2019ve granted access'}</Text>
                </Pressable>
                <Pressable onPress={closeDeniedModal} style={styles.deniedNotNow}>
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Not now</Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Secondary & All Health Metrics Modal */}
      {moreMetricsModalVisible && (
        <Modal
          visible={moreMetricsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMoreMetricsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdropPress} onPress={() => setMoreMetricsModalVisible(false)} />
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'android' ? 60 : 36) }]}>
              {/* Handlebar */}
              <View style={styles.sheetHandleBar} />

              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.white }]}>Secondary Health Metrics</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.textHint }]}>Additional metrics tracked via Google Health Connect & manual logs</Text>
                </View>
                <Pressable
                  onPress={() => setMoreMetricsModalVisible(false)}
                  style={[styles.closeIconBtn, { backgroundColor: colors.surfaceTint }]}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.white} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
                {/* Secondary Metrics Grid */}
                <View style={styles.secondaryGrid}>

                  {/* Water / Hydration */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(78, 205, 196, 0.15)' }]}>
                      <Ionicons name="water" size={18} color={colors.tealLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Water / Hydration</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {today?.water ? `${((today.water) * 0.25).toFixed(1)} L (${today.water} glasses)` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Distance */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(78, 205, 196, 0.15)' }]}>
                      <Ionicons name="navigate" size={18} color="#4ECDC4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Distance</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.distance || today?.watchData?.distance) ? `${Number(today?.distance || today?.watchData?.distance).toFixed(2)} km` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Active Minutes */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(255, 209, 102, 0.15)' }]}>
                      <Ionicons name="stopwatch" size={18} color="#FFD166" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Active Minutes</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.activeMinutes || today?.watchData?.activeMinutes) ? `${Math.round(today?.activeMinutes || today?.watchData?.activeMinutes)} mins` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Blood Oxygen */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(6, 214, 160, 0.15)' }]}>
                      <Ionicons name="pulse" size={18} color="#06D6A0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Blood Oxygen (SpO2)</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.bloodOxygen || today?.watchData?.bloodOxygen) ? `${Math.round(today?.bloodOxygen || today?.watchData?.bloodOxygen)} %` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Body Fat */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(165, 102, 255, 0.15)' }]}>
                      <Ionicons name="pie-chart" size={18} color="#A566FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Body Fat</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.bodyFat || today?.watchData?.bodyFat) ? `${Number(today?.bodyFat || today?.watchData?.bodyFat).toFixed(1)} %` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Exercise / Workout */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(17, 138, 178, 0.15)' }]}>
                      <Ionicons name="barbell" size={18} color="#118AB2" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Workout / Exercise</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.workout || today?.watchData?.workout) ? `${today?.workout || today?.watchData?.workout} mins` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Height */}
                  <View style={[styles.secondaryMetricCard, { backgroundColor: colors.surfaceTint }]}>
                    <View style={[styles.secIconBox, { backgroundColor: 'rgba(156, 136, 255, 0.15)' }]}>
                      <Ionicons name="resize" size={18} color="#9C88FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.secMetricLabel, { color: colors.textHint }]}>Height</Text>
                      <Text style={[styles.secMetricValue, { color: colors.white }]}>
                        {(today?.height || today?.watchData?.height) ? `${Math.round(today?.height || today?.watchData?.height)} cm` : 'Not recorded'}
                      </Text>
                    </View>
                  </View>

                </View>

                {/* Quick actions inside bottom sheet */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Pressable
                    onPress={() => {
                      setMoreMetricsModalVisible(false);
                      handleSync();
                    }}
                    style={[styles.sheetActionBtn, { backgroundColor: colors.health }]}
                  >
                    <Ionicons name="sync" size={16} color={colors.surfaceElevated} />
                    <Text style={[styles.sheetActionBtnText, { color: colors.surfaceElevated }]}>Sync Health Connect</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setMoreMetricsModalVisible(false);
                      openTodayLog();
                    }}
                    style={[styles.sheetActionBtn, { backgroundColor: colors.surfaceTint }]}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.white} />
                    <Text style={[styles.sheetActionBtnText, { color: colors.white }]}>Log Manual Data</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Extract Health Data & Report Modal */}
      {reportModalVisible && (
        <Modal
          visible={reportModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdropPress} onPress={() => setReportModalVisible(false)} />
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'android' ? 60 : 36) }]}>
              <View style={styles.sheetHandleBar} />

              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.white }]}>Extract Health Data Report</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.textHint }]}>Export analytics, daily logs, and synced metrics</Text>
                </View>
                <Pressable
                  onPress={() => setReportModalVisible(false)}
                  style={[styles.closeIconBtn, { backgroundColor: colors.surfaceTint }]}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.white} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
                {/* 1. Range Selection */}
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.textHint, marginTop: 0 }]}>Select Time Period</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {[
                      { key: '7', label: 'Last 7 Days' },
                      { key: '30', label: 'Last 30 Days' },
                      { key: 'all', label: 'All Time' },
                    ].map((item) => (
                      <Pressable
                        key={item.key}
                        onPress={() => setReportRange(item.key)}
                        style={[
                          styles.reportChip,
                          {
                            backgroundColor: reportRange === item.key ? colors.health : colors.surfaceTint,
                            borderColor: reportRange === item.key ? colors.health : colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.reportChipText,
                            { color: reportRange === item.key ? colors.surfaceElevated : colors.white },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* 2. Format Selection */}
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.textHint, marginTop: 0 }]}>Export Format</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {[
                      { key: 'summary', label: 'Summary Text', icon: 'document-text' },
                      { key: 'csv', label: 'CSV Table', icon: 'grid' },
                      { key: 'json', label: 'JSON Data', icon: 'code' },
                    ].map((item) => (
                      <Pressable
                        key={item.key}
                        onPress={() => setReportFormat(item.key)}
                        style={[
                          styles.reportChip,
                          {
                            flex: 1,
                            backgroundColor: reportFormat === item.key ? colors.primary : colors.surfaceTint,
                            borderColor: reportFormat === item.key ? colors.primary : colors.borderLight,
                          },
                        ]}
                      >
                        <Ionicons name={item.icon} size={14} color={reportFormat === item.key ? colors.white : colors.textHint} />
                        <Text
                          style={[
                            styles.reportChipText,
                            { color: reportFormat === item.key ? colors.white : colors.white },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* 3. Live Preview Card */}
                <View style={[styles.reportPreviewCard, { backgroundColor: colors.surfaceTint, borderColor: colors.borderLight }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.pillHealth.text }}>REPORT PREVIEW</Text>
                    <Text style={{ fontSize: 11, color: colors.textHint }}>
                      {reportRange === 'all' ? 'Full History' : `Last ${reportRange} days`}
                    </Text>
                  </View>

                  <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }}>
                    <RNTextInput
                      multiline
                      editable={false}
                      value={generateHealthReport(reportRange, reportFormat)}
                      style={{
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        fontSize: 11,
                        color: colors.white,
                        lineHeight: 16,
                      }}
                    />
                  </ScrollView>
                </View>

                {/* 4. Action Button */}
                <Pressable
                  onPress={handleExportReport}
                  style={[styles.exportPrimaryBtn, { backgroundColor: colors.health }]}
                >
                  <Ionicons name="share-outline" size={18} color={colors.surfaceElevated} />
                  <Text style={[styles.exportPrimaryBtnText, { color: colors.surfaceElevated }]}>Export & Share Health Report</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroCopy: { flex: 1, gap: 3 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  iconButton: { alignItems: 'center', borderRadius: RADIUS.pill, height: 42, justifyContent: 'center', width: 42 },
  screenContent: { maxWidth: 740, width: '100%', alignSelf: 'center' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionSquare: {
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    flex: 1,
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    ...SHADOWS.soft,
  },
  actionIconBg: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bentoCard: {
    borderRadius: RADIUS.xl,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 10,
    minHeight: 140,
    padding: 20,
    ...SHADOWS.soft,
  },
  wideCard: { flexBasis: '100%' },
  summaryCard: {
    alignSelf: 'stretch',
    flexBasis: 'auto',
    flexGrow: 0,
    width: '100%',
  },
  medicineList: {
    gap: 4,
    marginTop: 6,
  },
  medicineRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '700',
  },
  medicineTakenButton: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 62,
    paddingHorizontal: 12,
  },
  medicineTakenText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  largeValue: { fontSize: 24, fontWeight: '900' },
  meta: { fontSize: 12, lineHeight: 17 },
  progressLine: { gap: 6 },
  progressTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressLabel: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  progressDetail: { fontSize: 12, flexShrink: 1 },
  progressTrack: { borderRadius: RADIUS.pill, height: 8, overflow: 'hidden' },
  progressFill: { borderRadius: RADIUS.pill, height: 8 },
  miniBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 4, height: 48 },
  miniBar: { borderRadius: 6, width: 10 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statText: { fontSize: 12, fontWeight: '600' },
  dateBubble: { alignItems: 'center', borderRadius: RADIUS.md, justifyContent: 'center', minHeight: 46, minWidth: 64, padding: 8 },
  dateBubbleText: { fontSize: 13, fontWeight: '900' },
  flexOne: { flex: 1 },
  section: { gap: 8 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  historyButton: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  historyText: { fontSize: 12, fontWeight: '600' },
  logActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  deleteLogButton: { alignItems: 'center', borderRadius: RADIUS.pill, height: 30, justifyContent: 'center', width: 30 },
  watchStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  watchStatItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  watchStatValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  watchStatLabel: {
    fontSize: 10,
  },
  watchButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  watchSyncBtn: {
    flexGrow: 1,
    flexBasis: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  watchDisconnectBtn: {
    flexGrow: 1,
    flexBasis: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  grid: {
    gap: 12,
    marginVertical: 10,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepsCard: {
    flex: 2,
    flexGrow: 2,
    flexBasis: 220,
    minHeight: 130,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    ...SHADOWS.subtle,
  },
  halfCard: {
    flex: 1,
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    ...SHADOWS.subtle,
  },
  compactColumn: {
    flex: 1,
    flexGrow: 1,
    flexBasis: 120,
    gap: 12,
  },
  compactCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
    flex: 1,
    minHeight: 88,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepsTitleContainer: {
    flex: 1.2,
    gap: 2,
  },
  stepsBarsContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalSubtext: {
    fontSize: 10,
  },
  compactValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  compactUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sleepScoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sleepScoreValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  sleepScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sleepStagesBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  sleepStageSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepStageLetter: {
    fontSize: 8,
    fontWeight: '800',
  },
  sleepLegends: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
  },
  ringsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  ringsContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    borderWidth: 8,
    borderRadius: 50,
    borderStyle: 'solid',
  },
  ringsLegends: {
    flex: 1,
    gap: 4,
  },
  ringLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ringLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ringLegendLabel: {
    fontSize: 10,
    fontWeight: '700',
    width: 34,
  },
  ringLegendValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  tipCard: {
    padding: 16,
    gap: 12,
  },
  tipEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tipContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 10,
  },
  tipIcon: {
    marginTop: -2,
    opacity: 0.9,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  moodSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 6,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 4,
  },
  emojiBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 16,
  },
  supplementsList: {
    gap: 6,
    marginTop: 8,
  },
  supplementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplementName: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncStatusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  syncMiniBtn: {
    padding: 4,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    maxWidth: 380,
    width: '100%',
    ...SHADOWS.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  permissionsList: {
    gap: 8,
    marginVertical: 4,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  permissionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  providerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  providerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputContainer: {
    gap: 4,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputHelp: {
    fontSize: 10,
  },
  deniedIconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  deniedCard: {
    maxHeight: '88%',
    padding: 0,
  },
  deniedScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  deniedScrollBody: {
    gap: 14,
    padding: 16,
  },
  deniedBlock: {
    borderRadius: RADIUS.md,
    gap: 8,
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deniedSteps: {
    gap: 8,
    marginTop: 4,
  },
  deniedStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deniedStepNum: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  deniedStepNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deniedStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  deniedButtons: {
    gap: 8,
    marginTop: 4,
  },
  deniedPrimaryBtn: {
    flexDirection: 'row',
    gap: 6,
  },
  deniedSecondaryBtn: {
    flexDirection: 'row',
    gap: 6,
  },
  deniedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deniedNoteText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  deniedNotNow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pairingContainer: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  pairingText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pairingSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  devicesListContainer: {
    marginVertical: 12,
    minHeight: 120,
    justifyContent: 'center',
  },
  scanLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  devicesList: {
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  deviceItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deviceAddressText: {
    fontSize: 11,
  },
  pairBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  pairBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropPress: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
    ...SHADOWS.soft,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryGrid: {
    gap: 10,
  },
  secondaryMetricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  secIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  secMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sheetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  sheetActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  reportChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportPreviewCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  exportPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    marginTop: 4,
    ...SHADOWS.soft,
  },
  exportPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
