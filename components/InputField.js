import React from 'react';
import { StyleSheet, TextInput as RNTextInput } from 'react-native';
import { AppTextInput as TextInput } from './AppTextInput';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../constants/theme';

export function InputField(props) {
  const { colors } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.textHint}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          color: colors.textPrimary,
        },
        props.multiline ? styles.multiline : null,
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 108,
    textAlignVertical: 'top',
  },
});
