import React, { useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from '../components/AppText';
import { Ionicons } from "../components/LineIcon";
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { resetFeatureWalkthroughs } from '../components/FeatureWalkthrough';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { showToast } from '../utils/feedback';
import { RADIUS, SHADOWS } from '../constants/theme';

export default function Help({ navigation }) {
  const { colors } = useTheme();

  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      q: 'How are habit streaks calculated?',
      a: 'Streaks count consecutive days a habit is checked off. If a habit has weekdays or weekends as a target goal, non-matching days are skipped automatically without breaking your momentum.',
    },
    {
      q: 'Is my tracked data secure?',
      a: 'Absolutely. Lifio stores all data locally in sandboxed on-device storage. No information is uploaded to central servers or shared with third parties.',
    },
    {
      q: 'How do I erase dummy data?',
      a: 'You can remove demo data at any time by going to the Settings screen and clicking "Erase Dummy Data" in the Data Management section. This will not affect your real logging history.',
    },
    {
      q: 'Can I export my logs to another device?',
      a: 'Yes. Navigate to the Privacy Management drawer screen and click "Export JSON". This opens the native device menu, letting you copy, email, or share your database.',
    },
  ];

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const contactSupport = () => {
    showToast('Support ticket logged ✓');
  };

  const handleReplay = async () => {
    try {
      await resetFeatureWalkthroughs();
      showToast('Walkthrough guides reset ✓');
    } catch (error) {
      console.error('Error resetting walkthroughs:', error);
    }
  };

  return (
    <Screen>
      <AppHeader title="Help & Support" onBack={() => navigation.navigate('Main')} />

      {/* Support Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight.health }]}>
            <Ionicons name="help-buoy" size={24} color={colors.pillHealth.text} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>How can we help?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Find answers or get assistance</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Browse common topics below. For custom requests or feedback, tap the button to submit a message to our developers.
        </Text>
        <PrimaryButton title="Send Feedback / Ticket" onPress={contactSupport} color={colors.pillHealth.text} />
        <PrimaryButton title="Replay Walkthrough Guides" onPress={handleReplay} color={colors.pillHealth.text} style={{ marginTop: 8 }} />
      </View>

      {/* FAQs */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Frequently Asked Questions</Text>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <Pressable
                key={index}
                onPress={() => toggleExpand(index)}
                style={[
                  styles.faqCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight }
                ]}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{faq.q}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
                {isExpanded ? (
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.a}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 14,
    ...SHADOWS.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  faqList: {
    gap: 8,
  },
  faqCard: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.subtle,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
