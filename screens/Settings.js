import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '../storage/safeAsyncStorage';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { addDays, format, subDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { InputField } from '../components/InputField';
import { getData, setData } from '../storage/storage';
import { showToast, safeConfirm } from '../utils/feedback';
import { clearMemoryCache } from '../hooks/useStoredList';
import { useWallet } from '../hooks/useWallet';
import { useHealthUnits, WEIGHT_UNITS, WATER_UNITS } from '../hooks/useHealthUnits';
import { WALKTHROUGH_STORAGE_PREFIX } from '../constants/walkthroughs';

const DUMMY_PREFIX = 'lifio_dummy_';
const DEVELOPER_PASSCODE = '8080';

const keyFor = (offset = 0) => format(addDays(new Date(), offset), 'yyyy-MM-dd');
const isoFor = (offset = 0) => addDays(new Date(), offset).toISOString();

const removeDummyItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && !String(item.id || '').startsWith(DUMMY_PREFIX));
};

async function fillDummyData() {
  const today = keyFor(0);
  const yesterday = keyFor(-1);
  const twoDaysAgo = keyFor(-2);

  const healthLogs = [
    {
      id: `${DUMMY_PREFIX}health_today`,
      date: today,
      weight: 70.2,
      sleep: 7.5,
      steps: 8320,
      water: 6,
      notes: 'Felt steady today. Short walk after lunch helped energy.',
      createdAt: isoFor(0),
    },
    {
      id: `${DUMMY_PREFIX}health_yesterday`,
      date: yesterday,
      weight: 70.4,
      sleep: 6.5,
      steps: 7200,
      water: 5,
      notes: 'Skipped the gym, walked home from work instead.',
      createdAt: isoFor(-1),
    },
    {
      id: `${DUMMY_PREFIX}health_two_days`,
      date: twoDaysAgo,
      weight: 70.1,
      sleep: 8,
      steps: 9800,
      water: 7,
      notes: '',
      createdAt: isoFor(-2),
      period: true,
    },
  ];

  const habits = [
    {
      id: `${DUMMY_PREFIX}habit_walk`,
      name: 'Morning walk',
      category: 'fitness',
      reminderTime: '07:00',
      goal: 'daily',
      createdAt: subDays(new Date(), 14).toISOString(),
    },
    {
      id: `${DUMMY_PREFIX}habit_read`,
      name: 'Read 20 mins',
      category: 'learning',
      reminderTime: '21:00',
      goal: 'daily',
      createdAt: subDays(new Date(), 10).toISOString(),
    },
    {
      id: `${DUMMY_PREFIX}habit_water`,
      name: 'Drink 8 glasses',
      category: 'health',
      reminderTime: null,
      goal: 'weekdays',
      createdAt: subDays(new Date(), 7).toISOString(),
    },
  ];

  const completions = [];
  habits.forEach((habit, habitIndex) => {
    for (let offset = -6; offset <= 0; offset += 1) {
      if (habitIndex === 2 && offset < -3) continue;
      completions.push({ habitId: habit.id, date: keyFor(offset), done: !(habitIndex === 1 && offset === -2) });
    }
  });

  const notes = [
    {
      id: `${DUMMY_PREFIX}note_ideas`,
      title: 'App ideas for 2026',
      body: 'Add AI insights, mood-based suggestions, weekly summaries, and export options.',
      tags: ['Ideas'],
      pinned: true,
      createdAt: isoFor(-3),
      updatedAt: isoFor(-1),
    },
    {
      id: `${DUMMY_PREFIX}note_grocery`,
      title: 'Grocery list',
      body: 'Milk, eggs, spinach, oats, almonds, olive oil, lemons.',
      tags: ['Personal'],
      pinned: false,
      createdAt: isoFor(-2),
      updatedAt: isoFor(-2),
    },
    {
      id: `${DUMMY_PREFIX}note_work`,
      title: 'Meeting notes — Q2 review',
      body: 'Discussed targets, health launch timeline, and weekly KPI reporting.',
      tags: ['Work'],
      pinned: false,
      createdAt: isoFor(-5),
      updatedAt: isoFor(-4),
    },
  ];

  const walletAccounts = [
    {
      id: `${DUMMY_PREFIX}ac_main`,
      name: 'Main Account',
      initialBalance: 1000.00,
      color: '#185FA5',
      icon: 'wallet-outline',
      createdAt: isoFor(-5),
    },
    {
      id: `${DUMMY_PREFIX}ac_savings`,
      name: 'Savings',
      initialBalance: 500.00,
      color: '#534AB7',
      icon: 'briefcase-outline',
      createdAt: isoFor(-5),
    },
    {
      id: `${DUMMY_PREFIX}ac_card`,
      name: 'Credit Card',
      initialBalance: 0.00,
      color: '#993C1D',
      icon: 'card-outline',
      createdAt: isoFor(-5),
    },
  ];

  const walletEntries = [
    {
      id: `${DUMMY_PREFIX}wallet_1`,
      label: 'Monthly Salary',
      cat: 'Salary',
      amount: 4500.00,
      type: 'in',
      walletId: `${DUMMY_PREFIX}ac_main`,
      date: keyFor(-3),
      paymentMethod: 'Bank Transfer',
      notes: 'Direct deposit from work.',
      createdAt: isoFor(-3),
    },
    {
      id: `${DUMMY_PREFIX}wallet_2`,
      label: 'Organic Grocery Store',
      cat: 'Food',
      amount: 142.50,
      type: 'out',
      walletId: `${DUMMY_PREFIX}ac_main`,
      date: keyFor(-2),
      paymentMethod: 'Debit Card',
      notes: '',
      createdAt: isoFor(-2),
    },
    {
      id: `${DUMMY_PREFIX}wallet_3`,
      label: 'Gas Station Fuel',
      cat: 'Transport',
      amount: 45.00,
      type: 'out',
      walletId: `${DUMMY_PREFIX}ac_card`,
      date: keyFor(-1),
      paymentMethod: 'Credit Card',
      notes: '',
      createdAt: isoFor(-1),
    },
    {
      id: `${DUMMY_PREFIX}wallet_4`,
      label: 'Savings Transfer',
      cat: 'Transfer',
      amount: 300.00,
      type: 'transfer',
      fromWalletId: `${DUMMY_PREFIX}ac_main`,
      toWalletId: `${DUMMY_PREFIX}ac_savings`,
      date: keyFor(-1),
      paymentMethod: 'Bank Transfer',
      notes: 'Auto savings transfer.',
      createdAt: isoFor(-1),
    },
    {
      id: `${DUMMY_PREFIX}wallet_5`,
      label: 'Movie Tickets & Dinner',
      cat: 'Fun',
      amount: 65.00,
      type: 'out',
      walletId: `${DUMMY_PREFIX}ac_card`,
      date: keyFor(0),
      paymentMethod: 'Credit Card',
      notes: 'Weekend night out.',
      createdAt: isoFor(0),
    },
  ];

  const existingHealth = removeDummyItems(await getData('health_logs'));
  const existingHabits = removeDummyItems(await getData('habits_list'));
  const completionsData = await getData('habits_completions');
  const existingCompletions = (Array.isArray(completionsData) ? completionsData : []).filter(
    (item) => item && !String(item.habitId || '').startsWith(DUMMY_PREFIX)
  );
  const existingNotes = removeDummyItems(await getData('notes_list'));
  const existingWallet = removeDummyItems(await getData('wallet_entries'));
  const existingAccounts = removeDummyItems(await getData('wallet_accounts'));

  await Promise.all([
    setData('health_logs', [...existingHealth, ...healthLogs]),
    setData('habits_list', [...existingHabits, ...habits]),
    setData('habits_completions', [...existingCompletions, ...completions]),
    setData('notes_list', [...existingNotes, ...notes]),
    setData('wallet_entries', [...existingWallet, ...walletEntries]),
    setData('wallet_accounts', [...existingAccounts, ...walletAccounts]),
  ]);
}

async function eraseDummyData() {
  const existingHealth = removeDummyItems(await getData('health_logs'));
  const existingHabits = removeDummyItems(await getData('habits_list'));
  const completionsData = await getData('habits_completions');
  const existingCompletions = (Array.isArray(completionsData) ? completionsData : []).filter(
    (item) => item && !String(item.habitId || '').startsWith(DUMMY_PREFIX)
  );
  const existingNotes = removeDummyItems(await getData('notes_list'));
  const existingWallet = removeDummyItems(await getData('wallet_entries'));
  const existingAccounts = removeDummyItems(await getData('wallet_accounts'));

  await Promise.all([
    setData('health_logs', existingHealth),
    setData('habits_list', existingHabits),
    setData('habits_completions', existingCompletions),
    setData('notes_list', existingNotes),
    setData('wallet_entries', existingWallet),
    setData('wallet_accounts', existingAccounts),
  ]);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SegmentedPicker({ options, value, onSelect, colors }) {
  return (
    <View style={styles.segmentedRow}>
      {options.map((option) => {
        const active = value === option.code;
        return (
          <Pressable
            key={option.code}
            onPress={() => onSelect(option.code)}
            style={[
              styles.segmentedOption,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              active && { backgroundColor: colors.accentLight.health, borderColor: colors.health },
            ]}
          >
            <Text
              style={[
                styles.segmentedLabel,
                { color: active ? colors.health : colors.textPrimary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NavRow({ icon, iconBg, iconColor, title, subtitle, onPress, colors, rightIcon = 'chevron-forward' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        { backgroundColor: pressed ? colors.surface : 'transparent' },
      ]}
    >
      {icon ? (
        <View style={[styles.navIconWrap, { backgroundColor: iconBg || colors.accentLight.health }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.health} />
        </View>
      ) : null}
      <View style={styles.navRowInfo}>
        <Text style={[styles.navRowTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.navRowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name={rightIcon} size={16} color={colors.textHint} />
    </Pressable>
  );
}

function InfoRow({ icon, iconBg, iconColor, title, subtitle, colors }) {
  return (
    <View style={styles.infoRow}>
      {icon ? (
        <View style={[styles.navIconWrap, { backgroundColor: iconBg || colors.surface }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.textSecondary} />
        </View>
      ) : null}
      <View style={styles.navRowInfo}>
        <Text style={[styles.navRowTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.navRowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Settings() {
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode, triggerDataRefresh, profileName, setProfileName } = useTheme();
  const { currency, currencies, setCurrency } = useWallet();
  const { weightUnit, waterUnit, setWeightUnit, setWaterUnit } = useHealthUnits();
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(12)).current;

  // Keys
  const DEVELOPER_MODE_KEY = 'lifio_developer_mode';
  const WALLET_CURRENCY_KEY = 'wallet_currency';
  const WALLET_PASSCODE_FALLBACK_KEY = 'lifio_wallet_passcode_fallback_v1';

  // UI state
  const [developerMode, setDeveloperMode] = useState(false);
  const [passcodeModalVisible, setPasscodeModalVisible] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState(profileName || '');
  const [nameError, setNameError] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DEVELOPER_MODE_KEY)
      .then((val) => { if (val === 'true') setDeveloperMode(true); })
      .catch((e) => console.error('Error loading developer mode:', e));
  }, []);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      setReduceMotion(Boolean(enabled));
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      entranceOpacity.setValue(1);
      entranceTranslateY.setValue(0);
      return;
    }

    entranceOpacity.setValue(0);
    entranceTranslateY.setValue(12);

    const frame = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(entranceTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => cancelAnimationFrame(frame);
  }, [entranceOpacity, entranceTranslateY, reduceMotion]);

  useEffect(() => {
    setNameDraft(profileName || '');
  }, [profileName]);

  const entranceStyle = useMemo(
    () => ({
      opacity: entranceOpacity,
      transform: [{ translateY: entranceTranslateY }],
    }),
    [entranceOpacity, entranceTranslateY]
  );

  // ── Developer Mode ──────────────────────────────────────────────────────

  const requestDeveloperMode = () => {
    setPasscode('');
    setPasscodeError('');
    setPasscodeModalVisible(true);
  };

  const enableDeveloperMode = async () => {
    if (passcode.trim() !== DEVELOPER_PASSCODE) {
      setPasscodeError('Incorrect passcode. Developer Mode remains disabled.');
      return;
    }
    setDeveloperMode(true);
    setPasscode('');
    setPasscodeError('');
    setPasscodeModalVisible(false);
    showToast('Developer Mode enabled ✓');
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, 'true');
    } catch (e) {
      console.error('Error saving developer mode:', e);
    }
  };

  const disableDeveloperMode = async () => {
    setDeveloperMode(false);
    setVersionTapCount(0);
    showToast('Developer Mode disabled');
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, 'false');
    } catch (e) {
      console.error('Error saving developer mode:', e);
    }
  };

  const handleVersionTap = () => {
    if (developerMode) return;
    const nextCount = versionTapCount + 1;
    if (nextCount >= 5) {
      setVersionTapCount(0);
      requestDeveloperMode();
      return;
    }
    setVersionTapCount(nextCount);
  };

  // ── Display Name ─────────────────────────────────────────────────────────

  const openNameModal = () => {
    setNameDraft(profileName || '');
    setNameError('');
    setNameModalVisible(true);
  };

  const saveProfileDisplayName = async () => {
    const trimmed = String(nameDraft || '').trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setNameError('Enter your name to continue.');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Use at least 2 characters.');
      return;
    }
    try {
      await setProfileName(trimmed);
      setNameModalVisible(false);
      setNameError('');
      showToast('Name updated successfully ✓');
    } catch (error) {
      console.error('[Settings] Error saving profile name:', error);
      setNameError('Could not save your name. Please try again.');
    }
  };

  // ── Developer Data Actions ────────────────────────────────────────────────

  const confirmFill = () => {
    if (!developerMode) {
      Alert.alert('Developer Mode required', 'Enable Developer Mode before loading dummy data.');
      return;
    }
    const message = 'This will populate habits, health logs, wallet transactions, and notes with realistic dummy records. Existing dummy data will be updated.';
    const runFill = async () => {
      try {
        await fillDummyData();
        clearMemoryCache();
        triggerDataRefresh();
        showToast('Dummy data added successfully ✓');
      } catch (error) {
        console.error('[Settings] Error inputting dummy data:', error);
        showToast('Could not add dummy data: ' + (error.message || 'Please try again.'));
      }
    };
    safeConfirm('Input dummy data?', message, runFill, 'Cancel', 'Input Data');
  };

  const confirmErase = () => {
    if (!developerMode) {
      Alert.alert('Developer Mode required', 'Enable Developer Mode before erasing dummy data.');
      return;
    }
    const message = 'This will permanently delete all generated Lifio dummy entries. Your own real tracked metrics and notes will not be affected.';
    const runErase = async () => {
      try {
        await eraseDummyData();
        clearMemoryCache();
        triggerDataRefresh();
        showToast('Dummy data erased successfully ✓');
      } catch (error) {
        console.error('[Settings] Error erasing dummy data:', error);
        showToast('Could not erase dummy data: ' + (error.message || 'Please try again.'));
      }
    };
    safeConfirm('Erase dummy data?', message, runErase, 'Cancel', 'Erase Dummy Data');
  };

  // ── Data & Privacy Actions ────────────────────────────────────────────────

  const exportAllData = async () => {
    try {
      const health = await getData('health_logs');
      const habits = await getData('habits_list');
      const completions = await getData('habits_completions');
      const notes = await getData('notes_list');
      const wallet = await getData('wallet_entries');
      const walletAccounts = await getData('wallet_accounts');
      const moodLogs = await getData('mood_logs');

      const allData = {
        exportedAt: new Date().toISOString(),
        app: 'Lifio',
        version: '1.0.0',
        health,
        habits,
        completions,
        notes,
        wallet,
        walletAccounts,
        moodLogs,
      };

      await Share.share({
        message: JSON.stringify(allData, null, 2),
        title: 'Lifio Data Export',
      });
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const clearAllTrackerData = () => {
    const message =
      'This will permanently remove all health logs, habits, notes, wallet history, your display name, and wallet passcode. Appearance and theme preferences will not change.';

    const runReset = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const walkthroughKeys = keys.filter((key) => key.startsWith(WALKTHROUGH_STORAGE_PREFIX));

        await Promise.all([
          setData('health_logs', []),
          setData('habits_list', []),
          setData('habits_completions', []),
          setData('notes_list', []),
          setData('wallet_entries', []),
          setData('wallet_accounts', []),
          setData('mood_logs', []),
          AsyncStorage.removeItem('wearable_config'),
          AsyncStorage.removeItem(WALLET_CURRENCY_KEY),
          AsyncStorage.removeItem(WALLET_PASSCODE_FALLBACK_KEY),
          AsyncStorage.multiRemove(walkthroughKeys),
        ]);

        try {
          const SecureStore = require('expo-secure-store');
          await SecureStore.deleteItemAsync?.('lifio_wallet_passcode_v1');
        } catch (error) {
          // Secure storage may not be available in all environments; fallback is already cleared.
        }

        await setProfileName('');
        clearMemoryCache();
        triggerDataRefresh();
        showToast('All tracker data cleared ✓');
      } catch (error) {
        console.error('[Settings] Error clearing tracker data:', error);
        showToast('Could not clear tracker data. Please try again.');
      }
    };

    safeConfirm('Clear all data?', message, runReset, 'Cancel', 'Clear All Data');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Screen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.animatedContent, entranceStyle]}>
        <AppHeader
          title="Settings"
          showSettings={false}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />

      {/* ── 1. Appearance ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Appearance</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Choose how Lifio looks on your device.
          </Text>
          <View style={[styles.themeSelectorRow, isCompact ? styles.themeSelectorRowCompact : null]}>
            {['light', 'dark', 'system'].map((mode) => {
              const active = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeOption,
                    isCompact ? styles.themeOptionCompact : null,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    active && { borderColor: colors.health, backgroundColor: colors.accentLight.health },
                  ]}
                >
                  <Ionicons
                    name={
                      mode === 'light'
                        ? 'sunny-outline'
                        : mode === 'dark'
                        ? 'moon-outline'
                        : 'phone-portrait-outline'
                    }
                    size={20}
                    color={active ? colors.health : colors.textSecondary}
                  />
                  <Text style={[styles.themeOptionLabel, { color: active ? colors.health : colors.textPrimary }]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── 2. Profile ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Profile</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={[styles.optionRow, isCompact ? styles.optionRowCompact : null]}>
            <View style={[styles.navIconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name="person-outline" size={18} color={colors.health} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Display Name</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                {profileName || 'Not set — tap to add your name'}
              </Text>
            </View>
            <Pressable
              onPress={openNameModal}
              style={[styles.inlineButton, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
            >
              <Text style={[styles.inlineButtonText, { color: colors.health }]}>
                {profileName ? 'Edit' : 'Set'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── 3. Health ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Health</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Select the units used when logging and viewing your health metrics.
          </Text>

          {/* Weight */}
          <View style={[styles.unitRow, isCompact ? styles.unitRowCompact : null]}>
            <View style={[styles.unitIconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name="barbell-outline" size={16} color={colors.health} />
            </View>
            <View style={[styles.unitLabelWrap, isCompact ? styles.unitLabelWrapCompact : null]}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Weight</Text>
            </View>
            <View style={styles.unitPickerWrap}>
              <SegmentedPicker
                options={WEIGHT_UNITS.map((u) => ({ code: u.code, label: u.label }))}
                value={weightUnit}
                onSelect={setWeightUnit}
                colors={colors}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Water */}
          <View style={[styles.unitRow, isCompact ? styles.unitRowCompact : null]}>
            <View style={[styles.unitIconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name="water-outline" size={16} color={colors.health} />
            </View>
            <View style={[styles.unitLabelWrap, isCompact ? styles.unitLabelWrapCompact : null]}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Water</Text>
            </View>
            <View style={styles.unitPickerWrap}>
              <SegmentedPicker
                options={WATER_UNITS.map((u) => ({ code: u.code, label: u.label }))}
                value={waterUnit}
                onSelect={setWaterUnit}
                colors={colors}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── 4. Habits ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Habits</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <InfoRow
            icon="alarm-outline"
            iconBg={colors.accentLight.habits}
            iconColor={colors.habits}
            title="Reminder Times"
            subtitle="Set a reminder time individually on each habit via Add or Edit Habit."
            colors={colors}
          />
        </View>
      </View>

      {/* ── 5. Wallet ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Wallet</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          {/* Currency */}
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Currency used for wallet balance, spending, and transaction history.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.currencyScrollContent}
          >
            {currencies.map((item) => {
              const selected = currency.code === item.code;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => setCurrency(item.code)}
                  style={[
                    styles.currencyOption,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    selected && { backgroundColor: colors.accentLight.health, borderColor: colors.health },
                  ]}
                >
                  <Text style={[styles.currencySymbol, { color: selected ? colors.health : colors.textPrimary }]}>
                    {item.symbol}
                  </Text>
                  <Text style={[styles.currencyLabel, { color: selected ? colors.health : colors.textSecondary }]}>
                    {item.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Passcode note */}
          <InfoRow
            icon="lock-closed-outline"
            iconBg={colors.accentLight.wallet}
            iconColor={colors.wallet}
            title="Wallet Passcode"
            subtitle="Your wallet is protected by a local passcode. To reset it, use Manage Privacy below."
            colors={colors}
          />
        </View>
      </View>

      {/* ── 6. Data & Privacy ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>Data & Privacy</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>

          {/* Local-storage notice */}
          <View style={[styles.privacyNotice, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.health} />
            <Text style={[styles.privacyNoticeText, { color: colors.health }]}>
              All your data is stored privately on this device. Nothing is sent to any server.
            </Text>
          </View>

          {/* Export */}
          <NavRow
            icon="download-outline"
            iconBg={colors.accentLight.health}
            iconColor={colors.health}
            title="Export App Data"
            subtitle="Share a full JSON backup of all your tracked data"
            onPress={exportAllData}
            colors={colors}
            rightIcon="share-outline"
          />

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Manage Privacy */}
          <NavRow
            icon="shield-outline"
            iconBg={colors.accentLight.health}
            iconColor={colors.health}
            title="Manage Privacy"
            subtitle="Reset wallet passcode or clear individual data sections"
            onPress={() => navigation.navigate('PrivacyManagement')}
            colors={colors}
          />

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Clear all data */}
          <NavRow
            icon="trash-outline"
            iconBg={colors.dangerBg}
            iconColor={colors.danger}
            title="Clear All App Data"
            subtitle="Permanently delete all logs, habits, notes, and wallet data"
            onPress={clearAllTrackerData}
            colors={colors}
          />
        </View>
      </View>

      {/* ── 7. About ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader>About</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <NavRow
            icon="information-circle-outline"
            iconBg={colors.accentLight.habits}
            iconColor={colors.habits}
            title="About Lifio"
            subtitle="Version, design values, and app details"
            onPress={() => navigation.navigate('About')}
            colors={colors}
          />

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <NavRow
            icon="help-circle-outline"
            iconBg={colors.accentLight.notes}
            iconColor={colors.notes}
            title="Help & FAQ"
            subtitle="Tips, frequently asked questions, and feature guidance"
            onPress={() => navigation.navigate('Help')}
            colors={colors}
          />
        </View>

        <Pressable onPress={handleVersionTap} hitSlop={12} style={styles.versionWrap}>
          <Text style={[styles.versionText, { color: colors.textHint }]}>Lifio · Version 1.0.0</Text>
        </Pressable>
      </View>

      {/* ── 8. Developer Tools (hidden, unlocked by tapping version) ──── */}
      {developerMode ? (
        <View style={styles.section}>
          <SectionHeader>Developer Tools</SectionHeader>
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Dummy records are tagged separately and removed independently from real user data.
            </Text>
            <View style={[styles.buttonRow, isCompact ? styles.buttonRowCompact : null]}>
              <Pressable
                onPress={confirmFill}
                style={[styles.actionButton, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={colors.health} />
                <Text style={[styles.actionButtonText, { color: colors.health }]}>Input Dummy Data</Text>
              </Pressable>

              <Pressable
                onPress={confirmErase}
                style={[styles.actionButton, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionButtonText, { color: colors.danger }]}>Erase Dummy Data</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={disableDeveloperMode}
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderLight, flex: 0, width: '100%' }]}
            >
              <Ionicons name="power-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Turn Off Developer Mode</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      </Animated.View>

      {/* ── Developer Passcode Modal ───────────────────────────────────── */}
      {passcodeModalVisible && (
        <Modal
          visible={passcodeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPasscodeModalVisible(false)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Enable Developer Mode</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Enter the developer passcode to continue.
                  </Text>
                </View>
              </View>
              <InputField
                value={passcode}
                onChangeText={(value) => {
                  setPasscode(value);
                  if (passcodeError) setPasscodeError('');
                }}
                placeholder="Passcode"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passcodeError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{passcodeError}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => { setPasscodeModalVisible(false); setPasscode(''); setPasscodeError(''); }}
                  style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={enableDeveloperMode}
                  style={[styles.actionButton, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.health }]}>Enable</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Display Name Modal ────────────────────────────────────────── */}
      {nameModalVisible && (
        <Modal
          visible={nameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNameModalVisible(false)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="person-outline" size={22} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Your display name</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Used across the app for greetings. Stored locally only.
                  </Text>
                </View>
              </View>
              <InputField
                value={nameDraft}
                onChangeText={(value) => {
                  setNameDraft(value);
                  if (nameError) setNameError('');
                }}
                placeholder="Your name"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
              />
              {nameError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => { setNameModalVisible(false); setNameError(''); setNameDraft(profileName || ''); }}
                  style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveProfileDisplayName}
                  style={[styles.actionButton, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.health }]}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 28,
  },
  animatedContent: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...SHADOWS.subtle,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Theme picker
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeSelectorRowCompact: {
    flexWrap: 'wrap',
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  themeOptionCompact: {
    flexBasis: '48%',
    minWidth: 132,
  },
  themeOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Profile / option row
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionRowCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
  },
  inlineButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Health unit rows
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitRowCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  unitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitLabelWrap: {
    width: 56,
  },
  unitLabelWrapCompact: {
    paddingTop: 6,
    width: 64,
  },
  unitPickerWrap: {
    flex: 1,
    minWidth: 180,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
  },
  segmentedLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Currency picker
  currencyScrollContent: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 2,
    paddingRight: 4,
  },
  currencyOption: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    width: 58,
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '800',
  },
  currencyLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: 2,
  },

  // Nav rows (tappable)
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: RADIUS.md,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowInfo: {
    flex: 1,
    gap: 2,
  },
  navRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  navRowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Info rows (non-tappable)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  // Privacy notice badge
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Danger action buttons
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  buttonRowCompact: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Version
  versionWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...SHADOWS.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
