import React, { useState, useEffect } from 'react';
import AsyncStorage from '../storage/safeAsyncStorage';
import { Alert, Modal, StyleSheet, Text, View, Switch, Pressable, Platform } from 'react-native';
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
import { useHealth } from '../hooks/useHealth';

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

export default function Settings() {
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode, triggerDataRefresh, profileName, setProfileName } = useTheme();
  const { watchConfig, disconnectWatch } = useHealth();

  // Settings keys
  const DEVELOPER_MODE_KEY = 'lifio_developer_mode';
  const NOTIFICATIONS_KEY = 'lifio_notifications';
  const REMINDERS_KEY = 'lifio_reminders';
  const LANGUAGE_KEY = 'lifio_language';
  const REMIDER_TIME_KEY = 'lifio_default_reminder_time';
  const LOCATION_PERM_KEY = 'lifio_location_perm';
  const HEALTHKIT_PERM_KEY = 'lifio_healthkit_perm';
  const CYCLE_REMINDERS_KEY = 'lifio_cycle_reminders';

  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [language, setLanguage] = useState('English');
  const [defaultReminderTime, setDefaultReminderTime] = useState('08:00');
  const [locationPerm, setLocationPerm] = useState(false);
  const [healthKitPerm, setHealthKitPerm] = useState(true);
  const [cycleReminders, setCycleReminders] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [passcodeModalVisible, setPasscodeModalVisible] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState(profileName || '');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedDev = await AsyncStorage.getItem(DEVELOPER_MODE_KEY);
        if (storedDev === 'true') setDeveloperMode(true);

        const storedNotif = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (storedNotif !== null) setNotifications(storedNotif === 'true');

        const storedRem = await AsyncStorage.getItem(REMINDERS_KEY);
        if (storedRem !== null) setReminders(storedRem === 'true');

        const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (storedLang !== null) setLanguage(storedLang);

        const storedTime = await AsyncStorage.getItem(REMIDER_TIME_KEY);
        if (storedTime !== null) setDefaultReminderTime(storedTime);

        const storedLoc = await AsyncStorage.getItem(LOCATION_PERM_KEY);
        if (storedLoc !== null) setLocationPerm(storedLoc === 'true');

        const storedHealth = await AsyncStorage.getItem(HEALTHKIT_PERM_KEY);
        if (storedHealth !== null) setHealthKitPerm(storedHealth === 'true');

        const storedCycle = await AsyncStorage.getItem(CYCLE_REMINDERS_KEY);
        if (storedCycle !== null) setCycleReminders(storedCycle === 'true');
      } catch (e) {
        console.error('Error loading settings from AsyncStorage:', e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    setNameDraft(profileName || '');
  }, [profileName]);

  const updateNotifications = async (val) => {
    setNotifications(val);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(val));
  };
  const updateReminders = async (val) => {
    setReminders(val);
    await AsyncStorage.setItem(REMINDERS_KEY, String(val));
  };
  const updateReminderTime = async (val) => {
    setDefaultReminderTime(val);
    await AsyncStorage.setItem(REMIDER_TIME_KEY, val);
  };
  const updateLocationPerm = async (val) => {
    setLocationPerm(val);
    await AsyncStorage.setItem(LOCATION_PERM_KEY, String(val));
  };
  const updateHealthKitPerm = async (val) => {
    setHealthKitPerm(val);
    await AsyncStorage.setItem(HEALTHKIT_PERM_KEY, String(val));
  };
  const updateCycleReminders = async (val) => {
    setCycleReminders(val);
    await AsyncStorage.setItem(CYCLE_REMINDERS_KEY, String(val));
  };

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
      console.error('Error saving developer mode state:', e);
    }
  };

  const disableDeveloperMode = async () => {
    setDeveloperMode(false);
    setVersionTapCount(0);
    showToast('Developer Mode disabled');
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, 'false');
    } catch (e) {
      console.error('Error saving developer mode state:', e);
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



  return (
    <Screen>
      <AppHeader
        title="Settings"
        showSettings={false}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* 1. Theme / Appearance Selection */}
      <View style={styles.section}>
        <SectionHeader>Appearance</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Choose how Lifio looks on your device.
          </Text>
          <View style={styles.themeSelectorRow}>
            {['light', 'dark', 'system'].map((mode) => {
              const active = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                    },
                    active && {
                      borderColor: colors.health,
                      backgroundColor: colors.accentLight.health,
                    },
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
                  <Text
                    style={[
                      styles.themeOptionLabel,
                      { color: active ? colors.health : colors.textPrimary },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader>Personalization</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Display Name</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                {profileName || 'Set the name Lifio uses across the app.'}
              </Text>
            </View>
            <Pressable
              onPress={openNameModal}
              style={[styles.settingsConnectLink, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
            >
              <Text style={[styles.settingsConnectLinkText, { color: colors.health }]}>
                {profileName ? 'Change' : 'Set Name'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Notifications & Language */}
      <View style={styles.section}>
        <SectionHeader>General Preferences</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Push Notifications</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Receive morning digest summaries</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={updateNotifications}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>
 
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
 
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Habit Reminders</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Alerts for scheduled milestones</Text>
            </View>
            <Switch
              value={reminders}
              onValueChange={updateReminders}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>
 
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
 
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>App Language</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Select interface language</Text>
            </View>
            <Pressable
              style={[styles.pickerMock, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => Alert.alert('Language', 'Only English is available in developer build.')}
            >
              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>{language}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
 
      {/* 3. Default Preferences */}
      <View style={styles.section}>
        <SectionHeader>Defaults</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.optionColumn}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Default Habits reminder time</Text>
            <InputField
              value={defaultReminderTime}
              onChangeText={updateReminderTime}
              placeholder="e.g. 08:00"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </View>
 
      {/* 4. App Permissions */}
      <View style={styles.section}>
        <SectionHeader>App Permissions</SectionHeader>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Location Services</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Add location tags to local tracker logs</Text>
            </View>
            <Switch
              value={locationPerm}
              onValueChange={updateLocationPerm}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>
 
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
 
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Health Integration</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Import steps and sleep automatically</Text>
            </View>
            <Switch
              value={healthKitPerm}
              onValueChange={updateHealthKitPerm}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Menstrual Cycle Reminders</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Get notified about upcoming cycles</Text>
            </View>
            <Switch
              value={cycleReminders}
              onValueChange={updateCycleReminders}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Smartwatch Connection</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                {watchConfig && watchConfig.connected
                  ? `${
                      watchConfig.provider === 'google_fit'
                        ? 'Google Fit'
                        : watchConfig.provider === 'bluetooth'
                        ? `Bluetooth (${watchConfig.deviceName || 'Wearable'})`
                        : 'Connected Wearable'
                    } · ${Object.values(watchConfig.permissions || {}).filter(Boolean).length} metrics`
                  : 'Status: Disconnected'}
              </Text>
            </View>
            {watchConfig && watchConfig.connected ? (
              <Pressable
                onPress={disconnectWatch}
                style={[styles.settingsDisconnectBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
              >
                <Text style={[styles.settingsDisconnectBtnText, { color: colors.danger }]}>Disconnect</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('Main', { screen: 'HealthTab' })}
                style={[styles.settingsConnectLink, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
              >
                <Text style={[styles.settingsConnectLinkText, { color: colors.health }]}>Connect</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {developerMode ? (
        <View style={styles.section}>
          <SectionHeader>Developer Tools</SectionHeader>
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Dummy records are tagged separately and can be removed without deleting real user data.
            </Text>
            <View style={styles.buttonRow}>
              <Pressable
                onPress={confirmFill}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.accentLight.health, borderColor: colors.health }
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={colors.health} />
                <Text style={[styles.actionButtonText, { color: colors.health }]}>Input Dummy Data</Text>
              </Pressable>

              <Pressable
                onPress={confirmErase}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.dangerBg, borderColor: colors.danger }
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionButtonText, { color: colors.danger }]}>Erase Dummy Data</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={disableDeveloperMode}
              style={[
                styles.actionButton,
                { backgroundColor: colors.surface, borderColor: colors.borderLight, flex: 0, width: '100%' }
              ]}
            >
              <Ionicons name="power-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Turn Off Developer Mode</Text>
            </Pressable>
          </View>
        </View>
      ) : null}



      {/* 6. About Section Info */}
      <View style={[styles.card, styles.aboutCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.habits }]}>
            <Ionicons name="sparkles" size={22} color={colors.habits} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Lifio Tracker</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>A personal ledger, health, and habits tracker for mindful momentum.</Text>
          </View>
        </View>
        <Pressable onPress={handleVersionTap} hitSlop={8}>
          <Text style={[styles.versionText, { color: colors.textHint }]}>Version 1.0.0 (Production Build)</Text>
        </Pressable>
      </View>

      {passcodeModalVisible && (
        <Modal visible={passcodeModalVisible} transparent animationType="fade" onRequestClose={() => setPasscodeModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Enable Developer Mode</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Enter the developer passcode to continue.</Text>
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
              {passcodeError ? <Text style={[styles.errorText, { color: colors.danger }]}>{passcodeError}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => {
                    setPasscodeModalVisible(false);
                    setPasscode('');
                    setPasscodeError('');
                  }}
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

      {nameModalVisible && (
        <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
                  <Ionicons name="person-outline" size={22} color={colors.health} />
                </View>
                <View style={styles.titleColumn}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Update your name</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Lifio uses this name for simple, local personalization.
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
              {nameError ? <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => {
                    setNameModalVisible(false);
                    setNameError('');
                    setNameDraft(profileName || '');
                  }}
                  style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveProfileDisplayName}
                  style={[styles.actionButton, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.health }]}>Save Name</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  aboutCard: {
    marginTop: 8,
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
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
  themeOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionInfo: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
  },
  optionColumn: {
    flexDirection: 'column',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  pickerMock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  pickerValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
  versionText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
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
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsDisconnectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  settingsDisconnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingsConnectLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  settingsConnectLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
