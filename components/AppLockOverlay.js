import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Pressable, ActivityIndicator, Modal, Animated } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function AppLockOverlay({ children }) {
  const { colors, gradients, appLockEnabled, ready } = useTheme();
  const insets = useSafeAreaInsets();
  
  const appState = useRef(AppState.currentState);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the lock icon
  useEffect(() => {
    if (isLocked && !isAuthenticating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLocked, isAuthenticating, pulseAnim]);

  // When app Lock is enabled for the very first time (or loaded),
  // we should start locked. We do this when the `ready` flag from theme is true.
  useEffect(() => {
    if (ready && appLockEnabled) {
      setIsLocked(true);
      authenticate();
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
        // Fallback: If hardware is unavailable or not enrolled, unlock.
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

  return (
    <View style={{ flex: 1 }}>
      {children}

      <Modal
        visible={isLocked}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {}} 
      >
        <LinearGradient 
          colors={gradients.page} 
          style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.content}>
            <Animated.View style={[
              styles.iconWrap, 
              { 
                backgroundColor: colors.surfaceElevated, 
                shadowColor: colors.overlay,
                transform: [{ scale: pulseAnim }]
              }
            ]}>
              <Ionicons name="lock-closed" size={36} color={colors.health} />
            </Animated.View>
            
            <Text style={[styles.title, { color: colors.textPrimary }]}>Lifio is Locked</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Unlock with biometrics to securely access your personal dashboard.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.health, shadowColor: colors.health },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              onPress={authenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="finger-print" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={[styles.buttonText, { color: colors.white }]}>Unlock</Text>
                </>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 320,
    width: '100%',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100, // True pill shape
    width: '100%',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
