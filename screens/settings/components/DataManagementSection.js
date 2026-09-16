import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';

export function DataManagementSection({ onExportBackup, onImportBackup, onClearData }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Data & Privacy</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Pressable
          onPress={onExportBackup}
          style={({ pressed }) => [
            styles.itemRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.itemLeft}>
            <Ionicons name="download-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>Export Data Backup</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <Pressable
          onPress={onImportBackup}
          style={({ pressed }) => [
            styles.itemRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.itemLeft}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>Restore Data Backup</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <Pressable
          onPress={onClearData}
          style={({ pressed }) => [
            styles.itemRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.itemLeft}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.itemText, { color: colors.danger }]}>Clear All Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.danger} />
        </Pressable>
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
