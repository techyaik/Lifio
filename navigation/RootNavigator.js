import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View, Share, Image, StatusBar, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '../components/AppText';
import AsyncStorage from '../storage/safeAsyncStorage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../components/LineIcon';
import { useTheme, ThemeProvider } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';
import { HealthStack } from './HealthStack';
import { HabitsStack } from './HabitsStack';
import { NotesStack } from './NotesStack';
import { WalletStack } from './WalletStack';
import { HomeStack } from './HomeStack';
import Onboarding from '../screens/Onboarding';
import EnterName from '../screens/EnterName';
import Settings from '../screens/Settings';
import MyPlan from '../screens/MyPlan';
import PrivacyManagement from '../screens/PrivacyManagement';
import Help from '../screens/Help';
import About from '../screens/About';
import { AppLockOverlay } from '../components/AppLockOverlay';
import { ONBOARDING_KEY } from '../constants/storageKeys';
export { ONBOARDING_KEY };

// Lazy-load expo-notifications to stay safe on web
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (_e) {}

const NOTIFICATION_TYPE_CYCLE = 'CYCLE_REMINDER';

const isNewArch = Boolean(global.nativeFabricUIManager);
if (Platform.OS === 'android' && !isNewArch && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const LOGO = require('../assets/lifio-logo.png');

const TAB_META = {
  HomeTab: { icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  HealthTab: { icon: 'heart-outline', activeIcon: 'heart', label: 'Health' }, 
  SettingsTab: { icon: 'settings-outline', activeIcon: 'settings', label: 'Settings' }, 
  JournalTab: { icon: 'wallet-outline', activeIcon: 'wallet', label: 'Wallet' },
  HabitsTab: { icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', label: 'Habits' },
  NotesTab: { icon: 'document-text-outline', activeIcon: 'document-text', label: 'Notes' },
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);
  const { colors, theme } = useTheme();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  // Render order: Home, Habits, Health, Wallet, Settings
  const visibleRouteNames = ['HomeTab', 'HabitsTab', 'HealthTab', 'JournalTab', 'SettingsTab'];

  return (
    <View style={[
      styles.navBar,
      {
        backgroundColor: colors.surface,
        borderTopColor: colors.borderLight,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
      },
    ]}>
      {visibleRouteNames.map((routeName) => {
        const route = state.routes.find((r) => r.name === routeName);
        if (!route) return null;

        const routeIndex = state.routes.findIndex((r) => r.name === routeName);
        const isFocused = state.index === routeIndex;
        const meta = TAB_META[routeName] || { icon: 'ellipse-outline', activeIcon: 'ellipse', label: routeName };

        const onPress = () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (e) {}

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const activeColor = colors.primaryOrange || '#FF5722';
        const inactiveColor = colors.textSecondary || '#8E98A8';

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={styles.tabItem}
          >
            <Ionicons
              name={isFocused ? meta.activeIcon : meta.icon}
              size={22}
              color={isFocused ? activeColor : inactiveColor}
              strokeWidth={isFocused ? 2 : 1.6}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? activeColor : inactiveColor,
                  fontWeight: isFocused ? '600' : '500',
                },
              ]}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="JournalTab" component={WalletStack} />
      <Tab.Screen name="HealthTab" component={HealthStack} />
      <Tab.Screen name="SettingsTab" component={Settings} />
      <Tab.Screen name="HabitsTab" component={HabitsStack} />
      <Tab.Screen name="NotesTab" component={NotesStack} />
    </Tab.Navigator>
  );
}

function NavigatorContent() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const { theme, colors, ready: themeReady, profileName, setProfileName, dataVersion } = useTheme();
  const navigationRef = useRef(null);

  // ── Notification tap-to-navigate ──────────────────────────────────────────
  useEffect(() => {
    if (!Notifications) return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (!data) return;

      if (data.type === NOTIFICATION_TYPE_CYCLE) {
        // Navigate to HealthDashboard inside the HealthTab stack
        if (navigationRef.current?.isReady()) {
          navigationRef.current.navigate('Main', {
            screen: 'HealthTab',
            params: {
              screen: 'HealthDashboard',
            },
          });
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const navigationTheme = theme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.bg,
      card: colors.surfaceElevated,
      text: colors.textPrimary,
      border: colors.borderLight,
      primary: colors.health,
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.surfaceElevated,
      text: colors.textPrimary,
      border: colors.borderLight,
      primary: colors.health,
    }
  };

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!mounted) return;
      setOnboarded(value === 'true');
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [dataVersion]);

  const completeOnboarding = async () => {
    setOnboarded(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const completeNameSetup = async (name) => {
    await setProfileName(name);
  };

  if (!ready || !themeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.pillHealth.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        {onboarded ? (
        profileName ? (
          <Stack.Navigator
            id="RootStack"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MyPlan" component={MyPlan} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="PrivacyManagement" component={PrivacyManagement} />
            <Stack.Screen name="Help" component={Help} />
            <Stack.Screen name="About" component={About} />
          </Stack.Navigator>
        ) : (
          <EnterName onSave={completeNameSetup} />
        )
      ) : (
        <Onboarding onGetStarted={completeOnboarding} />
      )}
    </NavigationContainer>
    </>
  );
}

export default function RootNavigator() {
  return (
    <ThemeProvider>
      <AppLockOverlay>
        <NavigatorContent />
      </AppLockOverlay>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // ── Bottom Tab Bar ────────────────────────────────────────────────────
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },

  // ── Drawer (legacy / unused, kept for reference) ──────────────────────
  drawer: {
    width: 286,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: 24,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  drawerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 12,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingTop: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  drawerLabelText: {
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  shareLabel: {
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '700',
  },
});
