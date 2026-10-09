import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { getMemoryStore } from './store';
import type { Memory } from './repository';
import { CareButton, CareField, EntrySheet } from '@/components/care-ui';
import { ActivityFeedback } from '@/components/activity-feedback';

export default function MemoriesScreen() {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(Platform.OS !== 'web'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [selected, setSelected] = useState<Memory>(), [forgetting, setForgetting] = useState<Memory>();
  const [draft, setDraft] = useState('');
  const lock = useRef(false), version = useRef(0);
  const load = useCallback(() => {
    if (Platform.OS === 'web') return;
    const current = ++version.current;
    setLoading(true); setError('');
    void getMemoryStore().then(store => store.list()).then(rows => { if (version.current === current) { setMemories(rows); setLoading(false); } }).catch(() => { if (version.current === current) { setLoading(false); setError('Your memories could not be loaded. Nothing has been changed.'); } });
  }, []);
  useFocusEffect(useCallback(() => {
    load();
    return () => { version.current++; };
  }, [load]));
  async function run(operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await operation(); setMemories(await (await getMemoryStore()).list()); setSelected(undefined); setForgetting(undefined); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not change this memory.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.text }]}>A little context, remembered.</Text><Text style={[styles.body, { color: c.textMuted }]}>Alalay can keep preferences you approve for future chats. You’re in control: edit or forget them here. New chat does not clear memories.</Text>
      <CareButton label="Back to Assistant" secondary onPress={() => router.push('/assistant')} disabled={busy}/>
      {Platform.OS === 'web' ? <Text style={[styles.body, { color: c.textMuted }]}>Private memories live on your phone and are available in the native app.</Text> : loading ? <ActivityFeedback label="Opening your memories…"/> : !memories.length && !error ? <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.title, { color: c.text }]}>Nothing remembered yet.</Text><Text style={[styles.body, { color: c.textMuted }]}>Try “Remember that I prefer short replies” in chat. You’ll review it before anything is saved.</Text><CareButton label="Tell Alalay what to remember" onPress={() => router.push({ pathname: '/assistant', params: { suggestion: 'Remember that I prefer short replies' } })}/></View> : memories.map(memory => <View key={memory.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.body, { color: c.text }]}>{memory.text}</Text><Text style={[styles.caption, { color: c.textMuted }]}>Updated {new Date(memory.updated_at).toLocaleDateString()}</Text><View style={styles.actions}><CareButton label="Edit" secondary disabled={busy} onPress={() => { setError(''); setSelected(memory); setDraft(memory.text); }}/><CareButton label="Forget" secondary disabled={busy} onPress={() => { setError(''); setForgetting(memory); }}/></View></View>)}
      {!!error && !selected && !forgetting && <Text accessibilityRole="alert" style={[styles.body, { color: c.error }]}>{error}</Text>}
      {!!error && !selected && !forgetting && <CareButton label="Try loading memories again" secondary disabled={busy || loading} onPress={load}/>}
      <Text style={[styles.caption, { color: c.textMuted }]}>Up to 40 memories stay on this device. The 12 most recently updated are included in each chat completion. They are preferences, not prescriptions or proof of medical facts. Your conversation is not saved automatically.</Text>
    </ScrollView>
    <EntrySheet visible={Boolean(selected)} title="Edit memory" busy={busy} onClose={() => setSelected(undefined)}><CareField label="Memory (up to 300 characters)" value={draft} onChange={setDraft} multiline disabled={busy}/>{!!error && <Text accessibilityRole="alert" style={{ color: c.error }}>{error}</Text>}<CareButton label={busy ? 'Saving…' : 'Save changes'} disabled={busy} onPress={() => { if (selected) void run(async () => (await getMemoryStore()).update(selected.id, draft)); }}/></EntrySheet>
    <EntrySheet visible={Boolean(forgetting)} title="Forget this memory?" busy={busy} onClose={() => setForgetting(undefined)}><Text style={[styles.body, { color: c.text }]}>{forgetting?.text}</Text><Text style={[styles.body, { color: c.textMuted }]}>It will be removed from saved memories and future chat context. Messages already in the current conversation are not erased; start a new chat to clear them.</Text>{!!error && <Text accessibilityRole="alert" style={{ color: c.error }}>{error}</Text>}<CareButton label={busy ? 'Forgetting…' : 'Confirm and forget'} disabled={busy} onPress={() => { if (forgetting) void run(async () => (await getMemoryStore()).forget(forgetting.id, forgetting.text)); }}/><CareButton label="Keep memory" secondary disabled={busy} onPress={() => setForgetting(undefined)}/></EntrySheet>
  </>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }, title: { fontFamily: 'Manrope_700Bold', fontSize: 25, lineHeight: 34 }, body: { fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 25 }, caption: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20 }, card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 }, actions: { flexDirection: 'row', gap: 10 } });
