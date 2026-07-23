import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '../storage/safeAsyncStorage';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/colors';

const ThemeContext = createContext();

export const THEME_KEY = 'lifio_theme_mode_v2';
export const PROFILE_NAME_KEY = 'lifio_profile_name_v1';

export const resolveColor = (colorStr, colors) => {
  if (!colorStr) return colorStr;
  const lower = colorStr.toLowerCase();
  switch (lower) {
    case '#185fa5': return colors.health;
    case '#534ab7': return colors.habits;
    case '#ba7517': return colors.notes;
    case '#993c1d': return colors.wallet;
    case '#0f6e56': return colors.tealDark;
    case '#e1f5ee': return colors.tealLight;
    case '#1d9e75': return colors.tealMid;
    case '#f5f5f0': return colors.bg;
    case '#fbfaf5': return colors.bgWarm;
    case '#f7f7f4': return colors.surface;
    case '#ffffff': return colors.white;
    case '#e8e8e8': return colors.border;
    case '#f0f0f0': return colors.borderLight;
    case '#1a1a1a': return colors.textPrimary;
    case '#888888': return colors.textSecondary;
    case '#bbbbbb': return colors.textHint;
    case '#c2410c': return colors.danger;
    case '#fff1ec': return colors.dangerBg;
    case '#854f0b': return colors.pillFitness.text;
    case '#f1efe8': return colors.pillOther.bg;
    case '#5f5e5a': return colors.pillOther.text;
    default:
      if (colorStr === '#E6F1FB') return colors.accentLight.health;
      if (colorStr === '#EEEDFE') return colors.accentLight.habits;
      if (colorStr === '#FAEEDA') return colors.accentLight.notes;
      if (colorStr === '#FAECE7') return colors.accentLight.wallet;
      return colorStr;
  }
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system'); // 'light' | 'dark' | 'system'
  const [profileName, setProfileNameState] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [storedTheme, storedProfileName] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(PROFILE_NAME_KEY),
        ]);
        if (storedTheme) {
          setThemeModeState(storedTheme);
        }
        if (storedProfileName) {
          setProfileNameState(storedProfileName.trim());
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      } finally {
        setReady(true);
      }
    };
    loadTheme();
  }, []);

  const [dataVersion, setDataVersion] = useState(0);

  const triggerDataRefresh = () => {
    setDataVersion((v) => v + 1);
  };

  const setThemeMode = async (mode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  const setProfileName = async (value) => {
    const nextName = String(value || '').trim().replace(/\s+/g, ' ');
    setProfileNameState(nextName);
    try {
      if (nextName) {
        await AsyncStorage.setItem(PROFILE_NAME_KEY, nextName);
      } else {
        await AsyncStorage.removeItem(PROFILE_NAME_KEY);
      }
    } catch (e) {
      console.error('Error saving profile name:', e);
      throw e;
    }
  };

  const theme = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const gradients = {
    page: [colors.bgWarm, colors.bg],
    health: [colors.gradientHealthStart, colors.health],
    habits: [colors.gradientHabitsStart, colors.habits],
    notes: [colors.gradientNotesStart, colors.notes],
    wallet: [colors.gradientWalletStart, colors.wallet],
  };

  const contextValue = {
    themeMode,
    setThemeMode,
    theme,
    colors,
    gradients,
    ready,
    profileName,
    setProfileName,
    resolveThemeColor: (colorStr) => resolveColor(colorStr, colors),
    dataVersion,
    triggerDataRefresh,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
