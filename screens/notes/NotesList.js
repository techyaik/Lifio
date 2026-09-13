import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { FeatureWalkthrough } from '../../components/FeatureWalkthrough';
import { InputField } from '../../components/InputField';
import { NoteCard } from '../../components/NoteCard';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { FAB } from '../../components/FAB';
import { useNotes } from '../../hooks/useNotes';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { WALKTHROUGH_STEPS } from '../../constants/walkthroughs';
import { showToast, safeConfirm } from '../../utils/feedback';

export default function NotesList({ navigation, route }) {
  const { notes, loading, deleteNote, getAllTags } = useNotes();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState(route.params?.tag || 'All');
  const tags = getAllTags();

  useEffect(() => {
    if (route.params?.tag !== undefined) {
      setTag(route.params.tag);
    }
  }, [route.params?.tag]);

  const handleDelete = (noteId) => {
    const performDelete = async () => {
      try {
        await deleteNote(noteId);
        showToast('Note deleted ✓');
      } catch (error) {
        console.error('Delete note failed:', error);
        showToast('Failed to delete note: ' + error.message);
      }
    };

    safeConfirm('Delete note?', 'This note will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery = !normalized || `${note.title} ${note.body}`.toLowerCase().includes(normalized);
      const matchesTag = tag === 'All' || note.tags?.includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [notes, query, tag]);

  const header = (
    <View style={styles.headerContainer}>
      <AppHeader title="Notes" />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textHint} />
        <InputField value={query} onChangeText={setQuery} placeholder="Search notes" style={styles.searchInput} />
        <Pressable
          onPress={() => navigation.navigate('TagFilter')}
          style={[styles.tagButton, { backgroundColor: colors.white, borderColor: colors.borderLight }]}
        >
          <Ionicons name="pricetags-outline" size={18} color={colors.notes} />
        </Pressable>
      </View>
      <View style={styles.tags}>
        {['All', ...tags].map((item) => (
          <Pill key={item} label={item} selected={tag === item} onPress={() => setTag(item)} palette={colors.pillFitness} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Screen loading={loading} scroll={false}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('NoteDetail', { note: item })}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              message="Nothing written yet. Start a note."
              actionLabel="+ New note"
              action={() => navigation.navigate('NoteEditor')}
              accent={colors.notes}
            />
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
      </Screen>
      {!loading && notes.length > 0 && (
        <View style={styles.fabWrap}>
          <FAB color={colors.notes} onPress={() => navigation.navigate('NoteEditor')} />
        </View>
      )}
      <FeatureWalkthrough screenKey="notes" steps={WALKTHROUGH_STEPS.notes} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { gap: 10, paddingTop: 8 },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1 },
  tagButton: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
    ...SHADOWS.subtle,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  list: { gap: 16, paddingVertical: SPACING.screen, paddingHorizontal: SPACING.screen },
  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    ...SHADOWS.glow,
  },
});
