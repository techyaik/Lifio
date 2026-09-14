import React, { useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text as RNText, useWindowDimensions, View,  } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MOODS } from '../constants/categories';
import { Screen } from '../components/Screen';
import { RADIUS, SHADOWS } from '../constants/theme';

const LOGO = require('../assets/lifio-logo.png');

export default function Onboarding({ onGetStarted }) {
  const { width, height } = useWindowDimensions();
  const { colors, gradients, resolveThemeColor } = useTheme();

  const slides = [
    {
      eyebrow: 'A calmer daily dashboard',
      title: 'Track the essentials without the clutter.',
      body: 'Log health, habits, notes, and reflections in one polished space designed for quick daily use.',
      accent: colors.health,
      gradient: gradients.health,
      icon: 'heart',
      metrics: [
        { value: '70.2', label: 'Weight' },
        { value: '7.5h', label: 'Sleep' },
        { value: '8.3k', label: 'Steps' },
      ],
    },
    {
      eyebrow: 'Build gentle momentum',
      title: 'Turn small actions into visible progress.',
      body: 'Complete habit checklists, watch streaks grow, and see the week at a glance.',
      accent: colors.habits,
      gradient: gradients.habits,
      icon: 'checkmark-circle',
      metrics: [
        { value: '12', label: 'Streak' },
        { value: '87%', label: 'Month' },
        { value: '5/7', label: 'Week' },
      ],
    },
    {
      eyebrow: 'Remember what matters',
      title: 'Capture thoughts and moods with context.',
      body: 'Search notes, tag ideas, and keep a mood journal that helps your patterns become clear.',
      accent: colors.notes,
      gradient: gradients.notes,
      icon: 'book',
      metrics: [
        { value: '😊', label: 'Mood' },
        { value: '14', label: 'Bright days' },
        { value: 'Ideas', label: 'Tagged' },
      ],
    },
  ];

  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const compact = height < 700;

  const goTo = (nextIndex) => {
    const bounded = Math.max(0, Math.min(slides.length - 1, nextIndex));
    scrollRef.current?.scrollTo({ x: bounded * width, animated: true });
    setIndex(bounded);
  };

  const handleNext = () => {
    if (index === slides.length - 1) {
      onGetStarted();
      return;
    }
    goTo(index + 1);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={[styles.brandPill, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Image source={LOGO} style={styles.tinyLogo} />
            <Text style={[styles.brandPillText, { color: colors.textPrimary }]}>Lifio</Text>
          </View>
          <Pressable onPress={onGetStarted} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
        >
          {slides.map((slide, slideIndex) => (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <View style={[styles.artStage, compact ? styles.compactArtStage : null]}>
                <LinearGradient
                  colors={[colors.white, colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.logoHalo, { borderColor: colors.borderLight }]}
                >
                  <Image source={LOGO} style={[styles.logo, compact ? styles.compactLogo : null]} />
                </LinearGradient>

                <LinearGradient
                  colors={slide.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.floatingBadge, styles.badgeTop]}
                >
                  <Ionicons name={slide.icon} size={20} color={colors.white} />
                </LinearGradient>

                <View style={[styles.mockCard, styles.mockCardLeft, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <Text style={[styles.mockLabel, { color: colors.textHint }]}>Today</Text>
                  <Text style={[styles.mockValue, { color: colors.textPrimary }]}>{slide.metrics[0].value}</Text>
                  <Text style={[styles.mockCaption, { color: colors.textSecondary }]}>{slide.metrics[0].label}</Text>
                </View>

                <View style={[styles.mockCard, styles.mockCardRight, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <View style={styles.miniBars}>
                    {[0.38, 0.58, 0.76, 0.48, 0.92].map((bar, barIndex) => (
                      <View
                        key={`${slideIndex}-${barIndex}`}
                        style={[
                          styles.miniBar,
                          { height: 42 * bar, backgroundColor: barIndex === 4 ? slide.accent : colors.border },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.mockCaption, { color: colors.textSecondary }]}>{slide.metrics[1].label}</Text>
                </View>
              </View>

              <View style={styles.copyBlock}>
                <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
                <Text selectable style={[styles.title, { color: colors.textPrimary }, compact ? styles.compactTitle : null]}>{slide.title}</Text>
                <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.indicators}>
            {slides.map((_, slideIndex) => {
              const inputRange = [
                (slideIndex - 1) * width,
                slideIndex * width,
                (slideIndex + 1) * width,
              ];
              const indicatorWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.35, 1, 0.35],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={slideIndex}
                  style={[
                    styles.indicator,
                    {
                      width: indicatorWidth,
                      opacity,
                      backgroundColor: slides[index]?.accent || colors.health,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
              style={[
                styles.backButton,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
                index === 0 ? styles.backButtonDisabled : null
              ]}
            >
              <Ionicons name="chevron-back" size={18} color={index === 0 ? colors.textHint : colors.textPrimary} />
              <Text style={[styles.backText, { color: colors.textPrimary }, index === 0 ? { color: colors.textHint } : null]}>Back</Text>
            </Pressable>

            <Pressable onPress={handleNext} style={styles.nextButton}>
              <LinearGradient
                colors={slides[index].gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextGradient}
              >
                <Text style={[styles.nextText, { color: colors.white }]}>{index === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
                <Ionicons name={index === slides.length - 1 ? 'sparkles' : 'chevron-forward'} size={18} color={colors.white} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brandPill: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    ...SHADOWS.subtle,
  },
  tinyLogo: { borderRadius: 10, height: 26, width: 26 },
  brandPillText: { fontSize: 14, fontWeight: '800' },
  skipButton: { paddingHorizontal: 8, paddingVertical: 8 },
  skipText: { fontSize: 13, fontWeight: '700' },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  artStage: {
    alignItems: 'center',
    height: 310,
    justifyContent: 'center',
    marginBottom: 18,
  },
  compactArtStage: { height: 230, marginBottom: 8 },
  logoHalo: {
    alignItems: 'center',
    borderRadius: 44,
    borderWidth: 1,
    height: 172,
    justifyContent: 'center',
    width: 172,
    ...SHADOWS.glow,
  },
  logo: { borderRadius: 34, height: 126, width: 126 },
  compactLogo: { height: 106, width: 106 },
  floatingBadge: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    width: 48,
    ...SHADOWS.subtle,
  },
  badgeTop: { right: '23%', top: 42 },
  mockCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
    position: 'absolute',
    ...SHADOWS.soft,
  },
  mockCardLeft: { bottom: 34, left: 6, width: 116 },
  mockCardRight: { bottom: 16, right: 6, width: 128 },
  mockLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
  mockValue: { fontSize: 25, fontWeight: '800', marginTop: 4 },
  mockCaption: { fontSize: 10, marginTop: 2 },
  miniBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 5, height: 46 },
  miniBar: { borderRadius: 5, width: 13 },
  copyBlock: { alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    maxWidth: 330,
    textAlign: 'center',
  },
  compactTitle: { fontSize: 25, lineHeight: 31 },
  body: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 330,
    textAlign: 'center',
  },
  footer: { gap: 18 },
  indicators: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center' },
  indicator: { borderRadius: RADIUS.pill, height: 8 },
  controls: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  backButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  backButtonDisabled: { opacity: 0.55 },
  backText: { fontSize: 14, fontWeight: '700' },
  nextButton: { borderRadius: RADIUS.md, flex: 1, ...SHADOWS.soft },
  nextGradient: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  nextText: { fontSize: 15, fontWeight: '800' },
});
