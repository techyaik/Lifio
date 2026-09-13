import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Pressable, ActivityIndicator, Modal, Animated, Dimensions, Image } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export function AppLockOverlay({ children }) {
  const { colors, gradients, appLockEnabled, ready, theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const appState = useRef(AppState.currentState);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Animation Values
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const isDark = theme === 'dark';

  useEffect(() => {
    if (isLocked) {
      // Entry Animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

      if (!isAuthenticating) {
        // Dual pulse effect for richer biometric scanner feel
        const startPulse = (anim, delay) => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(anim, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
            ])
          ).start();
        };

        startPulse(pulseAnim1, 0);
        startPulse(pulseAnim2, 1250);
      }
    } else {
      pulseAnim1.stopAnimation();
      pulseAnim1.setValue(0);
      pulseAnim2.stopAnimation();
      pulseAnim2.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    }
  }, [isLocked, isAuthenticating]);

  useEffect(() => {
    if (ready && appLockEnabled) {
      setIsLocked(true);
      // Slight delay before auto-authenticating for a smooth entry
      setTimeout(() => authenticate(), 600);
    }
  }, [ready, appLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        if (appLockEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled]);

  const authenticate = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Lifio',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.error('Authentication error:', e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getRingStyle = (anim) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1.4],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.15, 0.4, 0.0],
    }),
  });

  return (
    <View style={{ flex: 1 }}>
      {children}

      <Modal
        visible={isLocked}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {}} 
      >
        <View style={[styles.container, { backgroundColor: isDark ? '#050505' : '#FAFAFA' }]}>
          {/* Subtle Ambient Glow */}
          <View style={[styles.ambientGlow, { backgroundColor: colors.health, top: -height * 0.1, left: -width * 0.3 }]} />
          <View style={[styles.ambientGlow, { backgroundColor: colors.habits, bottom: -height * 0.1, right: -width * 0.3, opacity: 0.1 }]} />

          <Animated.View style={[
            styles.content,
            {
              paddingTop: Math.max(insets.top + 30, 40),
              paddingBottom: Math.max(insets.bottom + 20, 30),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            
            <View style={styles.topSection}>
              <View style={[styles.logoContainer, { shadowColor: isDark ? '#000' : colors.textPrimary }]}>
                <Image 
                  source={require('../assets/lifio-icon.png')} 
                  style={styles.logoImage} 
                  resizeMode="cover" 
                />
              </View>
              <Text style={[styles.greeting, { color: isDark ? '#FFFFFF' : '#111111' }]}>Lifio</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Secured by Biometrics</Text>
            </View>

            <View style={styles.centerSection}>
              <Animated.View style={[styles.pulseRing, { backgroundColor: colors.health }, getRingStyle(pulseAnim1)]} />
              <Animated.View style={[styles.pulseRing, { backgroundColor: colors.health }, getRingStyle(pulseAnim2)]} />
              
              <Pressable
                onPress={authenticate}
                disabled={isAuthenticating}
                style={({pressed}) => [
                  styles.iconButton,
                  { shadowColor: colors.health },
                  pressed && { transform: [{ scale: 0.96 }] }
                ]}
              >
                <LinearGradient
                  colors={gradients.health || [colors.health, colors.health]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="finger-print" size={54} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.footerWrap}>
              <View style={styles.bottomSection}>
                {isAuthenticating ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.health} size="small" />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Authenticating...</Text>
                  </View>
                ) : (
                  <Pressable onPress={authenticate} style={({pressed}) => [pressed && {opacity: 0.6}]}>
                    <Text style={[styles.tapText, { color: colors.health }]}>Tap to Unlock</Text>
                  </Pressable>
                )}
              </View>
              
              <View style={styles.securityMessageContainer}>
                <Ionicons name="lock-closed" size={12} color={colors.textHint} style={{ marginRight: 6 }} />
                <Text style={[styles.securityMessage, { color: colors.textHint }]}>
                  Your personal data is encrypted and securely stored on device.
                </Text>
              </View>
            </View>

          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    opacity: 0.12, // slightly softer
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 68,
    height: 68,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    fontSize: 40,
    fontWeight: '400', // Better cross-platform support than 300
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  centerSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  iconButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bottomSection: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  tapText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  securityMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  securityMessage: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
  },
});
