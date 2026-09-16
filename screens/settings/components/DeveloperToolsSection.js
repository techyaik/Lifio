import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';

export function DeveloperToolsSection({ devUnlocked, onUnlockDev, onFillDummyData, onClearDummyData }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Developer Options</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {!devUnlocked ? (
          <Pressable
            onPress={onUnlockDev}
            style={({ pressed }) => [
              styles.itemRow,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="code-working-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.itemText, { color: colors.textPrimary }]}>Unlock Developer Mode</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onFillDummyData}
              style={({ pressed }) => [
                styles.itemRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.itemLeft}>
                <Ionicons name="add-circle-outline" size={20} color={colors.health} />
                <Text style={[styles.itemText, { color: colors.textPrimary }]}>Insert Demo / Test Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <Pressable
              onPress={onClearDummyData}
              style={({ pressed }) => [
                styles.itemRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.itemLeft}>
                <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                <Text style={[styles.itemText, { color: colors.danger }]}>Clear Demo / Test Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </Pressable>
          </>
        )}
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
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
