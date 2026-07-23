import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Share, Image } from 'react-native';
import AsyncStorage from '../storage/safeAsyncStorage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
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

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const ONBOARDING_KEY = 'lifio_onboarded_v2';
const LOGO = require('../assets/lifio-logo.png');

const TAB_META = {
  HealthTab: { label: 'Health', icon: 'heart-outline', activeIcon: 'heart', color: 'health' },
  HabitsTab: { label: 'Habits', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', color: 'habits' },
  HomeTab: { label: 'Home', icon: 'home-outline', activeIcon: 'home', color: 'health' },
  NotesTab: { label: 'Notes', icon: 'document-text-outline', activeIcon: 'document-text', color: 'notes' },
  JournalTab: { label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', color: 'wallet' },
};

function MainTabs() {
  const { colors, resolveThemeColor } = useTheme();
  const themedTabBarStyle = [
    styles.tabBar,
    {
      backgroundColor: colors.surfaceElevated,
      borderTopColor: colors.borderLight,
      shadowColor: colors.overlay,
    },
  ];

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => {
        const meta = TAB_META[route.name];
        const tabColor = meta ? resolveThemeColor(colors[meta.color]) : colors.health;
        return {
          headerShown: false,
          tabBarActiveTintColor: tabColor,
          tabBarInactiveTintColor: colors.textHint,
          tabBarStyle: themedTabBarStyle,
          tabBarLabel: meta?.label || '',
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? meta.activeIcon : meta.icon;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        };
      }}
    >
      <Tab.Screen name="HealthTab" component={HealthStack} />
      <Tab.Screen name="HabitsTab" component={HabitsStack} />
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="NotesTab" component={NotesStack} />
      <Tab.Screen name="JournalTab" component={WalletStack} />
    </Tab.Navigator>
  );
}

function CustomDrawerContent(props) {
  const { state, navigation } = props;
  const { colors, profileName } = useTheme();

  const activeRoute = state.routes[state.index];
  const activeName = activeRoute.name;

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Lifio - A bento-style companion for mindful habits, health logging, and wallet tracking. Download it today!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const menuItems = [
    { name: 'MyPlan', label: 'My Plan', icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
    { name: 'PrivacyManagement', label: 'Privacy Management', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
    { name: 'Help', label: 'Help', icon: 'help-circle-outline', activeIcon: 'help-circle' },
    { name: 'About', label: 'About', icon: 'information-circle-outline', activeIcon: 'information-circle' },
  ];

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.bgWarm }]}>
      {/* Drawer Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: colors.borderLight }]}>
        <Image source={LOGO} style={styles.drawerLogo} />
        <Text style={[styles.appName, { color: colors.textPrimary }]} numberOfLines={1}>
          Lifio
        </Text>
        <Text style={[styles.appSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {profileName ? `Welcome, ${profileName}` : 'Personal Tracker'}
        </Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item) => {
          const isActive = activeName === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => {
                navigation.navigate(item.name);
              }}
              style={[
                styles.drawerItem,
                isActive && { backgroundColor: colors.accentLight.health }
              ]}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={20}
                color={isActive ? colors.health : colors.textSecondary}
              />
              <Text
                style={[
                  styles.drawerLabelText,
                  { color: isActive ? colors.health : colors.textPrimary }
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      {/* Share Application Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.borderLight }]}>
        <Pressable onPress={handleShare} style={styles.shareItem}>
          <Ionicons name="share-social-outline" size={20} color={colors.health} />
          <Text style={[styles.shareLabel, { color: colors.health }]}>Share Application</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NavigatorContent() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const { colors, ready: themeReady, profileName, setProfileName } = useTheme();

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
        <ActivityIndicator color={colors.health} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {onboarded ? (
        profileName ? (
          <Drawer.Navigator
            id="RootDrawer"
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              headerShown: false,
              drawerStyle: [styles.drawer, { backgroundColor: colors.bgWarm }],
            }}
          >
            <Drawer.Screen name="Main" component={MainTabs} />
            <Drawer.Screen name="MyPlan" component={MyPlan} />
            <Drawer.Screen name="Settings" component={Settings} />
            <Drawer.Screen name="PrivacyManagement" component={PrivacyManagement} />
            <Drawer.Screen name="Help" component={Help} />
            <Drawer.Screen name="About" component={About} />
          </Drawer.Navigator>
        ) : (
          <EnterName onSave={completeNameSetup} />
        )
      ) : (
        <Onboarding onGetStarted={completeOnboarding} />
      )}
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <ThemeProvider>
      <NavigatorContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 76,
    paddingBottom: 12,
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
