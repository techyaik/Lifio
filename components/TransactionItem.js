import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

const getCategoryMeta = (cat, colors) => {
  switch (cat) {
    case 'Food':
      return {
        icon: 'restaurant',
        color: colors.wallet,
        bg: colors.accentLight.wallet,
      };
    case 'Transport':
      return {
        icon: 'car',
        color: colors.pillHealth.text,
        bg: colors.accentLight.health,
      };
    case 'Bills':
      return {
        icon: 'receipt',
        color: colors.textSecondary,
        bg: colors.borderLight,
      };
    case 'Fun':
      return {
        icon: 'sparkles',
        color: colors.pillLearning.text,
        bg: colors.accentLight.habits,
      };
    case 'Transfer':
      return {
        icon: 'swap-horizontal',
        color: colors.pillLearning.text,
        bg: colors.accentLight.habits,
      };
    case 'Income':
      return {
        icon: 'arrow-down-circle',
        color: colors.tealMid,
        bg: colors.tealLight,
      };
    default: // 'Other'
      return {
        icon: 'card',
        color: colors.pillFitness.text,
        bg: colors.accentLight.notes,
      };
  }
};

export function TransactionItem({ transaction, onDelete, onPress, formatMoney, isLast }) {
  const { colors } = useTheme();
  const { label, cat, amount, type, paymentMethod, notes } = transaction;
  const meta = getCategoryMeta(cat, colors);

  const fmt = (n) => {
    if (formatMoney) return formatMoney(n);
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isIncome = type === 'in';
  const isTransfer = type === 'transfer';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.borderLight },
        isLast && { borderBottomWidth: 0 },
        pressed ? { backgroundColor: colors.surface } : null
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={15} color={meta.color} />
      </View>

      <View style={styles.textWrap}>
        <Text selectable style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {cat} • {paymentMethod || 'Other'}
          {notes ? '  💬' : ''}
        </Text>
      </View>

      <Text
        selectable
        style={[
          styles.amount,
          { color: isIncome ? colors.tealMid : isTransfer ? colors.textSecondary : colors.textPrimary },
        ]}
      >
        {isIncome ? '+' : isTransfer ? '⇆' : '-'}{fmt(amount)}
      </Text>

      <Pressable
        onPress={(event) => {
          event?.stopPropagation?.();
          onDelete?.();
        }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.deleteBtn,
          pressed ? { opacity: 0.6 } : null,
        ]}
      >
        <Ionicons name="close" size={16} color={colors.textHint} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
});
