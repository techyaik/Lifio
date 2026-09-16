import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../../../components/AppText';
import { InputField } from '../../../components/InputField';
import { SectionHeader } from '../../../components/SectionHeader';
import { useTheme } from '../../../theme/ThemeContext';

export function ProfileSettingSection({ profileInput, setProfileInput, savingProfile, onSaveProfile }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader>Profile</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Your name is used for personal greetings across the app.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField
              value={profileInput}
              onChangeText={setProfileInput}
              placeholder="Enter your name"
              maxLength={40}
            />
          </View>
          <Pressable
            onPress={onSaveProfile}
            disabled={savingProfile}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.health, opacity: pressed || savingProfile ? 0.8 : 1 },
            ]}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.onAccent }]}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
