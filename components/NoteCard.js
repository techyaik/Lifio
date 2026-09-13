import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOWS } from '../constants/theme';
import { displayDate } from '../utils/dates';
import { Pill } from './Pill';

export function NoteCard({ note, onPress, onDelete }) {
  const { colors } = useTheme();

  const renderRightActions = () => (
    <Pressable
      onPress={onDelete}
      style={[styles.delete, { backgroundColor: colors.danger }]}
    >
      <Ionicons name="trash-outline" size={22} color={colors.white} />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: colors.white, borderColor: colors.borderLight }
        ]}
      >
        <View style={styles.titleRow}>
          {note.pinned ? <Ionicons name="pin" size={14} color={colors.notes} /> : null}
          <Text selectable style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {note.title || 'Untitled'}
          </Text>
        </View>
        <Text selectable style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
          {note.body || 'No body text'}
        </Text>
        <View style={styles.footer}>
          {note.tags?.[0] ? <Pill label={note.tags[0]} palette={colors.pillFitness} /> : <View />}
          <Text selectable style={[styles.date, { color: colors.textHint }]}>
            {displayDate(note.updatedAt)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...SHADOWS.subtle,
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  preview: { fontSize: 13, lineHeight: 18 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 10 },
  delete: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    marginLeft: 12,
    width: 76,
    height: '100%',
  },
});
