import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, StyleSheet } from 'react-native';

export const AppTextInput = forwardRef((props, ref) => {
  const { style, ...rest } = props;
  
  let weight = '400';
  if (Array.isArray(style)) {
    const flattened = StyleSheet.flatten(style);
    if (flattened?.fontWeight) weight = String(flattened.fontWeight);
  } else if (style?.fontWeight) {
    weight = String(style.fontWeight);
  }

  let fontFamily = 'Urbanist_400Regular';
  if (weight === '100' || weight === '200' || weight === '300') fontFamily = 'Urbanist_300Light';
  if (weight === '400' || weight === 'normal') fontFamily = 'Urbanist_400Regular';
  if (weight === '500') fontFamily = 'Urbanist_500Medium';
  if (weight === '600') fontFamily = 'Urbanist_600SemiBold';
  if (weight === '700' || weight === 'bold') fontFamily = 'Urbanist_700Bold';
  if (weight === '800' || weight === '900') fontFamily = 'Urbanist_800ExtraBold';

  let finalStyle = style;
  if (style) {
    const flattened = StyleSheet.flatten(style);
    if (flattened) {
      const { fontWeight, fontStyle, ...restStyles } = flattened;
      finalStyle = restStyles;
    }
  }

  return <RNTextInput ref={ref} {...rest} style={[finalStyle, { fontFamily }]} />;
});
