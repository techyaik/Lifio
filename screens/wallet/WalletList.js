import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, isToday, isYesterday, parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { FeatureWalkthrough } from '../../components/FeatureWalkthrough';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { WalletBalance } from '../../components/WalletBalance';
import { TransactionItem } from '../../components/TransactionItem';
import { WalletAccountList } from '../../components/WalletAccountList';
import { WalletModal } from '../../components/WalletModal';
import { TransactionModal } from '../../components/TransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { showToast } from '../../utils/feedback';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { WALKTHROUGH_STEPS } from '../../constants/walkthroughs';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Fun', 'Shopping', 'Health', 'Travel', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other'];
const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'out', label: 'Spent' },
  { key: 'in', label: 'Got Paid' },
  { key: 'transfer', label: 'Transfers' },
];

export default function WalletList({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Custom hook manages state automatically (wallets and transactions)
  const {
    wallets,
    transactions,
    loading,
    addWallet,
    editWallet,
    deleteWallet,
    addTransaction,
    editTransaction,
    deleteTransaction,
    refresh,
    currency,
    currencies,
    setCurrency,
    formatMoney,
  } = useWallet();

  const [month, setMonth] = useState(new Date());
  const [selectedWalletId, setSelectedWalletId] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All');

  // Modals visibility states
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Month navigation handlers
  const handlePrevMonth = () => setMonth((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setMonth((prev) => addMonths(prev, 1));

  const monthKey = format(month, 'yyyy-MM');
  const monthLabel = format(month, 'MMMM');

  // 1. Filter transactions by selected Month AND selected Account
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Month match check
      const matchesMonth = tx.date && tx.date.startsWith(monthKey);
      if (!matchesMonth) return false;

      // Account filter check
      if (selectedWalletId === 'all') return true;
      if (tx.type === 'transfer') {
        return tx.fromWalletId === selectedWalletId || tx.toWalletId === selectedWalletId;
      }
      return tx.walletId === selectedWalletId;
    });
  }, [transactions, monthKey, selectedWalletId]);

  // 2. Filter transactions by active Type & Category
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      // Type match check
      if (activeType !== 'all' && tx.type !== activeType) return false;

      // Category match check
      if (activeCategory !== 'All' && tx.cat !== activeCategory) return false;

      return true;
    });
  }, [monthTransactions, activeType, activeCategory]);

  // Compute category filters list dynamically depending on activeType
  const categoryFiltersList = useMemo(() => {
    const list = ['All'];
    if (activeType === 'out') {
      list.push(...EXPENSE_CATEGORIES);
    } else if (activeType === 'in') {
      list.push(...INCOME_CATEGORIES);
    } else if (activeType === 'transfer') {
      list.push('Transfer');
    } else {
      // 'all' type: combine all unique categories
      const combined = new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, 'Transfer']);
      list.push(...combined);
    }
    return list;
  }, [activeType]);

  // If the activeCategory is no longer available in the new list, reset it to 'All'
  React.useEffect(() => {
    if (!categoryFiltersList.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categoryFiltersList, activeCategory]);

  // If the selectedWalletId is no longer in the wallets list, fall back to 'all'
  React.useEffect(() => {
    if (selectedWalletId !== 'all' && wallets && wallets.length > 0) {
      const exists = wallets.some((w) => w.id === selectedWalletId);
      if (!exists) {
        setSelectedWalletId('all');
      }
    }
  }, [wallets, selectedWalletId]);

  // Calculate Monthly In/Out totals (transfers are excluded)
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    monthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'in') {
        // Income is a deposit to the active wallet (or any wallet if all selected)
        if (selectedWalletId === 'all' || tx.walletId === selectedWalletId) {
          totalIn += amt;
        }
      } else if (tx.type === 'out') {
        // Expense is a deduction from the active wallet
        if (selectedWalletId === 'all' || tx.walletId === selectedWalletId) {
          totalOut += amt;
        }
      }
    });

    return { totalIn, totalOut };
  }, [monthTransactions, selectedWalletId]);

  // Selected Account balance
  const activeBalance = useMemo(() => {
    if (selectedWalletId === 'all') {
      return wallets.reduce((sum, w) => sum + (w.balance ?? 0), 0);
    }
    const currentWallet = wallets.find((w) => w.id === selectedWalletId);
    return currentWallet ? currentWallet.balance : 0;
  }, [wallets, selectedWalletId]);

  // Group transaction list items with day headers
  const listData = useMemo(() => {
    const data = [];
    const grouped = {};

    filteredTransactions.forEach((tx) => {
      (grouped[tx.date] = grouped[tx.date] || []).push(tx);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((date) => {
      data.push({
        type: 'dateGroup',
        date,
        transactions: grouped[date],
      });
    });

    return data;
  }, [filteredTransactions]);

  const getDayHeaderLabel = (dateStr) => {
    try {
      const parsed = parseISO(dateStr);
      if (isToday(parsed)) return 'Today';
      if (isYesterday(parsed)) return 'Yesterday';
      return format(parsed, 'MMM d');
    } catch (e) {
      return dateStr;
    }
  };

  // Wallet Modal Handlers
  const handleAddWalletClick = () => {
    setEditingWallet(null);
    setWalletModalVisible(true);
  };

  const handleEditWalletClick = (wallet) => {
    setEditingWallet(wallet);
    setWalletModalVisible(true);
  };

  const handleSaveWallet = async (walletData) => {
    if (editingWallet) {
      await editWallet(walletData.id, walletData);
      Alert.alert('Account updated ✓', `Account "${walletData.name}" has been updated.`);
    } else {
      await addWallet(walletData);
      Alert.alert('Account created ✓', `Account "${walletData.name}" is ready.`);
    }
    setWalletModalVisible(false);
  };

  const handleDeleteWallet = async (id) => {
    if (wallets.length <= 1) {
      Alert.alert('Cannot delete', 'You must keep at least one active account.');
      return;
    }
    await deleteWallet(id);
    setSelectedWalletId('all');
    setWalletModalVisible(false);
    Alert.alert('Account deleted ✓', 'The account and all related logs were deleted.');
  };

  // Transaction Modal Handlers
  const handleAddTxClick = () => {
    setEditingTx(null);
    setTxModalVisible(true);
  };

  const handleEditTxClick = (tx) => {
    setEditingTx(tx);
    setTxModalVisible(true);
  };

  const handleSaveTx = async (txData) => {
    if (editingTx) {
      await editTransaction(txData.id, txData);
      Alert.alert('Transaction updated ✓', 'The transaction changes were saved.');
    } else {
      await addTransaction(txData);
      Alert.alert('Transaction logged ✓', 'The transaction has been added.');
    }
    setTxModalVisible(false);
  };

  const handleDeleteTxClick = (tx) => {
    if (!tx?.id) {
      Alert.alert('Could not delete transaction', 'This transaction is missing its saved ID.');
      return;
    }

    Alert.alert(
      'Delete Transaction?',
      `Delete "${tx.label}" for ${formatMoney(tx.amount)}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(tx.id);
              await refresh();
              setEditingTx((current) => (current?.id === tx.id ? null : current));
              showToast('Transaction deleted ✓');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Could not delete transaction', 'The transaction was not removed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const header = (
    <View style={styles.headerContainer}>
      <View style={{ paddingHorizontal: 24 }}>
        <AppHeader title="Wallet" showMenu={false} showSettings={false} />
      </View>

      {/* 1. Accounts Scroll list */}
      <WalletAccountList
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        onSelect={setSelectedWalletId}
        onEdit={handleEditWalletClick}
        onAdd={handleAddWalletClick}
        formatMoney={formatMoney}
      />

      {/* 2. Monthly Balance Tracker Card */}
      <View style={{ paddingHorizontal: 24 }}>
        <WalletBalance
          balance={activeBalance}
          totalIn={totals.totalIn}
          totalOut={totals.totalOut}
          monthLabel={monthLabel}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          formatMoney={formatMoney}
        />
      </View>

      {/* 3. Transaction Type Filters */}
      <View style={[styles.filterSection, { paddingHorizontal: 24 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Type</Text>
        <View style={styles.filterBar}>
          {TYPE_FILTERS.map((f) => (
            <Pill
              key={f.key}
              label={f.label}
              selected={activeType === f.key}
              onPress={() => setActiveType(f.key)}
              palette={colors.pillMindful}
            />
          ))}
        </View>
      </View>

      {/* 4. Category Filters Scrollbar */}
      <View style={styles.filterSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginLeft: 24 }]}>Category</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categoryFiltersList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={{ marginRight: 6 }}>
              <Pill
                label={item}
                selected={activeCategory === item}
                onPress={() => setActiveCategory(item)}
                palette={colors.pillFitness}
              />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 2 }}
        />
      </View>

      <Text style={[styles.historyHeader, { color: colors.textSecondary, marginLeft: 24 }]}>History</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Screen loading={loading} scroll={false} withBottomNav>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.date}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View>
              <View style={styles.sectionHeader}>
                <SectionHeader>{getDayHeaderLabel(item.date)}</SectionHeader>
              </View>
              <View style={[styles.itemBox, { backgroundColor: colors.surface }]}>
                {item.transactions.map((tx, idx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onPress={() => handleEditTxClick(tx)}
                    onDelete={() => handleDeleteTxClick(tx)}
                    formatMoney={formatMoney}
                    isLast={idx === item.transactions.length - 1}
                  />
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 24 }}>
              <EmptyState
                icon="wallet-outline"
                message="No transactions logged for these filters."
                accent={colors.wallet}
              />
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Screen>

      {/* Floating Transaction Creator Button */}
      {!loading && (
        <Pressable
          onPress={handleAddTxClick}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.wallet, opacity: pressed ? 0.9 : 1 },
            { bottom: (insets.bottom > 0 ? insets.bottom : 16) + 84 }
          ]}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      )}

      {/* Wallets Creator/Editor Modal */}
      {walletModalVisible && (
        <WalletModal
          visible={walletModalVisible}
          wallet={editingWallet}
          onClose={() => setWalletModalVisible(false)}
          onSave={handleSaveWallet}
          onDelete={handleDeleteWallet}
          currencySymbol={currency.symbol}
        />
      )}

      {/* Transactions Creator/Editor Modal */}
      {txModalVisible && (
        <TransactionModal
          visible={txModalVisible}
          transaction={editingTx}
          wallets={wallets}
          onClose={() => setTxModalVisible(false)}
          onSave={handleSaveTx}
          currency={currency}
          currencies={currencies}
          onCurrencyChange={setCurrency}
        />
      )}
      <FeatureWalkthrough screenKey="wallet" steps={WALKTHROUGH_STEPS.wallet} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    gap: 12,
    paddingTop: 8,
  },
  filterSection: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
  },
  historyHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  list: {
    gap: 12,
    paddingBottom: 160, // Space for FAB + floating navbar
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  itemBox: {
    marginHorizontal: 24,
    borderRadius: RADIUS.xl,
    paddingVertical: 4,
    ...SHADOWS.subtle,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...SHADOWS.glow,
  },
});
