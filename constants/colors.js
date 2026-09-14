export const LIGHT_COLORS = {
  // Venzer Premium Fintech Palette
  health: '#BCE47D', // Venzer Lime Green
  habits: '#A4C3A2', // Soft Sage
  notes: '#D2D8C6',  // Warm Silver/Sage
  wallet: '#0A1913', // Deep Forest Green

  gradientHealthStart: '#A8D366',
  gradientHabitsStart: '#92B591',
  gradientNotesStart: '#BFC6B2',
  gradientWalletStart: '#142A20',
  gradientDangerStart: '#E87D7D',
  
  warning: '#E2B86B',
  success: '#BCE47D',
  info: '#11291E',

  tealDark: '#0A1913',
  tealLight: '#EAF1E7',
  tealMid: '#163327',

  // Backgrounds
  bg: '#EAF1E7',      // Soft mint/grey background from reference
  bgWarm: '#F1F7EE',  // Lighter tint for gradients
  
  // Surfaces
  surface: '#FFFFFF',         // Crisp white for secondary cards
  surfaceElevated: '#0A1913', // Deep forest green (almost black) for primary cards
  surfaceTint: '#11291E',     // Slightly lighter forest green for nested elements inside primary cards
  
  white: '#FFFFFF',
  border: '#D8E2D5',
  borderLight: '#E3EBE0',

  // Text
  textPrimary: '#0A1913',     // Dark forest green for text on light
  textSecondary: '#6A7D73',   // Muted green-grey
  textHint: '#9CAD9F',
  onAccent: '#0A1913',        // Dark text on the lime green accent
  
  danger: '#D95D5D',
  dangerBg: '#FCECEC',
  warningBg: '#FDF7E6',
  infoBg: '#E9F1EC',
  infoBorder: '#C1D8CD',
  overlay: 'rgba(10, 25, 19, 0.4)',
  
  chartSleepDeep: '#11291E',
  chartSleepAwake: '#2E503F',
  chartRingMove: '#BCE47D',
  chartRingStand: '#E5C97D',

  accentLight: {
    health: '#E1F1CF',
    habits: '#DFEAE2',
    notes: '#F0F3EC',
    wallet: '#C5D6CD',
  },

  pillHealth: { bg: '#E1F1CF', text: '#3E5C1C' },
  pillLearning: { bg: '#DFEAE2', text: '#2B4A34' },
  pillFitness: { bg: '#F0F3EC', text: '#4A5541' },
  pillMindful: { bg: '#E9F1EC', text: '#11291E' },
  pillOther: { bg: '#FFFFFF', text: '#6A7D73' },
};

export const DARK_COLORS = {
  // Venzer Dark Mode (Inverted logic)
  health: '#BCE47D',
  habits: '#83A582',
  notes: '#A5AE99',
  wallet: '#FFFFFF', 

  gradientHealthStart: '#A8D366',
  gradientHabitsStart: '#739572',
  gradientNotesStart: '#909A84',
  gradientWalletStart: '#E0E0E0',
  gradientDangerStart: '#C25D5D',
  
  warning: '#D4A853',
  success: '#BCE47D',
  info: '#FFFFFF',

  tealDark: '#0A1913',
  tealLight: '#182C23',
  tealMid: '#2B4A3A',

  // Backgrounds
  bg: '#050D0A',      // True deep dark green/black
  bgWarm: '#0A140F',
  
  // Surfaces
  surface: '#11291E',         // Dark forest for secondary cards
  surfaceElevated: '#183628', // Lighter forest for primary cards
  surfaceTint: '#214232',     
  
  white: '#FFFFFF',
  border: '#234131',
  borderLight: '#1A3325',

  // Text
  textPrimary: '#EAF1E7',     
  textSecondary: '#9CAD9F',   
  textHint: '#6A7D73',
  onAccent: '#0A1913',        
  
  danger: '#E87D7D',
  dangerBg: '#3A1E1E',
  warningBg: '#3D311B',
  infoBg: '#1A2922',
  infoBorder: '#2B4A3A',
  overlay: 'rgba(5, 13, 10, 0.8)',
  
  chartSleepDeep: '#4A695A',
  chartSleepAwake: '#709483',
  chartRingMove: '#BCE47D',
  chartRingStand: '#E5C97D',

  accentLight: {
    health: '#1F3D27',
    habits: '#1A3626',
    notes: '#27382B',
    wallet: '#11291E',
  },

  pillHealth: { bg: '#1F3D27', text: '#BCE47D' },
  pillLearning: { bg: '#1A3626', text: '#83A582' },
  pillFitness: { bg: '#27382B', text: '#A5AE99' },
  pillMindful: { bg: '#11291E', text: '#EAF1E7' },
  pillOther: { bg: '#14251C', text: '#9CAD9F' },
};

export const COLORS = LIGHT_COLORS;
