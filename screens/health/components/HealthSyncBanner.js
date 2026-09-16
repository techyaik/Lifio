import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { useTheme } from '../../../theme/ThemeContext';
import { RADIUS } from '../../../constants/theme';

export function HealthSyncBanner({ isConnected, isSyncing, lastSyncedText, onSyncPress, onConnectPress, onSettingsPress }) {
  const { colors } = useTheme();

  if (!isConnected) {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.leftRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentLight.health }]}>
            <Ionicons name="fitness-outline" size={20} color={colors.pillHealth.text} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Connect Health</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>Sync steps, sleep & workouts natively</Text>
          </View>
        </View>
        <Pressable
          onPress={onConnectPress}
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: colors.health, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.onAccent }]}>Connect</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.leftRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentLight.health }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.pillHealth.text} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Health Connect Linked</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {isSyncing ? 'Syncing health data...' : lastSyncedText ? `Synced ${lastSyncedText}` : 'Ready to sync'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onSyncPress}
          disabled={isSyncing}
          style={({ pressed }) => [
            styles.syncBtn,
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
              styles.syncBtn,
              { backgroundColor: colors.surfaceTint, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    marginTop: 2,
  },
  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
