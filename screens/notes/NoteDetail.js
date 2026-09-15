import React from 'react';
import { StyleSheet, Text as RNText, View, Alert, Platform } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useNotes } from '../../hooks/useNotes';
import { displayDate } from '../../utils/dates';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { showToast, safeConfirm } from '../../utils/feedback';

export default function NoteDetail({ navigation, route }) {
  const { notes, deleteNote } = useNotes();
  const { colors } = useTheme();
  
  const note = notes.find((item) => item.id === route.params?.note?.id) || route.params?.note;

  if (!note) {
    return (
      <Screen>
        <AppHeader title="Note" onBack={() => navigation.goBack()} />
        <Text style={{ color: colors.textPrimary, padding: 16 }}>Note not found.</Text>
      </Screen>
    );
  }

  const confirmDelete = () => {
    const performDelete = async () => {
      try {
        await deleteNote(note.id);
        showToast('Note deleted ✓');
        navigation.navigate('NotesList');
      } catch (error) {
        console.error('Delete note failed:', error);
        showToast('Failed to delete note: ' + error.message);
      }
    };

    safeConfirm('Delete note?', 'This note will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  return (
    <Screen>
      <AppHeader title="Note" onBack={() => navigation.goBack()} rightText="Edit" accent={colors.notes} onRight={() => navigation.navigate('NoteEditor', { note })} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginBottom: 16 }]}>
        <Text selectable style={[styles.title, { color: colors.textPrimary }]}>{note.title || 'Untitled'}</Text>
        <Text selectable style={[styles.date, { color: colors.textHint }]}>Updated {displayDate(note.updatedAt)}</Text>
        <View style={styles.tags}>
          {note.tags?.map((tag) => <Pill key={tag} label={tag} palette={colors.pillFitness} />)}
        </View>
        <Text selectable style={[styles.body, { color: colors.textPrimary }]}>{note.body}</Text>
      </View>
      <PrimaryButton title="Delete note" color={colors.danger} onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, gap: 14, padding: 20, ...SHADOWS.subtle },
  title: { fontSize: 24, fontWeight: '700' },
  date: { fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { fontSize: 15, lineHeight: 23 },
});
