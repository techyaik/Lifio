import React from 'react';
import { StyleSheet, Text as RNText, View, Pressable } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Ionicons } from "../../components/LineIcon";
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { useNotes } from '../../hooks/useNotes';
import { RADIUS, SHADOWS } from '../../constants/theme';

export default function TagFilter({ navigation }) {
  const { notes, getAllTags } = useNotes();
  const { colors } = useTheme();

  const tags = getAllTags();
  const count = (tag) => notes.filter((note) => note.tags?.includes(tag)).length;

  return (
    <Screen>
      <AppHeader title="Tags" onBack={() => navigation.goBack()} />
      {tags.length ? (
        <View style={styles.grid}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => navigation.navigate('NotesList', { tag })}
            >
              <Ionicons name="pricetag" size={22} color={colors.pillFitness.text} />
              <Text selectable style={[styles.tag, { color: colors.textPrimary }]}>{tag}</Text>
              <Text selectable style={[styles.count, { color: colors.textSecondary }]}>{count(tag)} notes</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState icon="pricetags-outline" message="No tags yet." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    width: '48%',
    ...SHADOWS.subtle,
  },
  tag: { fontSize: 15, fontWeight: '600' },
  count: { fontSize: 12 },
});
