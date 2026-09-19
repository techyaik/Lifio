import { COLORS } from './colors';

export const TYPOGRAPHY = {
  // Page Greetings & Headlines
  greeting: { fontSize: 26, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textDecorationLine: 'underline' },

  // Bento Card Typography
  cardTitle: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  cardMetricLarge: { fontSize: 24, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.4 },
  cardMetricMedium: { fontSize: 19, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },

  // Chips & Filters
  chipActive: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  chipInactive: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },

  // General Hierarchy
  title: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 14, fontWeight: '400', color: COLORS.textPrimary },
  meta: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  micro: { fontSize: 10, fontWeight: '400', color: COLORS.textHint },
};
