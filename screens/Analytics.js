import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { Screen } from '../components/Screen';
import { useHabits } from '../hooks/useHabits';
import { useHealth } from '../hooks/useHealth';
import { useNotes } from '../hooks/useNotes';
import { useWallet } from '../hooks/useWallet';
import { displayDate, todayKey, shouldCountForGoal } from '../utils/dates';
import { RADIUS, SHADOWS } from '../constants/theme';

const average = (values) => {
  const valid = values.filter((value) => Number(value) > 0).map(Number);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const clampPercent = (value, total) => {
  const safeValue = Number(value) || 0;
  const safeTotal = Number(total) || 0;
  if (!safeTotal) return 0;
  return Math.max(0, Math.min(100, Math.round((safeValue / safeTotal) * 100)));
};

const chartDays = Array.from({ length: 7 }, (_, index) => {
  const date = subDays(startOfDay(new Date()), 6 - index);
  return {
    key: format(date, 'yyyy-MM-dd'),
    short: format(date, 'EEEEE'),
    label: format(date, 'EEE'),
  };
});

export default function Analytics({ navigation }) {
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 520;
  const isExpanded = width >= 960;

  const { getTodayLog, logs } = useHealth();
  const { habits, isDone, getStreak, getDayCompletionPercent } = useHabits();
  const { notes } = useNotes();
  const { wallets, transactions, formatMoney } = useWallet();

  const today = getTodayLog();
  const activeHabits = habits.filter((habit) => shouldCountForGoal(todayKey(), habit.goal));
  const habitsDoneToday = activeHabits.filter((habit) => isDone(habit.id, todayKey())).length;
  const topHabitStreak = activeHabits.length ? Math.max(...activeHabits.map((habit) => getStreak(habit))) : 0;

  const dashboardBg = theme === 'dark' ? '#091014' : '#081115';
  const dashboardBorder = theme === 'dark' ? '#1A2830' : '#132027';
  const dashboardCardBg = theme === 'dark' ? '#0D161C' : '#0D171D';
  const dashboardCardAlt = theme === 'dark' ? '#101B22' : '#101B22';
  const dashboardText = '#F3F7FA';
  const dashboardMuted = 'rgba(225,236,245,0.72)';
  const dashboardHint = 'rgba(173,194,209,0.56)';
  const dashboardTrack = 'rgba(255,255,255,0.08)';

  const healthSummary = useMemo(() => {
    const recent = logs.slice(0, 7);
    return {
      totalLogs: logs.length,
      stepsAvg: average(recent.map((item) => item.steps || item.watchData?.steps)),
      sleepAvg: average(recent.map((item) => item.sleep || item.watchData?.sleep)),
      waterAvg: average(recent.map((item) => item.water)),
      weightLatest: today?.weight || null,
    };
  }, [logs, today]);

  const healthWeekSeries = useMemo(() => {
    const byDate = new Map(logs.map((log) => [log.date, log]));
    const series = chartDays.map((day) => {
      const log = byDate.get(day.key);
      return {
        ...day,
        value: Number(log?.steps || log?.watchData?.steps || 0),
      };
    });
    const max = Math.max(...series.map((item) => item.value), 1);
    return {
      data: series.map((item, index) => ({
        ...item,
        percent: Math.max(10, Math.round((item.value / max) * 100)),
        linePercent: Math.max(14, Math.min(88, 22 + index * 8 + Math.round((item.value / max) * 12))),
      })),
      max,
    };
  }, [logs]);

  const habitsWeekSeries = useMemo(() => {
    const data = chartDays.map((day) => ({
      ...day,
      value: getDayCompletionPercent(day.key),
    }));
    return data;
  }, [getDayCompletionPercent]);

  const notesSummary = useMemo(() => {
    const latest = notes[0];
    const recentNotes = notes.filter((note) => {
      try {
        return differenceInCalendarDays(new Date(), parseISO(note.updatedAt)) <= 6;
      } catch (error) {
        return false;
      }
    });
    return {
      total: notes.length,
      pinned: notes.filter((note) => note.pinned).length,
      latestUpdated: latest?.updatedAt || null,
      latestTitle: latest?.title || '',
      recentCount: recentNotes.length,
    };
  }, [notes]);

  const notesWeekSeries = useMemo(() => {
    const counts = new Map(chartDays.map((day) => [day.key, 0]));
    notes.forEach((note) => {
      try {
        const key = format(parseISO(note.updatedAt), 'yyyy-MM-dd');
        if (counts.has(key)) {
          counts.set(key, counts.get(key) + 1);
        }
      } catch (error) {
        // ignore malformed note dates
      }
    });
    const max = Math.max(...Array.from(counts.values()), 1);
    return chartDays.map((day) => ({
      ...day,
      value: counts.get(day.key) || 0,
      percent: Math.max(counts.get(day.key) ? 18 : 8, Math.round(((counts.get(day.key) || 0) / max) * 100)),
    }));
  }, [notes]);

  const walletSummary = useMemo(() => {
    const monthPrefix = format(startOfMonth(new Date()), 'yyyy-MM');
    const monthTx = transactions.filter((transaction) => transaction.date?.startsWith(monthPrefix));
    const income = monthTx.filter((transaction) => transaction.type === 'in').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const expenses = monthTx.filter((transaction) => transaction.type === 'out').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const balance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
    return { income, expenses, balance, monthTxCount: monthTx.length };
  }, [transactions, wallets]);

  const walletWeekSeries = useMemo(() => {
    const totals = new Map(chartDays.map((day) => [day.key, { in: 0, out: 0 }]));
    transactions.forEach((transaction) => {
      const bucket = totals.get(transaction.date);
      if (!bucket) return;
      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'in') bucket.in += amount;
      if (transaction.type === 'out') bucket.out += amount;
    });
    const max = Math.max(
      ...Array.from(totals.values()).flatMap((item) => [item.in, item.out]),
      1
    );
    return chartDays.map((day) => {
      const bucket = totals.get(day.key) || { in: 0, out: 0 };
      return {
        ...day,
        income: bucket.in,
        expense: bucket.out,
        incomePercent: Math.max(bucket.in ? 18 : 8, Math.round((bucket.in / max) * 100)),
        expensePercent: Math.max(bucket.out ? 18 : 8, Math.round((bucket.out / max) * 100)),
      };
    });
  }, [transactions]);

  const walletExpensePercent = clampPercent(walletSummary.expenses, Math.max(walletSummary.income, walletSummary.expenses, 1));
  const habitCompletionPercent = clampPercent(habitsDoneToday, activeHabits.length || 1);
  const healthLinePoints = healthWeekSeries.data
    .map((item, index, arr) => {
      const x = arr.length === 1 ? 0 : (index / (arr.length - 1)) * 100;
      const y = 100 - item.linePercent;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Screen contentStyle={styles.content}>
      <AppHeader title="Analytics" onBack={() => navigation.goBack()} />

      <View
        style={[
          styles.dashboardShell,
          {
            backgroundColor: dashboardBg,
            borderColor: dashboardBorder,
            maxWidth: isExpanded ? 1120 : 960,
          },
        ]}
      >
        <View style={[styles.heroPanel, { backgroundColor: dashboardBg, borderColor: dashboardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleWrap}>
              <Text style={[styles.heroEyebrow, { color: dashboardMuted }]}>Users: last 7 days using median</Text>
              <Text style={[styles.heroTitle, { color: dashboardText }]}>Lifio analytics dashboard</Text>
            </View>
          </View>

          <View style={[styles.heroStatsRow, isCompact ? styles.heroStatsRowCompact : null]}>
            <TopMetric label="Health logs" value={healthSummary.totalLogs} color={colors.health} textColor={dashboardText} mutedColor={dashboardMuted} />
            <TopMetric label="Habit streak" value={`${topHabitStreak}d`} color={colors.habits} textColor={dashboardText} mutedColor={dashboardMuted} />
            <TopMetric label="Notes" value={notesSummary.total} color={colors.notes} textColor={dashboardText} mutedColor={dashboardMuted} />
            <TopMetric label="Wallet" value={wallets.length || 0} color={colors.wallet} textColor={dashboardText} mutedColor={dashboardMuted} />
          </View>
        </View>

        <View style={styles.grid}>
          <DashboardCard
            title="Health momentum"
            subtitle={healthSummary.totalLogs ? 'Daily steps from your recent health logs' : 'No step data yet'}
            icon="heart-outline"
            accent={colors.health}
            onPress={() => navigation.navigate('HealthTab')}
            cardBg={dashboardCardBg}
            cardBorder={dashboardBorder}
            textColor={dashboardText}
            mutedColor={dashboardMuted}
            hintColor={dashboardHint}
            surfaceColor={dashboardCardAlt}
            trackColor={dashboardTrack}
            large
            compact={isCompact}
          >
          {healthSummary.totalLogs ? (
            <>
              <View style={styles.chartHeaderRow}>
                <Text style={[styles.chartBigValue, { color: dashboardText }]}>
                  {today?.steps ? Number(today.steps).toLocaleString() : '—'}
                </Text>
                <View style={styles.chartMetaCol}>
                  <Text style={[styles.chartMetaLabel, { color: dashboardMuted }]}>7-day avg</Text>
                  <Text style={[styles.chartMetaValue, { color: dashboardText }]}>
                    {healthSummary.stepsAvg ? Number(healthSummary.stepsAvg).toLocaleString() : '—'}
                  </Text>
                </View>
              </View>
              <ReferenceChartPanel
                title="Step load vs momentum"
                leftScale={['75k', '60k', '45k', '30k', '15k', '0']}
                rightScale={['100%', '80%', '60%', '40%', '20%', '0%']}
                barLabel="Step load"
                lineLabel="Momentum"
                barColor="#20CFF8"
                lineColor="#F1A9C7"
                data={healthWeekSeries.data}
                linePoints={healthLinePoints}
                muted={dashboardMuted}
                hint={dashboardHint}
                track={dashboardTrack}
                text={dashboardText}
              />
              <View style={styles.pillMetricRow}>
                <MetricBadge label="Sleep avg" value={healthSummary.sleepAvg ? `${healthSummary.sleepAvg.toFixed(1)}h` : '—'} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
                <MetricBadge label="Water avg" value={healthSummary.waterAvg ? `${healthSummary.waterAvg.toFixed(1)}` : '—'} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
                <MetricBadge label="Weight" value={healthSummary.weightLatest ? `${healthSummary.weightLatest}` : '—'} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
              </View>
            </>
          ) : (
            <EmptyStateCopy title="No health analytics yet" body="Log health data to see step and recovery trends here." text={dashboardText} muted={dashboardMuted} />
          )}
          </DashboardCard>

          <DashboardCard
            title="Habit consistency"
            subtitle={activeHabits.length ? 'Completion rate over the last 7 days' : 'No active habits'}
            icon="checkmark-circle-outline"
            accent={colors.habits}
            onPress={() => navigation.navigate('HabitsTab')}
            cardBg={dashboardCardBg}
            cardBorder={dashboardBorder}
            textColor={dashboardText}
            mutedColor={dashboardMuted}
            hintColor={dashboardHint}
            surfaceColor={dashboardCardAlt}
            trackColor={dashboardTrack}
            compact={isCompact}
          >
          {activeHabits.length ? (
            <>
              <Text style={[styles.metricDisplay, { color: dashboardText }]}>{habitsDoneToday}/{activeHabits.length}</Text>
              <Text style={[styles.metricSubtext, { color: dashboardMuted }]}>completed today</Text>
              <ProgressBar percent={habitCompletionPercent} color={colors.habits} trackColor={dashboardTrack} />
              <MiniLineStats data={habitsWeekSeries} accent={colors.habits} muted={dashboardHint} />
              <Text style={[styles.detailLine, { color: dashboardMuted }]}>
                Best active streak <Text style={{ color: dashboardText }}>{topHabitStreak} days</Text>
              </Text>
            </>
          ) : (
            <EmptyStateCopy title="No habits to analyze" body="Add habits to track consistency and streaks." text={dashboardText} muted={dashboardMuted} />
          )}
          </DashboardCard>

          <DashboardCard
            title="Notes activity"
            subtitle={notesSummary.total ? 'Recently updated notes in the last 7 days' : 'No notes saved yet'}
            icon="document-text-outline"
            accent={colors.notes}
            onPress={() => navigation.navigate('NotesTab')}
            cardBg={dashboardCardBg}
            cardBorder={dashboardBorder}
            textColor={dashboardText}
            mutedColor={dashboardMuted}
            hintColor={dashboardHint}
            surfaceColor={dashboardCardAlt}
            trackColor={dashboardTrack}
            compact={isCompact}
          >
          {notesSummary.total ? (
            <>
              <View style={styles.splitHeadlineRow}>
                <View>
                  <Text style={[styles.metricDisplay, { color: dashboardText }]}>{notesSummary.total}</Text>
                  <Text style={[styles.metricSubtext, { color: dashboardMuted }]}>saved notes</Text>
                </View>
                <View style={styles.rightHeadlineMeta}>
                  <Text style={[styles.chartMetaLabel, { color: dashboardMuted }]}>Pinned</Text>
                  <Text style={[styles.chartMetaValue, { color: dashboardText }]}>{notesSummary.pinned}</Text>
                </View>
              </View>
              <BarsChart data={notesWeekSeries} color={colors.notes} trackColor={dashboardTrack} labelColor={dashboardHint} compact />
              <View style={[styles.notePreviewCard, { backgroundColor: dashboardCardAlt, borderColor: dashboardBorder }]}>
                <Text style={[styles.notePreviewTitle, { color: dashboardText }]} numberOfLines={1}>
                  {notesSummary.latestTitle || 'Untitled'}
                </Text>
                <Text style={[styles.notePreviewMeta, { color: dashboardMuted }]}>
                  {notesSummary.latestUpdated ? `Updated ${displayDate(notesSummary.latestUpdated, 'MMM d')}` : 'No recent update'}
                </Text>
              </View>
            </>
          ) : (
            <EmptyStateCopy title="No note activity yet" body="Create a note and your recent writing activity will show up here." text={dashboardText} muted={dashboardMuted} />
          )}
          </DashboardCard>

          <DashboardCard
            title="Wallet flow"
            subtitle={wallets.length || walletSummary.monthTxCount ? 'Income and expenses this month' : 'No wallet activity'}
            icon="wallet-outline"
            accent={colors.wallet}
            onPress={() => navigation.navigate('JournalTab')}
            cardBg={dashboardCardBg}
            cardBorder={dashboardBorder}
            textColor={dashboardText}
            mutedColor={dashboardMuted}
            hintColor={dashboardHint}
            surfaceColor={dashboardCardAlt}
            trackColor={dashboardTrack}
            large
            compact={isCompact}
          >
          {wallets.length || walletSummary.monthTxCount ? (
            <>
              <View style={styles.chartHeaderRow}>
                <Text style={[styles.chartBigValue, { color: dashboardText }]}>{formatMoney(walletSummary.balance)}</Text>
                <View style={styles.chartMetaCol}>
                  <Text style={[styles.chartMetaLabel, { color: dashboardMuted }]}>This month</Text>
                  <Text style={[styles.chartMetaValue, { color: dashboardText }]}>{walletSummary.monthTxCount} entries</Text>
                </View>
              </View>
              <DualBarsChart data={walletWeekSeries} incomeColor={colors.tealMid} expenseColor={colors.wallet} trackColor={dashboardTrack} labelColor={dashboardHint} />
              <View style={styles.walletSummaryGrid}>
                <MetricBadge label="Income" value={formatMoney(walletSummary.income)} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
                <MetricBadge label="Expenses" value={formatMoney(walletSummary.expenses)} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
                <MetricBadge label="Net" value={formatMoney(walletSummary.income - walletSummary.expenses)} bg={dashboardCardAlt} border={dashboardBorder} text={dashboardText} muted={dashboardHint} />
              </View>
              <ProgressBar percent={walletExpensePercent} color={colors.wallet} trackColor={dashboardTrack} />
            </>
          ) : (
            <EmptyStateCopy title="No wallet analytics yet" body="Add income or expenses to see your monthly cash flow." text={dashboardText} muted={dashboardMuted} />
          )}
          </DashboardCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.lowerSectionTitle, { color: dashboardMuted }]}>Recent activity</Text>
          <View style={[styles.activityPanel, { backgroundColor: dashboardCardBg, borderColor: dashboardBorder }]}>
            <TimelineRow
              color={colors.health}
              label="Health"
              value={today?.createdAt ? `${displayDate(today.createdAt, 'MMM d')} log updated` : 'No health entry today'}
              text={dashboardText}
              muted={dashboardMuted}
              border={dashboardBorder}
              last={false}
            />
            <TimelineRow
              color={colors.habits}
              label="Habits"
              value={activeHabits.length ? `${habitsDoneToday} completions today` : 'No habits scheduled'}
              text={dashboardText}
              muted={dashboardMuted}
              border={dashboardBorder}
              last={false}
            />
            <TimelineRow
              color={colors.notes}
              label="Notes"
              value={notesSummary.latestUpdated ? `Latest note ${displayDate(notesSummary.latestUpdated, 'MMM d')}` : 'No notes yet'}
              text={dashboardText}
              muted={dashboardMuted}
              border={dashboardBorder}
              last={false}
            />
            <TimelineRow
              color={colors.wallet}
              label="Wallet"
              value={transactions[0]?.date ? `Latest transaction ${displayDate(transactions[0].date, 'MMM d')}` : 'No transactions yet'}
              text={dashboardText}
              muted={dashboardMuted}
              border={dashboardBorder}
              last
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function DashboardCard({
  title,
  subtitle,
  icon,
  accent,
  onPress,
  cardBg,
  cardBorder,
  textColor,
  mutedColor,
  surfaceColor,
  large = false,
  compact = false,
  children,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        large ? styles.cardLarge : compact ? styles.cardFull : null,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.994 : 1 }],
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIconWrap, { backgroundColor: surfaceColor, borderColor: cardBorder }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
        <View style={styles.cardHeadingCopy}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: mutedColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={15} color={accent} />
      </View>
      {children}
    </Pressable>
  );
}

function TopMetric({ label, value, color, textColor, mutedColor }) {
  return (
    <View style={styles.topMetric}>
      <View style={[styles.topMetricDot, { backgroundColor: color }]} />
      <Text style={[styles.topMetricLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.topMetricValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function MetricBadge({ label, value, bg, border, text, muted }) {
  return (
    <View style={[styles.metricBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.metricBadgeLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.metricBadgeValue, { color: text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function EmptyStateCopy({ title, body, text, muted }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: muted }]}>{body}</Text>
    </View>
  );
}

function ProgressBar({ percent, color, trackColor }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

function BarsChart({ data, color, trackColor, labelColor, compact = false }) {
  return (
    <View style={[styles.barsWrap, compact ? styles.barsWrapCompact : null]}>
      <View style={styles.barsRow}>
        {data.map((item) => (
          <View key={item.key} style={styles.barItem}>
            <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
              <View style={[styles.barFill, { height: `${item.percent || 10}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.barLabel, { color: labelColor }]}>{item.short}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReferenceChartPanel({
  title,
  leftScale,
  rightScale,
  barLabel,
  lineLabel,
  barColor,
  lineColor,
  data,
  linePoints,
  muted,
  hint,
  track,
  text,
}) {
  return (
    <View style={styles.referenceChartWrap}>
      <View style={styles.referenceChartTop}>
        <Text style={[styles.referenceChartTitle, { color: muted }]}>{title}</Text>
      </View>

      <View style={styles.referenceChartBody}>
        <View style={styles.referenceLeftAxis}>
          {leftScale.map((item) => (
            <Text key={item} style={[styles.referenceScaleText, { color: hint }]}>{item}</Text>
          ))}
        </View>

        <View style={styles.referencePlotArea}>
          <View style={styles.referenceGrid}>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <View key={row} style={[styles.referenceGridLine, { borderColor: track }]} />
            ))}
          </View>

          <View style={styles.referenceBarsRow}>
            {data.map((item) => (
              <View key={item.key} style={styles.referenceBarColumn}>
                <View style={[styles.referenceBarTrack, { backgroundColor: track }]}>
                  <View style={[styles.referenceBarFill, { height: `${item.percent}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.referenceLineOverlay, { borderLeftColor: '#2FA7FF' }]}>
            <Svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.svgFill}>
              <Polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="1.8"
                points={linePoints}
              />
            </Svg>
          </View>
        </View>

        <View style={styles.referenceRightAxis}>
          {rightScale.map((item) => (
            <Text key={item} style={[styles.referenceScaleText, { color: lineColor }]}>{item}</Text>
          ))}
        </View>
      </View>

      <View style={styles.referenceLegendRow}>
        <LegendDot color={barColor} label={barLabel} labelColor={hint} />
        <LegendDot color={lineColor} label={lineLabel} labelColor={hint} />
      </View>
    </View>
  );
}

function DualBarsChart({ data, incomeColor, expenseColor, trackColor, labelColor }) {
  return (
    <View style={styles.dualWrap}>
      <View style={styles.dualLegendRow}>
        <LegendDot color={incomeColor} label="Income" labelColor={labelColor} />
        <LegendDot color={expenseColor} label="Expenses" labelColor={labelColor} />
      </View>
      <View style={styles.dualBarsRow}>
        {data.map((item) => (
          <View key={item.key} style={styles.dualBarItem}>
            <View style={styles.dualTracks}>
              <View style={[styles.dualTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.dualFill, { height: `${item.incomePercent}%`, backgroundColor: incomeColor }]} />
              </View>
              <View style={[styles.dualTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.dualFill, { height: `${item.expensePercent}%`, backgroundColor: expenseColor }]} />
              </View>
            </View>
            <Text style={[styles.barLabel, { color: labelColor }]}>{item.short}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniLineStats({ data, accent, muted }) {
  return (
    <View style={styles.miniLineRow}>
      {data.map((item) => (
        <View key={item.key} style={styles.miniLineCol}>
          <View style={[styles.miniLineTrack, { backgroundColor: muted + '20' }]}>
            <View style={[styles.miniLineFill, { width: `${Math.max(10, item.value)}%`, backgroundColor: accent }]} />
          </View>
          <Text style={[styles.miniLineLabel, { color: muted }]}>{item.short}</Text>
        </View>
      ))}
    </View>
  );
}

function LegendDot({ color, label, labelColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function TimelineRow({ color, label, value, text, muted, border, last }) {
  return (
    <View style={[styles.timelineRow, !last ? { borderBottomColor: border, borderBottomWidth: 1 } : null]}>
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
      <View style={styles.timelineCopy}>
        <Text style={[styles.timelineTitle, { color: text }]}>{label}</Text>
        <Text style={[styles.timelineValue, { color: muted }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  dashboardShell: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    ...SHADOWS.soft,
  },
  heroPanel: {
    borderRadius: 22,
    borderWidth: 0,
    gap: 18,
    padding: 4,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  heroTitleWrap: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroStatsRowCompact: {
    gap: 12,
  },
  topMetric: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
  },
  topMetricDot: {
    borderRadius: 4,
    height: 8,
    width: 24,
  },
  topMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  topMetricValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: 156,
    flexGrow: 1,
    gap: 14,
    minHeight: 212,
    padding: 14,
    ...SHADOWS.subtle,
  },
  cardLarge: {
    flexBasis: '100%',
  },
  cardFull: {
    flexBasis: '100%',
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  cardIconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cardHeadingCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  chartHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartBigValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  chartMetaCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  chartMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chartMetaValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  pillMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBadge: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexBasis: 84,
    flexGrow: 1,
    gap: 4,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricBadgeValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  barsWrap: {
    gap: 10,
  },
  referenceChartWrap: {
    gap: 10,
  },
  referenceChartTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  referenceChartTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  referenceChartBody: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 8,
    minHeight: 176,
  },
  referenceLeftAxis: {
    justifyContent: 'space-between',
    paddingVertical: 6,
    width: 28,
  },
  referenceRightAxis: {
    justifyContent: 'space-between',
    paddingVertical: 6,
    width: 34,
    alignItems: 'flex-end',
  },
  referenceScaleText: {
    fontSize: 9,
    fontWeight: '700',
  },
  referencePlotArea: {
    flex: 1,
    minHeight: 176,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  referenceGrid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  referenceGridLine: {
    borderTopWidth: 1,
  },
  referenceBarsRow: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 10,
    paddingTop: 6,
  },
  referenceBarColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  referenceBarTrack: {
    borderRadius: 4,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  referenceBarFill: {
    borderRadius: 4,
    width: '100%',
  },
  referenceLineOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderLeftWidth: 2,
    left: '10%',
  },
  svgFill: {
    width: '100%',
    height: '100%',
  },
  referenceLegendRow: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 2,
  },
  barsWrapCompact: {
    marginTop: 'auto',
  },
  barsRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    height: 112,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  barTrack: {
    borderRadius: 8,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    borderRadius: 8,
    width: '100%',
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  metricDisplay: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  metricSubtext: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
  },
  progressTrack: {
    borderRadius: RADIUS.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: RADIUS.pill,
    height: 8,
  },
  miniLineRow: {
    gap: 7,
  },
  miniLineCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLineTrack: {
    flex: 1,
    borderRadius: RADIUS.pill,
    height: 6,
    overflow: 'hidden',
  },
  miniLineFill: {
    borderRadius: RADIUS.pill,
    height: 6,
  },
  miniLineLabel: {
    fontSize: 9,
    fontWeight: '700',
    width: 10,
    textAlign: 'center',
  },
  detailLine: {
    fontSize: 12,
    lineHeight: 18,
  },
  splitHeadlineRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rightHeadlineMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  notePreviewCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  notePreviewTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  notePreviewMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  dualWrap: {
    gap: 10,
  },
  dualLegendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  dualBarsRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    height: 120,
  },
  dualBarItem: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  dualTracks: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  dualTrack: {
    borderRadius: 8,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dualFill: {
    borderRadius: 8,
    width: '100%',
  },
  walletSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyWrap: {
    gap: 6,
    marginTop: 'auto',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  lowerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  activityPanel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingVertical: 10,
  },
  timelineDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineValue: {
    fontSize: 12,
    lineHeight: 17,
  },
});
