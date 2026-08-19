import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Pressable, Animated, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../constants/theme';

export function AppLockOverlay({ children }) {
  const { colors, appLockEnabled, ready } = useTheme();
  
  const appState = useRef(AppState.currentState);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

      {isLocked && (
        <Animated.View style={[styles.overlay, { backgroundColor: colors.bg }]}>
          <View style={styles.content}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name="lock-closed" size={32} color={colors.health} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>App Locked</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Use biometrics or your device passcode to access Lifio.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.health },
                pressed && { opacity: 0.8 },
              ]}
              onPress={authenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>Tap to Unlock</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 300,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    minWidth: 160,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
