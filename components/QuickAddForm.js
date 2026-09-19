import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from "./LineIcon";
import { useTheme } from '../theme/ThemeContext';
import { InputField } from './InputField';
import { Pill } from './Pill';
import { RADIUS, SHADOWS } from '../constants/theme';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Fun', 'Other'];

export function QuickAddForm({ onAdd }) {
  const { colors } = useTheme();

  const [type, setType] = useState('out'); // 'in' | 'out'
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');

  const handleSubmit = () => {
    const trimmedLabel = label.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedLabel) {
      Alert.alert('Description required', 'Please describe what this transaction was for.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Valid amount required', 'Please enter a valid positive number for the amount.');
      return;
    }

    const transaction = {
      id: 'tx_' + Date.now().toString(),
      label: trimmedLabel,
      amount: parsedAmount,
      type,
      cat: type === 'in' ? 'Income' : category,
    };

    onAdd(transaction);

    // Reset inputs
    setLabel('');
    setAmount('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {/* 1. Transaction Type Toggle Row */}
      <View style={[styles.typeRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Pressable
          onPress={() => setType('out')}
          style={[
            styles.typeTab,
            type === 'out' && {
              backgroundColor: colors.surface,
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
              backgroundColor: colors.surface,
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
            Got paid
          </Text>
        </Pressable>
      </View>

      {/* 2. Category Selection (Pills) - Only shown for Expenses */}
      {type === 'out' ? (
        <View style={styles.categoryBlock}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoriesRow}>
            {EXPENSE_CATEGORIES.map((catName) => (
              <Pill
                key={catName}
                label={catName}
                selected={category === catName}
                onPress={() => setCategory(catName)}
                palette={colors.pillFitness}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* 3. Description & Amount Input Row */}
      <View style={styles.inputsRow}>
        <InputField
          value={label}
          onChangeText={setLabel}
          placeholder="What was it for?"
          style={styles.labelInput}
        />
        <InputField
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: type === 'in' ? colors.tealMid : colors.wallet },
            pressed ? { opacity: 0.8 } : null,
            SHADOWS.subtle,
          ]}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    ...SHADOWS.subtle,
  },
  typeRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelInput: {
    flex: 2,
    minHeight: 46,
  },
  amountInput: {
    flex: 1,
    minHeight: 46,
    textAlign: 'center',
  },
  submitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
