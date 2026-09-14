import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

export function AppText(props) {
  const { style, ...rest } = props;
  
  // Extract font weight if it exists in the style array or object
  let weight = '400';
  if (Array.isArray(style)) {
    const flattened = StyleSheet.flatten(style);
    if (flattened?.fontWeight) weight = String(flattened.fontWeight);
  } else if (style?.fontWeight) {
    weight = String(style.fontWeight);
  }

  // Map weights to the Urbanist font family
  let fontFamily = 'Urbanist_400Regular';
  if (weight === '300') fontFamily = 'Urbanist_300Light';
  if (weight === '500') fontFamily = 'Urbanist_500Medium';
  if (weight === '600') fontFamily = 'Urbanist_600SemiBold';
  if (weight === '700' || weight === 'bold') fontFamily = 'Urbanist_700Bold';
  if (weight === '800') fontFamily = 'Urbanist_800ExtraBold';

  // CRITICAL FIX: React Native on Android will ignore the custom fontFamily and fallback to the system font
  // if fontWeight or fontStyle is passed alongside a custom font that doesn't have those weights defined natively.
  // We must strip fontWeight from the final style array.
  
  let finalStyle = style;
  if (style) {
    const flattened = StyleSheet.flatten(style);
    if (flattened) {
      const { fontWeight, fontStyle, ...restStyles } = flattened;
      finalStyle = restStyles;
    }
  }

  return <RNText {...rest} style={[finalStyle, { fontFamily }]} />;
}
