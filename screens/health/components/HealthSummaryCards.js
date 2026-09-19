import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from "../../../components/LineIcon";
import Svg, { Path } from 'react-native-svg';
import { AppText as Text } from '../../../components/AppText';
import { useTheme } from '../../../theme/ThemeContext';
import { percent, getLast7DaysData } from '../healthHelpers';

export function BentoCard({ children, style }) {
  const { colors } = useTheme();
  return <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }, style]}>{children}</View>;
}

export function ProgressLine({ label, value, detail, color }) {
  const { colors } = useTheme();
  return (
    <View style={styles.progressLine}>
      <View style={styles.progressTop}>
        <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceTint }]}>
        <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function MiniBars({ logs, field, goal }) {
  const { colors } = useTheme();
  const data = getLast7DaysData(logs, field);
  return (
    <View style={styles.miniBars}>
      {data.map((item, index) => {
        const height = Math.max(8, Math.min(46, percent(item[field], goal || Math.max(...data.map((d) => Number(d[field]) || 0), 1)) * 0.46));
        return <View key={item.id || index} style={[styles.miniBar, { height, backgroundColor: index === data.length - 1 ? colors.health : colors.accentLight.health }]} />;
      })}
    </View>
  );
}

export function SourceBadge({ source, colors }) {
  if (source === 'HEALTH_CONNECT') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="checkmark-circle" size={13} color={colors.pillHealth.text} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.pillHealth.text }}>Synced</Text>
      </View>
    );
  }
  if (source === 'MANUAL') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Manual</Text>
      </View>
    );
  }
  return null;
}

export function HalfRingChart({ size = 160, strokeWidth = 24, percent = 0, color, trackColor }) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const path = `M ${strokeWidth/2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${cy}`;
  
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <View style={{ width: size, height: size / 2 + 10, alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + strokeWidth / 2}>
        <Path d={path} stroke={trackColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        <Path 
          d={path} 
          stroke={color} 
          strokeWidth={strokeWidth} 
          fill="none" 
          strokeLinecap="round" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
        />
      </Svg>
    </View>
  );
}

export function SegmentedBar({ heightPct, colors, isLast }) {
  const totalSegments = 10;
  const activeSegments = Math.round((heightPct / 100) * totalSegments);
  
  return (
    <View style={{ height: 120, width: 12, justifyContent: 'space-between' }}>
      {Array.from({ length: totalSegments }).map((_, i) => {
        const isActive = (totalSegments - i) <= activeSegments;
        return (
          <View 
            key={i} 
            style={{ 
              height: 10, 
              width: 12, 
              borderRadius: 3, 
              backgroundColor: isActive ? (isLast ? colors.primary : colors.health) : colors.surfaceTint 
            }} 
          />
        );
      })}
    </View>
  );
}

export function LargeBars({ logs, field, goal, colors }) {
  const recent = [...logs].slice(0, 7).reverse();
  const data = recent.length ? recent : Array.from({ length: 7 }, (_, index) => ({ id: String(index), [field]: 0 }));
  const maxVal = Math.max(...data.map((d) => Number(d[field]) || 0), goal || 1);
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', width: '100%' }}>
      {data.map((item, index) => {
        const val = Number(item[field]) || 0;
        const heightPct = Math.max(0, Math.min(100, (val / maxVal) * 100));
        return (
          <View key={item.id || index} style={{ alignItems: 'center' }}>
            <SegmentedBar heightPct={heightPct} colors={colors} isLast={index === data.length - 1} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  progressLine: {
    gap: 6,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressDetail: {
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  miniBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
  },
  miniBar: {
    flex: 1,
    borderRadius: 4,
  },
});
