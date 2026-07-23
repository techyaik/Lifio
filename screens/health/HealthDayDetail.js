import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View, Platform } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { MetricCard } from '../../components/MetricCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { useHealth } from '../../hooks/useHealth';
import { useHealthUnits } from '../../hooks/useHealthUnits';
import { displayDate, lastSevenDaysEnding } from '../../utils/dates';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { showToast, safeConfirm } from '../../utils/feedback';

export default function HealthDayDetail({ navigation, route }) {
  const { logs, loading, deleteLog } = useHealth();
  const { width } = useWindowDimensions();
  const { colors, triggerDataRefresh } = useTheme();
  const { weightUnit, waterUnit, formatWeight, formatWater } = useHealthUnits();
  
  const entry = logs.find((log) => log.id === route.params?.entryId) || route.params?.entry;
  const cycleInfo = useMemo(() => {
    if (!entry || !(entry.cycleEnabled || entry.period || entry.lastPeriodStart)) return null;
    const startDate = entry.lastPeriodStart || entry.date;
    try {
      const next = addDays(parseISO(startDate), Number(entry.cycleLength) || 28);
      const daysUntil = differenceInCalendarDays(next, parseISO(entry.date));
      return {
        expected: displayDate(next, 'MMM d, yyyy'),
        daysUntil,
      };
    } catch (e) {
      return null;
    }
  }, [entry]);

  if (!entry) {
    return (
      <Screen loading={loading}>
        <AppHeader title="Detail" onBack={() => navigation.goBack()} />
        <Text style={{ color: colors.textPrimary, padding: 16 }}>Log not found.</Text>
      </Screen>
    );
  }

  const days = lastSevenDaysEnding(entry.date);
  const weights = days.map((day) => logs.find((log) => log.date === day)?.weight || 0);

  const confirmDelete = () => {
    const performDelete = async () => {
      try {
        await deleteLog(entry.id);
        triggerDataRefresh();
        showToast('Health log deleted successfully ✓');
        navigation.navigate('HealthDashboard');
      } catch (error) {
        console.error('Delete log failed:', error);
        showToast('Failed to delete log: ' + error.message);
      }
    };

    safeConfirm('Delete log?', 'This health log will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  return (
    <Screen loading={loading}>
      <AppHeader
        title={`${displayDate(entry.date, 'MMM d')} detail`}
        onBack={() => navigation.goBack()}
        rightIcon="pencil"
        accent={colors.health}
        onRight={() => navigation.navigate('HealthLogEntry', { entryId: entry.id, entry })}
      />
      <View style={styles.grid}>
        <MetricCard
          value={entry.weight != null ? (formatWeight(entry.weight) || `${entry.weight} kg`) : '—'}
          label={`Weight ${weightUnit}`}
          accent={colors.health}
          icon={<Ionicons name="scale-outline" size={16} color={colors.health} />}
        />
        <MetricCard
          value={entry.sleep ?? '—'}
          label="Sleep hrs"
          accent={colors.health}
          icon={<Ionicons name="bed-outline" size={16} color={colors.health} />}
        />
      </View>
      <View style={styles.grid}>
        <MetricCard
          value={entry.steps?.toLocaleString?.() ?? '—'}
          label="Steps"
          accent={colors.health}
          icon={<Ionicons name="walk-outline" size={16} color={colors.health} />}
        />
        <MetricCard
          value={entry.water != null ? (formatWater(entry.water) || `${entry.water} glasses`) : '—'}
          label={`Water ${waterUnit}`}
          accent={colors.health}
          icon={<Ionicons name="water-outline" size={16} color={colors.health} />}
        />
      </View>
      {entry.period ? (
        <View style={[styles.periodBanner, { backgroundColor: colors.accentLight.health, borderColor: colors.health }]}>
          <Ionicons name="water" size={18} color={colors.health} />
          <Text style={[styles.periodBannerText, { color: colors.health }]}>
            Period started on this day{entry.flowIntensity ? ` · ${entry.flowIntensity} flow` : ''}
          </Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <SectionHeader>Wellbeing</SectionHeader>
        <View style={styles.grid}>
          <MetricCard
            value={entry.mood || '—'}
            label="Mood"
            accent={colors.health}
            icon={<Ionicons name="happy-outline" size={16} color={colors.health} />}
          />
          <MetricCard
            value={entry.energy || '—'}
            label="Energy"
            accent={colors.health}
            icon={<Ionicons name="flash-outline" size={16} color={colors.health} />}
          />
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Symptoms</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {entry.symptoms?.length ? entry.symptoms.join(', ') : 'No symptoms logged.'}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Medication or supplements</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {entry.medication || 'No reminder logged.'}
          </Text>
        </View>
      </View>
      {cycleInfo ? (
        <View style={styles.section}>
          <SectionHeader>Cycle reminder</SectionHeader>
          <View style={[styles.infoCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Next expected period</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {cycleInfo.expected} · {cycleInfo.daysUntil < 0 ? `${Math.abs(cycleInfo.daysUntil)} days overdue from this log` : `${cycleInfo.daysUntil} days from this log`}
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Symptoms: {entry.cycleSymptoms?.length ? entry.cycleSymptoms.join(', ') : 'None logged'}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.section}>
        <SectionHeader>Weekly weight</SectionHeader>
        <BarChart
          data={{ labels: days.map((day) => displayDate(day, 'd')), datasets: [{ data: weights }] }}
          width={Math.min(width - 36, 520)}
          height={210}
          fromZero
          showValuesOnTopOfBars
          chartConfig={{
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            color: () => colors.tealMid,
            labelColor: () => colors.textSecondary,
            decimalPlaces: 0,
            propsForBackgroundLines: { stroke: colors.borderLight },
          }}
          style={[styles.chart, { backgroundColor: colors.white }]}
        />
      </View>
      {entry.notes ? (
        <View style={styles.section}>
          <SectionHeader>Notes</SectionHeader>
          <Text selectable style={[styles.notes, { backgroundColor: colors.white, borderColor: colors.borderLight, color: colors.textPrimary }]}>
            {entry.notes}
          </Text>
        </View>
      ) : null}
      <PrimaryButton title="Delete log" color={colors.danger} onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  section: { gap: 8 },
  chart: { borderRadius: RADIUS.lg, ...SHADOWS.subtle },
  notes: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
    ...SHADOWS.subtle,
  },
  infoCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 4,
    padding: 14,
    ...SHADOWS.subtle,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
    marginVertical: 4,
  },
  periodBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
