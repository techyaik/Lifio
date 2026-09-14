import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AppHeader } from '../../components/AppHeader';
import { InputField } from '../../components/InputField';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { useNotes } from '../../hooks/useNotes';
import { showToast, safeConfirm } from '../../utils/feedback';
import { RADIUS, SHADOWS } from '../../constants/theme';

const wrap = (text, prefix, suffix = prefix) => (text ? `${prefix}${text}${suffix}` : '');

export default function NoteEditor({ navigation, route }) {
  const { notes, addNote, updateNote, deleteNote, getAllTags } = useNotes();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const note = notes.find((item) => item.id === route.params?.note?.id) || route.params?.note;
  const [id] = useState(note?.id || Date.now().toString());
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [tags, setTags] = useState(note?.tags || []);
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [tagModal, setTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const createdRef = useRef(Boolean(note));
  const timerRef = useRef(null);

  const persist = async (showMessage = false) => {
    if (saving) return;
    const isBlankDraft = !title.trim() && !body.trim() && !tags.length && !pinned;
    if (isBlankDraft && !createdRef.current) {
      return false;
    }
    const now = new Date().toISOString();
    const payload = {
      id,
      title: title.trim() || 'Untitled',
      body,
      tags,
      pinned,
      createdAt: note?.createdAt || now,
      updatedAt: now,
    };
    setSaving(true);
    try {
      if (createdRef.current) await updateNote(id, payload);
      else {
        await addNote(payload);
        createdRef.current = true;
      }
      if (showMessage) showToast('Saved ✓');
      return true;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!createdRef.current && !title.trim() && !body.trim() && !tags.length && !pinned) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(false), 500);
    return () => clearTimeout(timerRef.current);
  }, [title, body, tags, pinned]);

  const addTag = () => {
    const value = newTag.trim();
    if (value && !tags.includes(value)) setTags((current) => [...current, value]);
    setNewTag('');
    setTagModal(false);
  };

  const saveAndBack = async () => {
    try {
      await persist(true);
      navigation.goBack();
    } catch (error) {
      console.error('Save note failed:', error);
      showToast('Could not save note: ' + (error.message || 'Please try again.'));
    }
  };

  const confirmDelete = () => {
    const performDelete = async () => {
      // Cancel any pending auto-save before deleting
      clearTimeout(timerRef.current);
      try {
        if (!createdRef.current) {
          navigation.goBack();
          return;
        }
        await deleteNote(id);
        showToast('Note deleted ✓');
        navigation.navigate('NotesList');
      } catch (error) {
        console.error('Delete note failed:', error);
        showToast('Failed to delete note: ' + error.message);
      }
    };

    safeConfirm('Delete note?', 'This note will be removed permanently.', performDelete, 'Cancel', 'Delete');
  };

  const existingTags = getAllTags();

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <AppHeader title={note ? 'Edit note' : 'New note'} onBack={saveAndBack} rightText="Save" accent={colors.notes} onRight={saveAndBack} />
        <InputField value={title} onChangeText={setTitle} placeholder="Title" style={[styles.titleInput, { backgroundColor: colors.bg, color: colors.textPrimary }]} />
        <InputField value={body} onChangeText={setBody} placeholder="Start writing..." multiline style={styles.bodyInput} />
        <View style={styles.tags}>
          {existingTags.map((tag) => (
            <Pill
              key={tag}
              label={tag}
              selected={tags.includes(tag)}
              onPress={() => setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]))}
              palette={colors.pillFitness}
            />
          ))}
          <Pill label="+ Add tag" onPress={() => setTagModal(true)} palette={colors.pillFitness} />
        </View>
      </Screen>
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, paddingBottom: Math.max(insets.bottom + 16, 24) + 64 }]}>
        <Tool label="B" onPress={() => setBody((current) => wrap(current, '**'))} colors={colors} />
        <Tool label="I" onPress={() => setBody((current) => wrap(current, '*'))} colors={colors} />
        <Tool icon="list" onPress={() => setBody((current) => `${current}\n- `)} colors={colors} />
        <Tool icon="link" onPress={() => setBody((current) => `${current}\n[title](https://)`)} colors={colors} />
        <Tool icon={pinned ? 'pin' : 'pin-outline'} active={pinned} onPress={() => setPinned((current) => !current)} colors={colors} />
        <Tool icon="trash-outline" danger onPress={confirmDelete} colors={colors} />
      </View>
      {tagModal && (
        <Modal visible={tagModal} transparent animationType="fade">
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setTagModal(false)} />
            <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add tag</Text>
              <InputField value={newTag} onChangeText={setNewTag} placeholder="Tag name" autoFocus />
              <Pressable onPress={addTag} style={[styles.modalButton, { backgroundColor: colors.notes }]}>
                <Text style={[styles.modalButtonText, { color: colors.white }]}>Add</Text>
              </Pressable>
            </Pressable>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

function Tool({ icon, label, onPress, danger, active, colors }) {
  return (
    <Pressable onPress={onPress} style={[styles.tool, active ? [styles.toolActive, { backgroundColor: colors.surface }] : null]}>
      {icon ? (
        <Ionicons name={icon} size={20} color={danger ? colors.danger : active ? colors.pillFitness.text : colors.textSecondary} />
      ) : (
        <Text style={[styles.toolLabel, { color: active ? colors.pillFitness.text : colors.textSecondary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleInput: { borderWidth: 0, fontSize: 22, fontWeight: '600' },
  bodyInput: { minHeight: 300 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolbar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 18,
    paddingTop: 8,
    ...SHADOWS.soft,
  },
  tool: { alignItems: 'center', borderRadius: RADIUS.pill, height: 38, justifyContent: 'center', width: 38 },
  toolLabel: { fontSize: 15, fontWeight: '700' },
  toolActive: { ...SHADOWS.subtle },
  modalBackdrop: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: RADIUS.lg, gap: 12, padding: 18, width: '100%', ...SHADOWS.soft },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalButton: { alignItems: 'center', borderRadius: RADIUS.md, padding: 13, ...SHADOWS.subtle },
  modalButtonText: { fontWeight: '600' },
});
