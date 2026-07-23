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
import { PrimaryButton } from './PrimaryButton';
import { RADIUS, SHADOWS } from '../constants/theme';

const COLORS_LIST = [
  { key: 'blue', color: '#185FA5', label: 'Blue' },
  { key: 'purple', color: '#534AB7', label: 'Purple' },
  { key: 'yellow', color: '#BA7517', label: 'Yellow' },
  { key: 'red', color: '#993C1D', label: 'Red' },
  { key: 'teal', color: '#0F6E56', label: 'Teal' },
  { key: 'grey', color: '#5F5E5A', label: 'Grey' },
];

const ICONS_LIST = [
  'wallet-outline',
  'card-outline',
  'cash-outline',
  'business-outline',
  'briefcase-outline',
];

export function WalletModal({ visible, onClose, wallet, onSave, onDelete, currencySymbol = '$' }) {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS_LIST[0].color);
  const [selectedIcon, setSelectedIcon] = useState(ICONS_LIST[0]);

  useEffect(() => {
    if (wallet) {
      setName(wallet.name || '');
      setInitialBalance(String(wallet.initialBalance ?? 0));
      setSelectedColor(wallet.color || COLORS_LIST[0].color);
      setSelectedIcon(wallet.icon || ICONS_LIST[0]);
    } else {
      setName('');
      setInitialBalance('0');
      setSelectedColor(COLORS_LIST[0].color);
      setSelectedIcon(ICONS_LIST[0]);
    }
  }, [wallet, visible]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const parsedBalance = parseFloat(initialBalance);

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a name for the account.');
      return;
    }

    if (isNaN(parsedBalance)) {
      Alert.alert('Invalid balance', 'Please enter a valid number for initial balance.');
      return;
    }

    const payload = {
      name: trimmedName,
      initialBalance: parsedBalance,
      color: selectedColor,
      icon: selectedIcon,
    };

    if (wallet) {
      payload.id = wallet.id;
      payload.createdAt = wallet.createdAt;
    } else {
      payload.id = 'ac_' + Date.now().toString();
      payload.createdAt = new Date().toISOString();
    }

    onSave(payload);
  };

  const handleDelete = () => {
    if (!wallet) return;
    Alert.alert(
      'Delete Account?',
      `Are you sure you want to permanently delete "${wallet.name}"? All transactions in this account will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(wallet.id) },
      ]
    );
  };

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
              {wallet ? 'Edit Account' : 'New Account'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            {/* Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Account Name</Text>
              <InputField
                value={name}
                onChangeText={setName}
                placeholder="e.g. Credit Card, Savings, Cash"
              />
            </View>

            {/* Initial Balance */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Initial Balance ({currencySymbol})</Text>
              <InputField
                value={initialBalance}
                onChangeText={setInitialBalance}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>

            {/* Color Chooser */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Color theme</Text>
              <View style={styles.colorsGrid}>
                {COLORS_LIST.map((item) => {
                  const isSelected = selectedColor === item.color;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setSelectedColor(item.color)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: item.color },
                        isSelected && { borderColor: colors.textPrimary, borderWidth: 3 },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Icon Chooser */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconsGrid}>
                {ICONS_LIST.map((iconName) => {
                  const isSelected = selectedIcon === iconName;
                  return (
                    <Pressable
                      key={iconName}
                      onPress={() => setSelectedIcon(iconName)}
                      style={[
                        styles.iconOption,
                        { borderColor: colors.borderLight, backgroundColor: colors.surface },
                        isSelected && {
                          borderColor: selectedColor,
                          backgroundColor: selectedColor + '15',
                        },
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={20}
                        color={isSelected ? selectedColor : colors.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
            {wallet && (
              <Pressable
                onPress={handleDelete}
                style={[styles.deleteBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <PrimaryButton title={wallet ? "Save Changes" : "Create Account"} onPress={handleSave} color={selectedColor} />
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
    maxHeight: '85%',
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
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  colorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    marginBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  deleteBtn: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
