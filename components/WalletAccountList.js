import React from 'react';
import { ScrollView, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function WalletAccountList({ wallets, selectedWalletId, onSelect, onEdit, onAdd, formatMoney }) {
  const { colors } = useTheme();

  const fmt = (n) => {
    if (formatMoney) return formatMoney(n);
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const aggregateBalance = wallets.reduce((sum, w) => sum + (w.balance ?? 0), 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>My Accounts</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* "All" Card */}
        <Pressable
          onPress={() => onSelect('all')}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
            selectedWalletId === 'all' && { borderColor: colors.health, borderWidth: 2 },
            SHADOWS.subtle,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name="grid-outline" size={16} color={colors.pillHealth.text} />
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>All Accounts</Text>
          <Text style={[styles.balance, { color: colors.textPrimary }]}>{fmt(aggregateBalance)}</Text>
        </Pressable>

        {/* Individual Wallet Cards */}
        {wallets.map((w) => {
          const isSelected = selectedWalletId === w.id;
          return (
            <Pressable
              key={w.id}
              onPress={() => onSelect(w.id)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
                isSelected && { borderColor: w.color, borderWidth: 2 },
                SHADOWS.subtle,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: w.color + '15' }]}>
                  <Ionicons name={w.icon || 'wallet-outline'} size={16} color={w.color} />
                </View>
                <Pressable
                  onPress={() => onEdit(w)}
                  hitSlop={8}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil-sharp" size={12} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {w.name}
              </Text>
              <Text style={[styles.balance, { color: colors.textPrimary }]} numberOfLines={1}>
                {fmt(w.balance ?? 0)}
              </Text>
            </Pressable>
          );
        })}

        {/* "Add" Card */}
        <Pressable
          onPress={onAdd}
          style={[
            styles.card,
            styles.addCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight, borderStyle: 'dashed' },
          ]}
        >
          <Ionicons name="add" size={24} color={colors.textSecondary} />
          <Text style={[styles.addText, { color: colors.textSecondary }]}>Add Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 24,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    gap: 10,
  },
  card: {
    width: 130,
    height: 110,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    padding: 4,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  balance: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  addText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
