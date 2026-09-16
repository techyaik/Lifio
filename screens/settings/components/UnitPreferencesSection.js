import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';
import { WEIGHT_UNITS, WATER_UNITS } from '../../../hooks/useHealthUnits';

export function UnitPreferencesSection({ weightUnit, setWeightUnit, waterUnit, setWaterUnit }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Unit Preferences</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.unitRow}>
          <Text style={[styles.unitTitle, { color: colors.textPrimary }]}>Weight Unit</Text>
          <View style={styles.toggleGroup}>
            {[WEIGHT_UNITS.KG, WEIGHT_UNITS.LBS].map((unit) => {
              const active = weightUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => setWeightUnit(unit)}
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: active ? colors.health : colors.surfaceTint },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: active ? colors.onAccent : colors.textSecondary },
                    ]}
                  >
                    {unit.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.unitRow}>
          <Text style={[styles.unitTitle, { color: colors.textPrimary }]}>Water Unit</Text>
          <View style={styles.toggleGroup}>
            {[WATER_UNITS.GLASSES, WATER_UNITS.ML].map((unit) => {
              const active = waterUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => setWaterUnit(unit)}
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: active ? colors.health : colors.surfaceTint },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: active ? colors.onAccent : colors.textSecondary },
                    ]}
                  >
                    {unit === WATER_UNITS.GLASSES ? 'Glasses' : 'mL'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
    gap: 16,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
