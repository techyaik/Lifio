import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View, Share, Image, StatusBar, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '../components/AppText';
import AsyncStorage from '../storage/safeAsyncStorage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const isNewArch = Boolean(global.nativeFabricUIManager);
if (Platform.OS === 'android' && !isNewArch && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const ONBOARDING_KEY = 'lifio_onboarded_v2';
const LOGO = require('../assets/lifio-logo.png');

const TAB_META = {
  HomeTab: { icon: 'grid-outline', activeIcon: 'grid', label: 'Home' },
  JournalTab: { icon: 'wallet-outline', activeIcon: 'wallet', label: 'Wallet' },
  HealthTab: { icon: 'heart-outline', activeIcon: 'heart', label: 'Health' }, 
  SettingsTab: { icon: 'settings-outline', activeIcon: 'settings', label: 'Settings' }, 
  HabitsTab: { icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', label: 'Habits' },
  NotesTab: { icon: 'document-text-outline', activeIcon: 'document-text', label: 'Notes' },
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={{
      position: 'absolute',
      bottom: insets.bottom > 0 ? insets.bottom + 6 : 24,
      alignSelf: 'center',
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 40,
      height: 72,
      alignItems: 'center',
      paddingHorizontal: 10,
      gap: 8,
      ...SHADOWS.medium,
      borderWidth: 1,
      borderColor: colors.borderLight,
    }}>
      {state.routes.map((route, index) => {
        if (route.name === 'HabitsTab' || route.name === 'NotesTab') return null;

        const isFocused = state.index === index;
        const meta = TAB_META[route.name] || { icon: 'ellipse-outline', activeIcon: 'ellipse', label: route.name };

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
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            navigation.navigate(route.name);
          }
        };

        const activeBg = colors.white;
        const activeContentColor = colors.textPrimary;
        const inactiveContentColor = colors.textSecondary;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={({ pressed }) => [{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 54,
              paddingHorizontal: isFocused ? 20 : 14,
              borderRadius: 28,
              backgroundColor: isFocused ? activeBg : 'transparent',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            }]}
          >
            <Ionicons
              name={isFocused ? meta.activeIcon : meta.icon}
              size={24}
              color={isFocused ? activeContentColor : inactiveContentColor}
            />
            {isFocused && (
              <Text
                style={{
                  color: activeContentColor,
                  fontSize: 15,
                  fontWeight: '800',
                  marginLeft: 8,
                }}
              >
                {meta.label}
              </Text>
            )}
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
  const { theme, colors, ready: themeReady, profileName, setProfileName } = useTheme();

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
  }, []);

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
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
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
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 8,
    ...SHADOWS.soft,
  },
  tabLabel: { fontSize: 10, fontWeight: '700' },
  tabItem: { borderRadius: RADIUS.md, marginHorizontal: 1 },
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
