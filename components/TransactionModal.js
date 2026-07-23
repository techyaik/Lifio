import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { InputField } from './InputField';
import { Pill } from './Pill';
import { PrimaryButton } from './PrimaryButton';
import { RADIUS, SHADOWS } from '../constants/theme';
import { format, parseISO } from 'date-fns';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Fun', 'Shopping', 'Health', 'Travel', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Mobile Pay', 'Other'];

export function TransactionModal({
  visible,
  onClose,
  transaction,
  wallets,
  onSave,
  currency,
  currencies = [],
  onCurrencyChange,
}) {
  const { colors } = useTheme();
  const activeCurrency = currency || { code: 'USD', symbol: '$', label: 'USD' };

  const [type, setType] = useState('out'); // 'out' | 'in' | 'transfer'
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  // Sync state with selected transaction or defaults
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (transaction) {
      setType(transaction.type || 'out');
      setDate(transaction.date || today);
      setLabel(transaction.label || '');
      setAmount(String(transaction.amount ?? ''));
      setSelectedWalletId(transaction.walletId || transaction.fromWalletId || (wallets[0]?.id ?? ''));
      setToWalletId(transaction.toWalletId || (wallets[1]?.id ?? wallets[0]?.id ?? ''));
      setCategory(transaction.cat || '');
      setPaymentMethod(transaction.paymentMethod || PAYMENT_METHODS[0]);
      setNotes(transaction.notes || '');
    } else {
      setType('out');
      setDate(today);
      setLabel('');
      setAmount('');
      setSelectedWalletId(wallets[0]?.id ?? '');
      setToWalletId(wallets[1]?.id ?? wallets[0]?.id ?? '');
      setCategory(EXPENSE_CATEGORIES[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNotes('');
    }
  }, [transaction, visible, wallets]);

  // Adjust category when type changes
  useEffect(() => {
    if (!transaction) {
      if (type === 'out') {
        setCategory(EXPENSE_CATEGORIES[0]);
      } else if (type === 'in') {
        setCategory(INCOME_CATEGORIES[0]);
      } else {
        setCategory('Transfer');
      }
    }
  }, [type, transaction]);

  const handleSave = () => {
    const trimmedLabel = label.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedLabel) {
      Alert.alert('Description required', 'Please enter what this transaction was for.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number for the amount.');
      return;
    }

    // Validate Date format: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Invalid date format', 'Please use YYYY-MM-DD format (e.g. 2026-06-20).');
      return;
    }
    try {
      const parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) {
        Alert.alert('Invalid date value', 'Please enter a valid calendar date.');
        return;
      }
    } catch (e) {
      Alert.alert('Invalid date value', 'Please enter a valid calendar date.');
      return;
    }

    if (!selectedWalletId) {
      Alert.alert('Account required', 'Please select an account.');
      return;
    }

    if (type === 'transfer') {
      if (!toWalletId) {
        Alert.alert('Destination required', 'Please select a destination account.');
        return;
      }
      if (selectedWalletId === toWalletId) {
        Alert.alert('Invalid transfer', 'Source and destination accounts must be different.');
        return;
      }
    }

    const payload = {
      type,
      date,
      label: trimmedLabel,
      amount: parsedAmount,
      cat: type === 'transfer' ? 'Transfer' : category,
      paymentMethod,
      notes: notes.trim(),
    };

    if (type === 'transfer') {
      payload.fromWalletId = selectedWalletId;
      payload.toWalletId = toWalletId;
      payload.walletId = ''; // cleared
    } else {
      payload.walletId = selectedWalletId;
      payload.fromWalletId = '';
      payload.toWalletId = '';
    }

    if (transaction) {
      payload.id = transaction.id;
      payload.createdAt = transaction.createdAt;
      payload.updatedAt = new Date().toISOString();
    } else {
      payload.id = 'tx_' + Date.now().toString();
      payload.createdAt = new Date().toISOString();
      payload.updatedAt = payload.createdAt;
    }

    onSave(payload);
  };

  const categories = type === 'out' ? EXPENSE_CATEGORIES : type === 'in' ? INCOME_CATEGORIES : ['Transfer'];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {transaction ? 'Edit Transaction' : 'Log Transaction'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            {/* 1. Transaction Type Toggle Row */}
            <View style={[styles.typeRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Pressable
                onPress={() => setType('out')}
                style={[
                  styles.typeTab,
                  type === 'out' && {
                    backgroundColor: colors.white,
                    borderRadius: RADIUS.sm,
                    ...SHADOWS.subtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: type === 'out' ? colors.wallet : colors.textSecondary },
                  ]}
                >
                  Spent
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType('in')}
                style={[
                  styles.typeTab,
                  type === 'in' && {
                    backgroundColor: colors.white,
                    borderRadius: RADIUS.sm,
                    ...SHADOWS.subtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: type === 'in' ? colors.tealMid : colors.textSecondary },
                  ]}
                >
                  Got Paid
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType('transfer')}
                style={[
                  styles.typeTab,
                  type === 'transfer' && {
                    backgroundColor: colors.white,
                    borderRadius: RADIUS.sm,
                    ...SHADOWS.subtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: type === 'transfer' ? colors.habits : colors.textSecondary },
                  ]}
                >
                  Transfer
                </Text>
              </Pressable>
            </View>

            {/* Currency Selection */}
            {currencies.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Currency</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectorScroll}
                >
                  {currencies.map((item) => {
                    const isSelected = activeCurrency.code === item.code;
                    return (
                      <Pressable
                        key={item.code}
                        onPress={() => onCurrencyChange?.(item.code)}
                        style={[
                          styles.currencyCard,
                          { borderColor: colors.borderLight, backgroundColor: colors.surface },
                          isSelected && { borderColor: colors.wallet, backgroundColor: colors.accentLight.wallet },
                        ]}
                      >
                        <Text style={[styles.currencySymbol, { color: isSelected ? colors.wallet : colors.textPrimary }]}>
                          {item.symbol}
                        </Text>
                        <Text style={[styles.selectLabel, { color: isSelected ? colors.wallet : colors.textPrimary }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 2. Amount Input & Title Input */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1.2 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>For What?</Text>
                <InputField
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Lunch, Taxi, Salary"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 0.8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount ({activeCurrency.symbol})</Text>
                <InputField
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            {/* 3. Date Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Transaction Date</Text>
              <InputField
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* 4. Wallet Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {type === 'transfer' ? 'From Account' : 'Account'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                {wallets.map((w) => {
                  const isSelected = selectedWalletId === w.id;
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => setSelectedWalletId(w.id)}
                      style={[
                        styles.selectCard,
                        { borderColor: colors.borderLight, backgroundColor: colors.surface },
                        isSelected && { borderColor: w.color, backgroundColor: w.color + '15' },
                      ]}
                    >
                      <Ionicons name={w.icon || 'wallet'} size={15} color={isSelected ? w.color : colors.textSecondary} />
                      <Text style={[styles.selectLabel, { color: isSelected ? w.color : colors.textPrimary }]}>
                        {w.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5. Destination Wallet Selection (Only for Transfers) */}
            {type === 'transfer' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>To Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                  {wallets.map((w) => {
                    const isSelected = toWalletId === w.id;
                    const isDisabled = selectedWalletId === w.id;
                    return (
                      <Pressable
                        key={w.id}
                        disabled={isDisabled}
                        onPress={() => setToWalletId(w.id)}
                        style={[
                          styles.selectCard,
                          { borderColor: colors.borderLight, backgroundColor: colors.surface },
                          isDisabled && { opacity: 0.4 },
                          isSelected && { borderColor: w.color, backgroundColor: w.color + '15' },
                        ]}
                      >
                        <Ionicons name={w.icon || 'wallet'} size={15} color={isSelected ? w.color : colors.textSecondary} />
                        <Text style={[styles.selectLabel, { color: isSelected ? w.color : colors.textPrimary }]}>
                          {w.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 6. Category Selector (Not needed for transfers as it's default 'Transfer') */}
            {type !== 'transfer' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.categoriesRow}>
                  {categories.map((catName) => (
                    <Pill
                      key={catName}
                      label={catName}
                      selected={category === catName}
                      onPress={() => setCategory(catName)}
                      palette={type === 'in' ? colors.pillLearning : colors.pillFitness}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* 7. Payment Method Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Payment Method</Text>
              <View style={styles.categoriesRow}>
                {PAYMENT_METHODS.map((pm) => (
                  <Pill
                    key={pm}
                    label={pm}
                    selected={paymentMethod === pm}
                    onPress={() => setPaymentMethod(pm)}
                    palette={colors.pillOther}
                  />
                ))}
              </View>
            </View>

            {/* 8. Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
              <InputField
                value={notes}
                onChangeText={setNotes}
                multiline={true}
                placeholder="Add any extra transaction details..."
              />
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={transaction ? "Save Transaction" : "Add Transaction"}
                onPress={handleSave}
                color={type === 'out' ? colors.wallet : type === 'in' ? colors.tealMid : colors.habits}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '88%',
    ...SHADOWS.glow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    flexGrow: 0,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  typeRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
    marginBottom: 4,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectorScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  currencyCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    marginBottom: Platform.OS === 'ios' ? 24 : 0,
  },
});
