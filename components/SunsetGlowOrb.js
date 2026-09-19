import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Circle, Ellipse, G } from 'react-native-svg';

/**
 * Polished vector illustration recreating the signature glowing sunset orb
 * with radiant orange core and dreamy lavender/violet atmospheric aura.
 *
 * Supports two variants:
 * - 'semi': semi-circular glow rising from the bottom (Activity card)
 * - 'circle': compact floating radial aura sphere (Intensity card)
 */
export function SunsetGlowOrb({
  width = 150,
  height = 90,
  variant = 'semi', // 'semi' | 'circle'
  style,
}) {
  if (variant === 'circle') {
    const size = Math.min(width, height);
    const radius = size / 2;

    return (
      <View style={[styles.container, { width: size, height: size }, style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            {/* Outer Lavender / Purple Halo */}
            <RadialGradient
              id="lavenderAura"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.75" />
              <Stop offset="45%" stopColor="#DDD6FE" stopOpacity="0.45" />
              <Stop offset="75%" stopColor="#E0E7FF" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            {/* Inner Vibrant Sunset Orange Core */}
            <RadialGradient
              id="orangeCore"
              cx="50%"
              cy="50%"
              rx="40%"
              ry="40%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#FF4500" stopOpacity="1" />
              <Stop offset="30%" stopColor="#FF5722" stopOpacity="0.95" />
              <Stop offset="65%" stopColor="#FF7A45" stopOpacity="0.8" />
              <Stop offset="90%" stopColor="#FFA07A" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFA07A" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Outer Atmospheric Aura */}
          <Circle cx={radius} cy={radius} r={radius} fill="url(#lavenderAura)" />

          {/* Core Sunset Orb */}
          <Circle cx={radius} cy={radius} r={radius * 0.65} fill="url(#orangeCore)" />
        </Svg>
      </View>
    );
  }

  // Semi-circle rising from bottom (Activity card)
  return (
    <View style={[styles.container, { width, height }, style]} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Lavender / Purple Atmospheric Aura */}
          <RadialGradient
            id="semiLavenderAura"
            cx="50%"
            cy="100%"
            rx="60%"
            ry="90%"
            fx="50%"
            fy="100%"
          >
            <Stop offset="0%" stopColor="#B8A4FF" stopOpacity="0.75" />
            <Stop offset="35%" stopColor="#C4B5FD" stopOpacity="0.5" />
            <Stop offset="70%" stopColor="#E9D5FF" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          {/* Warm Amber Mid Glow */}
          <RadialGradient
            id="semiMidGlow"
            cx="50%"
            cy="100%"
            rx="45%"
            ry="70%"
            fx="50%"
            fy="100%"
          >
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9" />
            <Stop offset="40%" stopColor="#FF7A45" stopOpacity="0.7" />
            <Stop offset="80%" stopColor="#C084FC" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
          </RadialGradient>

          {/* Vibrant Sunset Orange Core Orb */}
          <RadialGradient
            id="semiOrangeCore"
            cx="50%"
            cy="100%"
            rx="32%"
            ry="55%"
            fx="50%"
            fy="100%"
          >
            <Stop offset="0%" stopColor="#FF3D00" stopOpacity="1" />
            <Stop offset="35%" stopColor="#FF5722" stopOpacity="0.98" />
            <Stop offset="70%" stopColor="#FF7043" stopOpacity="0.85" />
            <Stop offset="90%" stopColor="#FF8A65" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FF8A65" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Layer 1: Ambient purple aura */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#semiLavenderAura)" />

        {/* Layer 2: Mid orange-to-purple transition */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#semiMidGlow)" />

        {/* Layer 3: Solid vibrant sunset core rising from bottom */}
        <Ellipse
          cx={width / 2}
          cy={height + 5}
          rx={width * 0.35}
          ry={height * 0.65}
          fill="url(#semiOrangeCore)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

