import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Modal, Switch, Alert, Platform, TextInput } from 'react-native';
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

const formatSteps = (steps) => (steps || steps === 0 ? Number(steps).toLocaleString() : '—');
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

function BentoCard({ children, style }) {
  const { colors } = useTheme();
  return <View style={[styles.bentoCard, { backgroundColor: colors.white, borderColor: colors.borderLight }, style]}>{children}</View>;
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
  const { weightUnit, formatWeight } = useHealthUnits();
  const { reminders: medicineReminders, getUpcomingReminders, markTaken } = useMedicineReminders();
  const today = getTodayLog();
  const upcomingMedicineReminders = useMemo(() => getUpcomingReminders(3), [getUpcomingReminders]);

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissions, setPermissions] = useState({
    steps: true,
    sleep: true,
    heartRate: true,
    calories: true,
    distance: true,
    activeMinutes: true,
    bloodOxygen: true,
    workout: true,
  });

  const [devMode, setDevMode] = useState(false);
  const [provider, setProvider] = useState('google_fit'); // 'google_fit' or 'bluetooth'
  const [clientId, setClientId] = useState('');
  
  // Bluetooth specific states
  const [bluetoothExplanationVisible, setBluetoothExplanationVisible] = useState(false);
  const [bluetoothScanVisible, setBluetoothScanVisible] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [pairingDevice, setPairingDevice] = useState(null);
  const [pairingStatus, setPairingStatus] = useState(''); // 'Scanning', 'Pairing', 'Connecting', 'Connected'
  const [scanningError, setScanningError] = useState('');

  React.useEffect(() => {
    AsyncStorage.getItem('lifio_developer_mode').then((val) => {
      if (val === 'true') {
        setDevMode(true);
      }
    });
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const token = params.get('access_token');
        if (token) {
          window.history.replaceState(null, null, window.location.pathname + window.location.search);
          Promise.all([
            AsyncStorage.getItem('pending_wearable_permissions'),
            AsyncStorage.getItem('pending_wearable_client_id')
          ]).then(([storedPerms, storedClientId]) => {
             const perms = storedPerms ? JSON.parse(storedPerms) : {
               steps: true,
               sleep: true,
               heartRate: true,
               calories: true,
               distance: true,
               activeMinutes: true,
               bloodOxygen: true,
               workout: true,
             };
             connectWatch(perms, 'google_fit', token, storedClientId || 'mock');
             showToast('Google Fit connected ✓');
          }).catch((e) => {
             console.error('Error recovering pending Google Fit settings:', e);
          });
        }
      }
    }
  }, [connectWatch]);

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConnect = async () => {
    if (provider === 'google_fit') {
      await AsyncStorage.setItem('pending_wearable_permissions', JSON.stringify(permissions));
      await AsyncStorage.setItem('pending_wearable_client_id', clientId);

      const redirectUri = Platform.OS === 'web' ? window.location.origin + '/' : 'http://localhost:8081/';
      const { getGoogleAuthUrl } = require('../../utils/googleFit');
      const authUrl = getGoogleAuthUrl(clientId, redirectUri);

      if (Platform.OS === 'web') {
        setPermissionModalVisible(false);
        showToast('Redirecting to Google Fit...');
        setTimeout(() => {
          window.location.href = authUrl;
        }, 800);
      } else {
        setPermissionModalVisible(false);
        const token = 'mock_native_google_fit_token';
        await connectWatch(permissions, 'google_fit', token, clientId || 'mock');
        showToast('Google Fit connected (Simulated) ✓');
      }
    } else if (provider === 'bluetooth') {
      setPermissionModalVisible(false);
      setBluetoothExplanationVisible(true);
    }
  };

  const startBluetoothScanFlow = async () => {
    setBluetoothExplanationVisible(false);
    setBluetoothScanVisible(true);
    setIsScanning(true);
    setBluetoothDevices([]);
    setScanningError('');
    setPairingStatus('Scanning');

    try {
      const { scanNearbyDevices } = require('../../utils/bluetoothWearable');
      const devices = await scanNearbyDevices(devMode);
      setBluetoothDevices(devices);
      if (devices.length === 0) {
        setScanningError('No Bluetooth wearables discovered. Make sure Bluetooth is enabled and devices are in pairing mode.');
      }
    } catch (e) {
      console.warn('Bluetooth scanning failed:', e);
      setScanningError(e.message || 'Bluetooth scan failed.');
      setPairingStatus('Failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePairDevice = async (device) => {
    setPairingDevice(device);
    setPairingStatus('Pairing');
    setScanningError('');
    
    try {
      const { connectToGattDevice } = require('../../utils/bluetoothWearable');
      await connectToGattDevice(device, devMode);
      
      setPairingStatus('Connecting');
      
      setTimeout(async () => {
        setPairingStatus('Connected');
        await connectWatch(
          permissions,
          'bluetooth',
          null,
          null,
          device.name,
          device.address,
          'Connected'
        );
        showToast(`${device.name} paired ✓`);
        
        setTimeout(() => {
          setBluetoothScanVisible(false);
          setPairingDevice(null);
        }, 600);
      }, 1000);
    } catch (err) {
      console.warn('Pairing failed:', err);
      setPairingStatus('Failed');
      setScanningError(err.message || 'Pairing or connection failed. Make sure device is nearby.');
      setPairingDevice(null);
    }
  };

  const handleSync = async () => {
    const isBluetooth = watchConfig?.provider === 'bluetooth';
    try {
      if (isBluetooth) {
        await updateWatchConfig({ status: 'Syncing' });
      }
      await syncWatch(devMode);
      if (isBluetooth) {
        await updateWatchConfig({ status: 'Connected' });
      }
      showToast('Wearable synced ✓');
    } catch (error) {
      if (isBluetooth) {
        await updateWatchConfig({ status: 'Connected' });
      }
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

  const sleepHours = today?.sleep || today?.watchData?.sleep || 7.23;
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

  const openTodayLog = () => {
    if (today?.id) {
      navigation.navigate('HealthLogEntry', { entryId: today.id, entry: today });
      return;
    }
    navigation.navigate('HealthLogEntry', { date: todayKey() });
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
    <Screen loading={loading} contentStyle={styles.screenContent}>
      <AppHeader title="Health" />

      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>Today - {displayDate(todayKey(), 'MMM d')}</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Daily health overview</Text>
        </View>
        <Pressable
          onPress={openTodayLog}
          style={[styles.iconButton, { backgroundColor: colors.accentLight.health }]}
        >
          <Ionicons name="add" size={22} color={colors.health} />
        </Pressable>
      </View>

      {/* Smartwatch Integration Status / Sync Banner */}
      {watchConfig && watchConfig.connected ? (
        <View style={[styles.syncStatusBar, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}>
          <View style={styles.rowAlign}>
            <Ionicons name="bluetooth" size={16} color={colors.health} style={{ marginRight: 6 }} />
            <Text style={[styles.syncStatusText, { color: colors.health }]} numberOfLines={1}>
              {watchConfig.provider === 'google_fit' ? 'Google Fit' : watchConfig.deviceName || 'Wearable'} · Synced {watchConfig.lastSynced ? new Date(watchConfig.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </Text>
          </View>
          <View style={styles.syncStatusButtons}>
            <Pressable onPress={handleSync} style={styles.syncMiniBtn}>
              <Ionicons name="sync-outline" size={14} color={colors.health} />
            </Pressable>
            <Pressable onPress={disconnectWatch} style={styles.syncMiniBtn}>
              <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setPermissionModalVisible(true)}
          style={[styles.syncStatusBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <View style={styles.rowAlign}>
            <Ionicons name="watch-outline" size={16} color={colors.textHint} style={{ marginRight: 6 }} />
            <Text style={[styles.syncStatusText, { color: colors.textSecondary }]}>
              No wearable connected. Tap to link your Smartwatch.
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={14} color={colors.textHint} />
        </Pressable>
      )}

      {/* Redesigned Bento Grid Panel matching Reference Image */}
      <View style={styles.grid}>
        {/* Row 1: Steps Today (Wide), Heart Rate (Compact), SpO2 (Compact) */}
        <View style={styles.gridRow}>
          {/* Steps Today Card */}
          <BentoCard style={styles.stepsCard}>
            <View style={styles.stepsHeader}>
              <View style={styles.stepsTitleContainer}>
                <View style={styles.cardHeaderTitleRow}>
                  <Ionicons name="footsteps-outline" size={16} color={colors.health} style={{ marginRight: 6 }} />
                  <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Steps today</Text>
                </View>
                <Text style={[styles.largeValue, { color: colors.textPrimary }]}>
                  {formatSteps(today?.steps || today?.watchData?.steps || 0)}
                  <Text style={[styles.goalText, { color: colors.textSecondary }]}>/{formatStepsGoal(goals.steps)}</Text>
                </Text>
                <Text style={[styles.goalSubtext, { color: colors.textSecondary }]}>
                  {percent(today?.steps || today?.watchData?.steps || 0, goals.steps)}% of daily goal
                </Text>
              </View>
              <View style={styles.stepsBarsContainer}>
                <MiniBars logs={logs} field="steps" goal={goals.steps} />
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceTint, marginTop: 12 }]}>
              <View style={[styles.progressFill, { width: `${percent(today?.steps || today?.watchData?.steps || 0, goals.steps)}%`, backgroundColor: colors.health }]} />
            </View>
          </BentoCard>

          <View style={styles.compactColumn}>
            {/* Heart Rate Card */}
            <BentoCard style={styles.compactCard}>
              <View style={styles.cardHeaderTitleRow}>
                <Ionicons name="heart-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Heart rate</Text>
              </View>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {today?.watchData?.heartRate || 72} <Text style={styles.compactUnit}>bpm</Text>
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Resting · 58 avg</Text>
              <View style={[styles.bottomIndicator, { backgroundColor: colors.danger }]} />
            </BentoCard>

            {/* SpO2 Card */}
            <BentoCard style={styles.compactCard}>
              <View style={styles.cardHeaderTitleRow}>
                <Ionicons name="speedometer-outline" size={16} color={colors.tealMid} style={{ marginRight: 6 }} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>SpO2</Text>
              </View>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {today?.watchData?.bloodOxygen || 97} <Text style={styles.compactUnit}>%</Text>
              </Text>
              <Text style={[styles.meta, { color: colors.tealMid }]}>Normal range</Text>
              <View style={[styles.bottomIndicator, { backgroundColor: colors.tealMid }]} />
            </BentoCard>
          </View>
        </View>

        {/* Row 2: Last night's sleep (Wide), Calories (Compact), Hydration (Compact) */}
        <View style={styles.gridRow}>
          {/* Last Night's Sleep Card */}
          <BentoCard style={styles.stepsCard}>
            <View style={styles.sleepHeader}>
              <View style={styles.flexOne}>
                <View style={styles.cardHeaderTitleRow}>
                  <Ionicons name="moon-outline" size={16} color={colors.habits} style={{ marginRight: 6 }} />
                  <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Last night's sleep</Text>
                </View>
                <Text style={[styles.largeValue, { color: colors.textPrimary }]}>
                  {sleepVal.hours}h {sleepVal.minutes}m
                </Text>
                <Text style={[styles.goalSubtext, { color: colors.textSecondary }]}>
                  11:02 pm → 6:16 am
                </Text>
              </View>
              <View style={styles.sleepScoreContainer}>
                <Text style={[styles.sleepScoreValue, { color: colors.habits }]}>{sleepVal.score}</Text>
                <Text style={[styles.sleepScoreLabel, { color: colors.textSecondary }]}>score</Text>
              </View>
            </View>

            {/* Sleep Stages Bar */}
            <View style={styles.sleepStagesBar}>
              <View style={[styles.sleepStageSegment, { flex: 1.5, backgroundColor: colors.chartSleepDeep }]}><Text style={[styles.sleepStageLetter, { color: colors.onAccent }]}>W</Text></View>
              <View style={[styles.sleepStageSegment, { flex: 3, backgroundColor: colors.chartSleepAwake }]}><Text style={[styles.sleepStageLetter, { color: colors.onAccent }]}>D</Text></View>
              <View style={[styles.sleepStageSegment, { flex: 2, backgroundColor: colors.tealMid }]}><Text style={[styles.sleepStageLetter, { color: colors.onAccent }]}>R</Text></View>
              <View style={[styles.sleepStageSegment, { flex: 2.5, backgroundColor: colors.health }]}><Text style={[styles.sleepStageLetter, { color: colors.onAccent }]}>L</Text></View>
              <View style={[styles.sleepStageSegment, { flex: 1, backgroundColor: colors.chartSleepDeep }]}><Text style={[styles.sleepStageLetter, { color: colors.onAccent }]}>D</Text></View>
            </View>

            {/* Legends */}
            <View style={styles.sleepLegends}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.chartSleepDeep }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Deep {sleepVal.deep}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.health }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Light {sleepVal.light}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.tealMid }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>REM {sleepVal.rem}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.chartSleepAwake }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Awake {sleepVal.awake}</Text>
              </View>
            </View>
          </BentoCard>

          <View style={styles.compactColumn}>
            {/* Calories Card */}
            <BentoCard style={styles.compactCard}>
              <View style={styles.cardHeaderTitleRow}>
                <Ionicons name="flame-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Calories</Text>
              </View>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {formatSteps(today?.watchData?.calories || 1420)} <Text style={styles.compactUnit}>kcal</Text>
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>580 remaining</Text>
              <View style={[styles.bottomIndicator, { backgroundColor: colors.warning }]} />
            </BentoCard>

            {/* Hydration Card */}
            <BentoCard style={styles.compactCard}>
              <View style={styles.cardHeaderTitleRow}>
                <Ionicons name="water-outline" size={16} color={colors.health} style={{ marginRight: 6 }} />
                <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Hydration</Text>
              </View>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {((today?.water || 7.2) * 0.25).toFixed(1)} <Text style={styles.compactUnit}>L</Text>
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>of 2.5 L goal</Text>
              <View style={[styles.bottomIndicator, { backgroundColor: colors.health }]} />
            </BentoCard>
          </View>
        </View>

        {/* Row 3: Activity Rings (Wide Card) */}
        <View style={styles.gridRow}>
          {/* Activity Rings Card */}
          <BentoCard style={styles.wideCard}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="aperture-outline" size={16} color={colors.health} style={{ marginRight: 6 }} />
              <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Activity rings</Text>
            </View>
            <View style={styles.ringsHeader}>
              <View style={styles.ringsContainer}>
                <View style={[styles.ring, { width: 90, height: 90, borderRadius: 45, borderColor: colors.chartRingMove }]} />
                <View style={[styles.ring, { width: 70, height: 70, borderRadius: 35, borderColor: colors.health, position: 'absolute' }]} />
                <View style={[styles.ring, { width: 50, height: 50, borderRadius: 25, borderColor: colors.chartRingStand, position: 'absolute' }]} />
              </View>
              <View style={styles.ringsLegends}>
                <View style={styles.ringLegendRow}>
                  <View style={[styles.ringLegendDot, { backgroundColor: colors.chartRingMove }]} />
                  <Text style={[styles.ringLegendLabel, { color: colors.textSecondary }]}>Move</Text>
                  <Text style={[styles.ringLegendValue, { color: colors.textPrimary }]}>376 / 500 cal</Text>
                </View>
                <View style={styles.ringLegendRow}>
                  <View style={[styles.ringLegendDot, { backgroundColor: colors.health }]} />
                  <Text style={[styles.ringLegendLabel, { color: colors.textSecondary }]}>Steps</Text>
                  <Text style={[styles.ringLegendValue, { color: colors.textPrimary }]}>{formatSteps(today?.steps || today?.watchData?.steps || 6241)} / {formatStepsGoal(goals.steps)}</Text>
                </View>
                <View style={styles.ringLegendRow}>
                  <View style={[styles.ringLegendDot, { backgroundColor: colors.chartRingStand }]} />
                  <Text style={[styles.ringLegendLabel, { color: colors.textSecondary }]}>Stand</Text>
                  <Text style={[styles.ringLegendValue, { color: colors.textPrimary }]}>7 / 12 hrs</Text>
                </View>
              </View>
            </View>
          </BentoCard>
        </View>

        {/* Row 4: Today's Insight Card (Wide) */}
        <View style={[styles.insightCard, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
          <Ionicons name="bulb" size={20} color={colors.info} style={{ marginRight: 10, marginTop: 2 }} />
          <View style={styles.flexOne}>
            <Text style={[styles.insightTitle, { color: colors.info }]}>Today's insight</Text>
            <Text style={[styles.insightDesc, { color: colors.textPrimary }]}>
              Your HRV is lower than usual — on high-HRV days you average 2,100 more steps. Consider a lighter session today.
            </Text>
          </View>
        </View>

        {/* Row 5: Today's Mood (Half), Supplements (Half) */}
        <View style={styles.gridRow}>
          {/* Today's Mood Card */}
          <BentoCard style={styles.halfCard}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="happy-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Today's mood</Text>
            </View>
            <Text style={[styles.moodSubtitle, { color: colors.textSecondary }]}>How are you feeling?</Text>
            <View style={styles.emojiRow}>
              {['😢', '😐', '🙂', '😆'].map((emoji, idx) => {
                const moodMap = ['Sad', 'Neutral', 'Happy', 'Excited'];
                const isSelected = today?.mood === moodMap[idx] || (!today?.mood && moodMap[idx] === 'Happy');
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleMoodSelect(moodMap[idx])}
                    style={[
                      styles.emojiBtn,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface },
                      isSelected && { backgroundColor: colors.infoBg, borderColor: colors.info, borderWidth: 2 }
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          </BentoCard>

          {/* Supplements Card */}
          <BentoCard style={styles.halfCard}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="bandage-outline" size={16} color={colors.health} style={{ marginRight: 6 }} />
              <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>Supplements</Text>
            </View>
            <View style={styles.supplementsList}>
              {[
                { name: 'Vitamin D3', checked: true },
                { name: 'Omega-3', checked: true },
                { name: 'Magnesium', checked: false }
              ].map((item, idx) => (
                <View key={idx} style={styles.supplementItem}>
                  <Ionicons
                    name={item.checked ? "checkmark-circle" : "remove-circle-outline"}
                    size={16}
                    color={item.checked ? colors.chartRingMove : colors.textHint}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.supplementName, { color: colors.textPrimary }]}>{item.name}</Text>
                </View>
              ))}
            </View>
          </BentoCard>
        </View>
      </View>

      {/* Female Health Logs & Reminders */}
      <View style={[styles.section, { marginTop: 12 }]}>
        <SectionHeader>Reminders & Summary</SectionHeader>
        
        <BentoCard style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flexOne}>
              <SectionHeader>Weekly summary</SectionHeader>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{summary.weekLogs.length} logs this week</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>Avg weight <Text style={{ color: colors.textPrimary }}>{summary.avgWeight ? (formatWeight(summary.avgWeight) || `${summary.avgWeight.toFixed(1)} kg`) : '—'}</Text></Text>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>Avg sleep <Text style={{ color: colors.textPrimary }}>{summary.avgSleep ? `${summary.avgSleep.toFixed(1)} hrs` : '—'}</Text></Text>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>Month logs <Text style={{ color: colors.textPrimary }}>{summary.monthLogs.length}</Text></Text>
          </View>
          <View style={[styles.cardHeader, { marginTop: 12 }]}>
            <View style={styles.flexOne}>
              <SectionHeader>Cycle reminder</SectionHeader>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{summary.cycle.title}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{summary.cycle.detail}</Text>
            </View>
            <View style={[styles.dateBubble, { backgroundColor: colors.accentLight.health }]}>
              <Text style={[styles.dateBubbleText, { color: colors.health }]}>{summary.cycle.nextDate || 'Off'}</Text>
            </View>
          </View>
          {summary.cycle.reminder ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{summary.cycle.reminder}</Text> : null}
        </BentoCard>

        <View style={styles.metricGrid}>
          <BentoCard style={styles.bentoCard}>
            <SectionHeader>Symptoms</SectionHeader>
            <Text style={[styles.largeValue, { color: colors.textPrimary }]}>{today?.symptoms?.length || 0}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
              {today?.symptoms?.length ? today.symptoms.join(', ') : 'No symptoms logged'}
            </Text>
          </BentoCard>
          <BentoCard style={styles.bentoCard}>
            <SectionHeader>Medication</SectionHeader>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {today?.medication || 'No supplement reminder logged'}
            </Text>
          </BentoCard>
        </View>

        <BentoCard style={styles.summaryCard}>
          <View style={styles.sectionTitleRow}>
            <SectionHeader>Medicine reminders</SectionHeader>
            <Pressable onPress={() => navigation.navigate('MedicineReminders')} style={styles.historyButton}>
              <Text style={[styles.historyText, { color: colors.health }]}>Manage</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.health} />
            </Pressable>
          </View>
          {upcomingMedicineReminders.length ? (
            <View style={styles.medicineList}>
              {upcomingMedicineReminders.map((reminder) => (
                <View key={reminder.id} style={[styles.medicineRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={styles.flexOne}>
                    <Text style={[styles.medicineName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {reminder.name}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {reminder.dosage || 'Dosage optional'} · {reminder.nextOccurrence?.label || reminder.time}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleMedicineTaken(reminder)}
                    disabled={reminder.takenToday}
                    style={[
                      styles.medicineTakenButton,
                      {
                        backgroundColor: reminder.takenToday ? colors.accentLight.health : colors.surface,
                        borderColor: reminder.takenToday ? colors.health : colors.borderLight,
                      },
                    ]}
                  >
                    <Text style={[styles.medicineTakenText, { color: reminder.takenToday ? colors.health : colors.textPrimary }]}>
                      {reminder.takenToday ? 'Taken' : 'Take'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="medkit-outline"
              message="No medicine reminders yet."
              actionLabel="+ Add reminder"
              action={() => navigation.navigate('MedicineReminders')}
              accent={colors.health}
            />
          )}
        </BentoCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <SectionHeader>Recent</SectionHeader>
          {logs.length ? (
            <Pressable onPress={() => navigation.navigate('HealthHistory')} style={styles.historyButton}>
              <Text style={[styles.historyText, { color: colors.health }]}>History</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.health} />
            </Pressable>
          ) : null}
        </View>
        {logs.length ? (
          logs.slice(0, 10).map((log) => (
            <ListRow
              key={log.id}
              title={displayDate(log.date)}
              subtitle={`${log.weight ? (formatWeight(log.weight) || `${log.weight} kg`) : '—'} · ${log.sleep || '—'} hrs · ${formatSteps(log.steps)} steps${log.mood ? ` · ${log.mood}` : ''}`}
              onPress={() => navigation.navigate('HealthDayDetail', { entryId: log.id })}
              right={
                <View style={styles.logActions}>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation?.();
                      confirmDeleteLog(log);
                    }}
                    hitSlop={8}
                    style={[styles.deleteLogButton, { backgroundColor: colors.dangerBg }]}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
                </View>
              }
            />
          ))
        ) : (
          <EmptyState
            icon="heart-outline"
            message="No logs yet. Start tracking today."
            actionLabel="+ Log today"
            action={openTodayLog}
            accent={colors.health}
          />
        )}
      </View>
      <FeatureWalkthrough screenKey="health" steps={WALKTHROUGH_STEPS.health} />

      {permissionModalVisible && (
        <Modal visible={permissionModalVisible} transparent animationType="fade" onRequestClose={() => setPermissionModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="watch-outline" size={22} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Smartwatch Connection</Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    Configure your health provider and data permissions.
                  </Text>
                </View>
              </View>

              {/* Provider Platform Selection */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Choose Provider</Text>
              <View style={styles.providerRow}>
                <Pressable
                  onPress={() => setProvider('google_fit')}
                  style={[
                    styles.providerBtn,
                    {
                      borderColor: provider === 'google_fit' ? colors.health : colors.border,
                      backgroundColor: provider === 'google_fit' ? colors.accentLight.health : colors.transparent,
                    }
                  ]}
                >
                  <Ionicons name="logo-google" size={15} color={provider === 'google_fit' ? colors.health : colors.textSecondary} />
                  <Text style={[styles.providerBtnText, { color: provider === 'google_fit' ? colors.health : colors.textPrimary }]}>Google Fit</Text>
                </Pressable>
                <Pressable
                  onPress={() => setProvider('bluetooth')}
                  style={[
                    styles.providerBtn,
                    {
                      borderColor: provider === 'bluetooth' ? colors.health : colors.border,
                      backgroundColor: provider === 'bluetooth' ? colors.accentLight.health : colors.transparent,
                    }
                  ]}
                >
                  <Ionicons name="bluetooth" size={15} color={provider === 'bluetooth' ? colors.health : colors.textSecondary} />
                  <Text style={[styles.providerBtnText, { color: provider === 'bluetooth' ? colors.health : colors.textPrimary }]}>Bluetooth</Text>
                </Pressable>
              </View>

              {provider === 'google_fit' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Google Client ID</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="Paste OAuth Client ID here..."
                    placeholderTextColor={colors.textHint}
                    value={clientId}
                    onChangeText={setClientId}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={[styles.inputHelp, { color: colors.textHint }]}>
                    Leave empty to test with mock accounts.
                  </Text>
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Permissions</Text>
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
                  <Text style={[styles.modalBtnText, { color: colors.health }]}>Connect</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bluetooth Permission Explanation Modal */}
      {bluetoothExplanationVisible && (
        <Modal visible={bluetoothExplanationVisible} transparent animationType="fade" onRequestClose={() => setBluetoothExplanationVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="bluetooth" size={24} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Bluetooth Permission</Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    Why does Lifio request Bluetooth access?
                  </Text>
                </View>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary, fontSize: 13, lineHeight: 18 }]}>
                Lifio requires Bluetooth access to scan for nearby smartwatches, fitness bands, and rings, establish a secure local pairing channel, and periodically synchronize your active steps, distance, calories, sleep logs, and heart rate metrics directly from the device.
              </Text>
              <View style={styles.modalButtonsRow}>
                <Pressable
                  onPress={() => setBluetoothExplanationVisible(false)}
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Deny</Text>
                </Pressable>
                <Pressable
                  onPress={startBluetoothScanFlow}
                  style={[styles.modalBtn, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.health }]}>Allow & Scan</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bluetooth Scan / Pairing Modal */}
      {bluetoothScanVisible && (
        <Modal visible={bluetoothScanVisible} transparent animationType="fade" onRequestClose={() => setBluetoothScanVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="bluetooth" size={24} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {pairingDevice ? 'Establishing Link' : 'Bluetooth Scan'}
                  </Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    {pairingDevice ? `Status: ${pairingStatus}...` : 'Searching for nearby wearable devices...'}
                  </Text>
                </View>
              </View>

              {pairingDevice ? (
                <View style={styles.pairingContainer}>
                  <Text style={[styles.pairingText, { color: colors.textPrimary }]}>
                    Connecting to <Text style={{ fontWeight: '800' }}>{pairingDevice.name}</Text>
                  </Text>
                  <Text style={[styles.pairingSub, { color: colors.textSecondary }]}>
                    Please keep your device close and discoverable.
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.health,
                          width: pairingStatus === 'Pairing' ? '35%' : pairingStatus === 'Connecting' ? '70%' : '100%',
                        }
                      ]}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.devicesListContainer}>
                  {isScanning ? (
                    <View style={styles.scanLoading}>
                      <Ionicons name="sync-outline" size={24} color={colors.health} style={{ marginBottom: 8 }} />
                      <Text style={[styles.meta, { color: colors.textSecondary, marginTop: 8 }]}>Scanning for active signals...</Text>
                    </View>
                  ) : scanningError ? (
                    <View style={styles.scanLoading}>
                      <Ionicons name="alert-circle-outline" size={28} color={colors.danger} style={{ marginBottom: 8 }} />
                      <Text style={[styles.meta, { color: colors.textSecondary, textAlign: 'center', marginHorizontal: 12 }]}>{scanningError}</Text>
                    </View>
                  ) : bluetoothDevices.length ? (
                    <View style={styles.devicesList}>
                      {bluetoothDevices.map((device) => (
                        <Pressable
                          key={device.id}
                          onPress={() => handlePairDevice(device)}
                          style={({ pressed }) => [
                            styles.deviceItem,
                            {
                              borderColor: colors.borderLight,
                              backgroundColor: pressed ? colors.surface : colors.white,
                            }
                          ]}
                        >
                          <View style={styles.deviceItemInfo}>
                            <Ionicons name="watch-outline" size={20} color={colors.health} />
                            <View>
                              <Text style={[styles.deviceNameText, { color: colors.textPrimary }]}>{device.name}</Text>
                              <Text style={[styles.deviceAddressText, { color: colors.textHint }]}>{device.address}</Text>
                            </View>
                          </View>
                          <View style={[styles.pairBadge, { backgroundColor: colors.accentLight.health }]}>
                            <Text style={[styles.pairBadgeText, { color: colors.health }]}>Pair</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.meta, { color: colors.textHint, textAlign: 'center', marginVertical: 12 }]}>
                      No Bluetooth wearables discovered. Make sure Bluetooth is enabled and devices are in pairing mode.
                    </Text>
                  )}
                </View>
              )}

              {!pairingDevice && (
                <View style={styles.modalButtonsRow}>
                  <Pressable
                    onPress={() => setBluetoothScanVisible(false)}
                    style={[styles.modalBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={startBluetoothScanFlow}
                    disabled={isScanning}
                    style={[styles.modalBtn, { backgroundColor: colors.accentLight.health, borderColor: colors.health, opacity: isScanning ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.health }]}>Rescan</Text>
                  </Pressable>
                </View>
              )}
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
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bentoCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 10,
    minHeight: 118,
    padding: 14,
    ...SHADOWS.subtle,
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
  insightCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginVertical: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 11,
    lineHeight: 15,
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
});
