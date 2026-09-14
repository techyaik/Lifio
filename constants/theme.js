import { COLORS } from './colors';

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 36,     // Venzer massive rounded corners
  pill: 999,
};

export const SPACING = {
  screen: 24, // More generous padding
  card: 20,
  gap: 16,
  section: 24,
};

export const SHADOWS = {
  soft: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  glow: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const GRADIENTS = {
  page: [COLORS.bgWarm, COLORS.bg],
  health: [COLORS.gradientHealthStart, COLORS.health],
  habits: [COLORS.gradientHabitsStart, COLORS.habits],
  notes: [COLORS.gradientNotesStart, COLORS.notes],
  wallet: [COLORS.gradientWalletStart, COLORS.wallet],
};
