import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';

export function AppHeader({
  title,
  onBack,
  rightIcon,
  onRight,
  rightText,
  accent,
  showMenu,
  showSettings,
}) {
  const navigation = useNavigation();
  const { colors, resolveThemeColor } = useTheme();

  const activeAccent = accent ? resolveThemeColor(accent) : colors.health;
  const tintColor = activeAccent;
  
  let bgTint = colors.accentLight.health;
  if (tintColor === colors.habits) bgTint = colors.accentLight.habits;
  else if (tintColor === colors.notes) bgTint = colors.accentLight.notes;
  else if (tintColor === colors.wallet) bgTint = colors.accentLight.wallet;

  const canShowMenu = showMenu ?? !onBack;
  const canShowSettings = showSettings ?? !onBack;
  
  const openDrawer = () => {
    try {
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (e) {
      navigation.getParent('RootDrawer')?.openDrawer?.();
    }
  };
  const openSettings = () => {
    try {
      navigation.getParent('RootDrawer')?.navigate('Settings');
    } catch (e) {
      navigation.navigate('Settings');
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} style={[styles.iconButton, { borderColor: colors.borderLight, backgroundColor: colors.surface }]} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : canShowMenu ? (
          <Pressable onPress={openDrawer} style={styles.drawerButton} hitSlop={10}>
            <MaterialIcons name="segment" size={26} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
      <View style={[styles.side, styles.right]}>
        {canShowSettings ? (
          <Pressable onPress={openSettings} style={[styles.iconButton, { borderColor: colors.borderLight, backgroundColor: colors.surface }, SHADOWS.subtle]} hitSlop={10}>
            <Ionicons name="settings-outline" size={19} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable
            onPress={onRight}
            style={[styles.iconButton, SHADOWS.subtle, { backgroundColor: bgTint, borderColor: tintColor }]}
            hitSlop={10}
          >
            <Ionicons name={rightIcon} size={20} color={tintColor} />
          </Pressable>
        ) : null}
        {rightText ? (
          <Pressable onPress={onRight} hitSlop={10}>
            <Text style={[styles.rightText, { color: tintColor }]}>{rightText}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 40 },
  side: { width: 88, flexDirection: 'row' },
  right: { gap: 8, justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  drawerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightText: { fontSize: 14, fontWeight: '600' },
});
