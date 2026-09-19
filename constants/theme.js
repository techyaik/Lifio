import { COLORS } from './colors';

export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 22,
  card: 24,       // Standard bento card corner radius
  container: 28,  // Recent activities / Friends container corner radius
  xl: 32,
  pill: 999,      // Filter chips, dock, pill buttons
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  card: 16,
  gap: 12,
  screen: 20,
  section: 20,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
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
  medium: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  dock: {
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
