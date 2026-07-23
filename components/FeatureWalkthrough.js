import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '../storage/safeAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';
import { WALKTHROUGH_STORAGE_PREFIX } from '../constants/walkthroughs';

const completedCache = {};

export async function resetFeatureWalkthroughs() {
  Object.keys(completedCache).forEach((key) => {
    delete completedCache[key];
  });
  const keys = await AsyncStorage.getAllKeys();
  const walkthroughKeys = keys.filter((key) => key.startsWith(WALKTHROUGH_STORAGE_PREFIX));
  if (walkthroughKeys.length) {
    await AsyncStorage.multiRemove(walkthroughKeys);
  }
}

export function FeatureWalkthrough({ screenKey, steps = [] }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!screenKey || !steps.length) return;
      if (completedCache[screenKey]) {
        if (mounted) setVisible(false);
        return;
      }
      try {
        const done = await AsyncStorage.getItem(`${WALKTHROUGH_STORAGE_PREFIX}${screenKey}`);
        if (!mounted || done === 'true') {
          if (done === 'true') completedCache[screenKey] = true;
          return;
        }
        const timer = setTimeout(() => {
          if (mounted) setVisible(true);
        }, 450);
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error loading feature walkthrough:', error);
      }
    };
    const cleanupPromise = load();
    return () => {
      mounted = false;
      cleanupPromise?.then?.((cleanup) => cleanup?.());
    };
  }, [screenKey, steps.length]);

  const complete = async () => {
    setVisible(false);
    setIndex(0);
    completedCache[screenKey] = true;
    try {
      await AsyncStorage.setItem(`${WALKTHROUGH_STORAGE_PREFIX}${screenKey}`, 'true');
    } catch (error) {
      console.error('Error saving feature walkthrough state:', error);
    }
  };

  if (!steps.length) return null;

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return visible ? (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={complete}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
              <Ionicons name={step.icon || 'sparkles-outline'} size={22} color={colors.health} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                Guide {index + 1} of {steps.length}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{step.title}</Text>
            </View>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>{step.body}</Text>

          <View style={styles.dots}>
            {steps.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotIndex === index ? colors.health : colors.border,
                    width: dotIndex === index ? 20 : 7,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={complete} style={styles.textButton} hitSlop={8}>
              <Text style={[styles.textButtonLabel, { color: colors.textSecondary }]}>Skip</Text>
            </Pressable>

            <View style={styles.rightActions}>
              <Pressable
                disabled={isFirst}
                onPress={() => setIndex((current) => Math.max(0, current - 1))}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.borderLight, opacity: isFirst ? 0.45 : 1 },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Back</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isLast) complete();
                  else setIndex((current) => current + 1);
                }}
                style={[styles.primaryButton, { backgroundColor: colors.health }]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.onAccent }]}>
                  {isLast ? 'Done' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  ) : null;
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: 16,
    maxWidth: 420,
    padding: 18,
    width: '100%',
    ...SHADOWS.soft,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    borderRadius: RADIUS.pill,
    height: 7,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  textButton: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
