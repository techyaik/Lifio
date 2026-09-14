import React from 'react';
import { Text as RNText } from 'react-native';
import { AppText as Text } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { TYPOGRAPHY } from '../constants/typography';

export function SectionHeader({ children }) {
  const { colors } = useTheme();
  return <Text style={[TYPOGRAPHY.section, { color: colors.textSecondary }]}>{children}</Text>;
}
