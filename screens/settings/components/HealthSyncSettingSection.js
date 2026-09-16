import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';

export function HealthSyncSettingSection({ isConnected, isSyncing, lastSyncedText, onSyncPress, onConnectPress, onSettingsPress }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Health Sync</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.row}>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isConnected ? 'Google Health Connect' : 'Connect Health'}
            </Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {isConnected
                ? isSyncing
                  ? 'Syncing native health data...'
                  : lastSyncedText
                  ? `Last synced ${lastSyncedText}`
                  : 'Connected ✓'
                : 'Sync steps, sleep & workouts automatically'}
            </Text>
          </View>
          {isConnected ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={onSyncPress}
                disabled={isSyncing}
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.accentLight.health, opacity: pressed || isSyncing ? 0.7 : 1 },
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.pillHealth.text} />
                ) : (
                  <Ionicons name="refresh-outline" size={18} color={colors.pillHealth.text} />
                )}
              </Pressable>
              {onSettingsPress && (
                <Pressable
                  onPress={onSettingsPress}
                  style={({ pressed }) => [
                    styles.btn,
                    { backgroundColor: colors.surfaceTint, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          ) : (
            <Pressable
              onPress={onConnectPress}
              style={({ pressed }) => [
                styles.connectBtn,
                { backgroundColor: colors.health, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.connectBtnText, { color: colors.onAccent }]}>Connect</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    marginTop: 3,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
