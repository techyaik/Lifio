import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/Screen';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { RADIUS, SHADOWS } from '../constants/theme';

const LOGO = require('../assets/lifio-logo.png');

export default function EnterName({ onSave }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const hintText = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'We will use your name to personalize Lifio locally on this device.';
    }
    return `Nice to meet you, ${trimmed.split(/\s+/)[0]}.`;
  }, [name]);

  const handleSave = async () => {
    const trimmed = String(name || '').trim().replace(/\s+/g, ' ');
    if (saving) return;
    if (!trimmed) {
      setError('Enter your name to continue.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Use at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (saveError) {
      setError(saveError?.message || 'Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.root}>
          <View style={[styles.brandCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <Image source={LOGO} style={styles.logo} />
            <View style={styles.copyBlock}>
              <Text style={[styles.eyebrow, { color: colors.health }]}>Welcome to Lifio</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>What should we call you?</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                No account setup, no password. Just your name, saved on this device, so the app feels more personal from the start.
              </Text>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Your name</Text>
            <InputField
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError('');
              }}
              placeholder="Enter your name"
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!saving}
              maxLength={40}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={handleSave}
            />

            <View style={[styles.hintRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="sparkles-outline" size={15} color={colors.health} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>{hintText}</Text>
            </View>

            {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

            <PrimaryButton
              title={saving ? 'Saving...' : 'Continue'}
              onPress={handleSave}
              disabled={saving}
              color={colors.health}
              icon={<Ionicons name="arrow-forward" size={17} />}
            />

            <View style={styles.footerHint}>
              <Text style={[styles.footerHintText, { color: colors.textHint }]}>
                You can change this later from Settings.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  brandCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
    ...SHADOWS.soft,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  copyBlock: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    ...SHADOWS.soft,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hintRow: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerHint: {
    alignItems: 'center',
    paddingTop: 2,
  },
  footerHintText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
