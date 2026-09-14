import React, { useEffect, useState, useRef } from 'react';
import { View, Text as RNText, StyleSheet, AppState, Pressable, ActivityIndicator, Modal } from 'react-native';
import { AppText as Text } from './AppText';
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
      authenticate(); // auto-prompt on launch
    }
  }, [ready, appLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App went to background
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

      // If they turned on App Lock but removed their device passcode/biometrics,
      // we gracefully let them in or handle it. Let's let them in for safety.
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

  return (
    <View style={{ flex: 1 }}>
      {/* We always render children so navigation state isn't lost, but we hide them from accessibility when locked */}
      <View style={{ flex: 1, display: isLocked ? 'none' : 'flex' }}>
        {children}
      </View>

      {isLocked && (
        <View style={[StyleSheet.absoluteFill, styles.classicOverlay, { backgroundColor: colors.bg }]}>
          <View style={styles.classicContent}>
            <Ionicons name="lock-closed-outline" size={64} color={colors.textPrimary} style={{ marginBottom: 24 }} />
            <Text style={[styles.classicTitle, { color: colors.textPrimary }]}>Lifio is Locked</Text>
            <Text style={[styles.classicSubtitle, { color: colors.textSecondary }]}>
              Please authenticate to continue
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.classicButton,
                { borderColor: colors.border },
                pressed && { backgroundColor: colors.surface },
              ]}
              onPress={authenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={[styles.classicButtonText, { color: colors.textPrimary }]}>Unlock</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  classicOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  classicContent: {
    alignItems: 'center',
    padding: 32,
    maxWidth: 320,
    width: '100%',
  },
  classicTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  classicSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
  },
  classicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
  },
  classicButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
