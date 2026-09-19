import React, { useMemo, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { isAfter, parseISO, subMonths, subWeeks } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ListRow } from '../../components/Rows';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { useHealth } from '../../hooks/useHealth';
import { displayDate } from '../../utils/dates';

const formatSteps = (steps) => (steps || steps === 0 ? Number(steps).toLocaleString() : '0');
const historySummary = (log) => {
  const parts = [];
  if (log.weight) parts.push(`${log.weight} kg`);
  if (log.sleep) parts.push(`${log.sleep} hrs`);
  if (log.steps) parts.push(`${formatSteps(log.steps)} steps`);
  if (log.heartRate) parts.push(`${log.heartRate} BPM`);
  if (log.mood) parts.push(log.mood);
  if (log.symptoms?.length) parts.push(`${log.symptoms.length} symptom${log.symptoms.length === 1 ? '' : 's'}`);
  if (log.period) parts.push('Period');
  return parts.length ? parts.join(' · ') : 'No metrics recorded';
};

export default function HealthHistory({ navigation }) {
  const { logs, loading } = useHealth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [filter, setFilter] = useState('All');
  
  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'Week') return logs.filter((log) => isAfter(parseISO(log.date), subWeeks(now, 1)));
    if (filter === 'Month') return logs.filter((log) => isAfter(parseISO(log.date), subMonths(now, 1)));
    return logs;
  }, [logs, filter]);

  return (
    <Screen loading={loading} scroll={false} style={styles.screen}>
      <AppHeader title="History" onBack={() => navigation.goBack()} />
      <View style={styles.filters}>
        {['Week', 'Month', 'All'].map((item) => (
          <Pill key={item} label={item} selected={filter === item} onPress={() => setFilter(item)} palette={colors.pillLearning} />
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            title={displayDate(item.date)}
            subtitle={historySummary(item)}
            onPress={() => navigation.navigate('HealthDayDetail', { entryId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" message="No health logs in this range." />
        }
        contentContainerStyle={[styles.list, { paddingBottom: (insets.bottom > 0 ? insets.bottom : 16) + 140 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  list: { gap: 10, paddingTop: 10 },
});
