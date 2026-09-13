import { COLORS } from './colors';

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  pill: 999,
};

export const SPACING = {
  screen: 18,
  card: 14,
  gap: 10,
  section: 18,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  glow: {
    shadowColor: COLORS.health,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
};

export const GRADIENTS = {
  page: [COLORS.bgWarm, COLORS.bg],
  health: ['#2E7BBE', COLORS.health],
  habits: ['#7B72DA', COLORS.habits],
  notes: ['#D9902E', COLORS.notes],
  wallet: ['#B24B2B', COLORS.wallet],
};
