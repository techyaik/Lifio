import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View, Switch, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { getData, setData } from '../storage/storage';
import { showToast, safeConfirm } from '../utils/feedback';
import { RADIUS, SHADOWS } from '../constants/theme';
import { clearMemoryCache } from '../hooks/useStoredList';

export default function PrivacyManagement({ navigation }) {
  const { colors, triggerDataRefresh, appLockEnabled, setAppLockEnabled } = useTheme();

  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [dataSync, setDataSync] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  
  const handleToggleAppLock = async (val) => {
    if (val) {
      // Enabling Lock
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Not Available', 'Biometric authentication is not set up on this device.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable App Lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setAppLockEnabled(true);
      }
    } else {
      // Disabling Lock
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to disable App Lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setAppLockEnabled(false);
      }
    }
  };

  const exportData = async () => {
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

  const clearSection = (key, label) => {
    const message = `This will permanently erase all data in the ${label} section. This action cannot be undone.`;
    const runClear = async () => {
      if (key === 'wallet_entries') {
        await setData('wallet_entries', []);
        await setData('wallet_accounts', []);
      } else {
        await setData(key, []);
      }
      clearMemoryCache();
      triggerDataRefresh();
      showToast(`${label} cleared ✓`);
    };

    safeConfirm(`Clear ${label}?`, message, runClear, 'Cancel', 'Clear Data');
  };

  return (
    <Screen>
      <AppHeader title="Privacy Management" onBack={() => navigation.navigate('Main')} />

      {/* Security Status Card */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
            <Ionicons name="shield-checkmark" size={24} color={colors.health} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Local Isolation Mode</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your data stays on your device</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          All metrics, logs, and thoughts are written directly to private on-device storage. No cloud tracking is enabled by default.
        </Text>
      </View>

      {/* Control Switches Bento */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data Controls</Text>
        
        <View style={[styles.controlCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Biometric App Lock</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Require authentication to open Lifio</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>On-Device Encryption</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Encrypt stored databases at rest</Text>
            </View>
            <Switch
              value={encryptionEnabled}
              onValueChange={setEncryptionEnabled}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Anonymized Diagnostics</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Share anonymous crash logs and diagnostics</Text>
            </View>
            <Switch
              value={analytics}
              onValueChange={setAnalytics}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>External Backup Sync</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Sync backups to iCloud / Google Drive</Text>
            </View>
            <Switch
              value={dataSync}
              onValueChange={setDataSync}
              trackColor={{ false: colors.border, true: colors.health }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Export & Resets</Text>
        
        <View style={[styles.controlCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.actionRow}>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Export All App Data</Text>
            <PrimaryButton title="Export JSON" onPress={exportData} color={colors.health} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.resetGrid}>
            <Text style={[styles.actionLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Danger Zone</Text>
            <View style={styles.grid}>
              <PrimaryButton title="Clear Habits" onPress={() => clearSection('habits_list', 'Habits')} color={colors.danger} />
              <PrimaryButton title="Clear Wallet" onPress={() => clearSection('wallet_entries', 'Wallet')} color={colors.danger} />
            </View>
            <View style={[styles.grid, { marginTop: 8 }]}>
              <PrimaryButton title="Clear Health" onPress={() => clearSection('health_logs', 'Health')} color={colors.danger} />
              <PrimaryButton title="Clear Notes" onPress={() => clearSection('notes_list', 'Notes')} color={colors.danger} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    ...SHADOWS.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  controlCard: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.subtle,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetGrid: {
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
});
