import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { InputField } from '../../../components/InputField';
import { Pill } from '../../../components/Pill';
import { useTheme } from '../../../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../../../constants/theme';
import { FLOW_LEVELS, ENERGY_LEVELS, HEALTH_MOODS, SYMPTOMS } from '../../../hooks/useHealth';

export function StepProgressBar({ currentStep, totalSteps, activeColor }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepProgressRow}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              backgroundColor: i === currentStep ? activeColor : i < currentStep ? `${activeColor}80` : colors.surfaceTint,
              width: i === currentStep ? 36 : 12,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function NavFooterButtons({ onBack, onNext, isSaving, isFirstStep, isLastStep, backLabel = 'Cancel', nextLabel = 'Next Step', activeColor = '#2D6A4F' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.navFooter}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBack}
        style={[styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: '#94A3B8' }]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        <Text style={[styles.navButtonTextSecondary, { color: colors.textPrimary }]}>
          {isFirstStep ? backLabel : 'Back'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onNext}
        disabled={isSaving}
        style={[styles.navButtonPrimary, { backgroundColor: activeColor }]}
      >
        <Text style={styles.navButtonTextPrimary}>
          {isSaving ? 'Saving...' : isLastStep ? nextLabel : 'Next Step'}
        </Text>
        {!isLastStep && <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  navFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  navButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 6,
  },
  navButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.subtle,
  },
  navButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
  },
  navButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
