import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { MessageCircleHeart, Send, ShieldCheck } from '@/components/icons';
import { createAgentController } from '@/ai/agent-controller';
import { createLocalModelRuntime } from '@/ai/local-model';
import { prepareLocalModel } from '@/ai/model-provisioning';
import { createProductionToolHandlers } from '@/ai/production-handlers';
import { toolMetadata, isToolName } from '@/contracts/tools';
import { Colors } from '@/constants/theme';
import { getMemoryStore } from '../memories/store';
import { ActivityFeedback } from '@/components/activity-feedback';

function toolDisplay(content: string) {
  try {
    const result = JSON.parse(content);
    if (result.status === 'error') return result.error.code === 'CANCELLED' ? 'Cancelled. Nothing new was saved.' : 'This action could not be completed. Nothing was retried automatically.';
    const data = result.data;
    if (data.memory_id) return data.forgotten ? 'Memory forgotten. It won’t be included in future chat context.' : 'Memory saved for future chats. You can edit or forget it in Memories.';
    if (data.memories) return `${data.memories.length} saved memories checked.`;
    if (data.log_id) return 'Reading saved on your phone.';
    if (data.intake_id) return `Intake recorded as ${data.status}.`;
    if (data.medication_id) return 'Medicine saved on your phone.';
    if (data.schedule_ids) return 'Reminder times saved. Phone alerts can be enabled in Medicines.';
    if (data.sources) return data.sources.some((source: { excerpt?: string }) => source.excerpt) ? 'General reference information found. Verify your exact product leaflet or ask a pharmacist.' : 'A source link was found. Check the page and your exact product leaflet.';
    if (data.matches) return 'Local medicine-name reference checked. Names alone do not provide dosing advice.';
    if (data.medications) return `${data.medications.length} saved medicine${data.medications.length === 1 ? '' : 's'} found.`;
    return 'Your saved records were checked.';
  } catch { return 'Action result received.'; }
}
function sources(content: string): { title: string; url: `https://${string}` }[] {
  try {
    const result = JSON.parse(content);
    return result.status === 'success' && Array.isArray(result.data.sources) ? result.data.sources.filter((source: { title?: unknown; url?: unknown }) => typeof source.title === 'string' && typeof source.url === 'string' && /^https:\/\/www\.nhs\.uk\/medicines\/[a-z0-9-/]+\/$/.test(source.url)) : [];
  } catch { return []; }
}
export default function ChatScreen() {
  const params = useLocalSearchParams<{ suggestion?: string }>();
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => makeStyles(c), [c]);
  const [session] = useState(() => {
    const model = createLocalModelRuntime();
    return { model, agent: createAgentController(model, createProductionToolHandlers(), { persistentTools: true, groundMeasurementWrites: true, loadMemories: async () => (await (await getMemoryStore()).list()).map(memory => memory.text) }) };
  });
  const snapshot = useSyncExternalStore(session.agent.subscribe, session.agent.getSnapshot, session.agent.getSnapshot);
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(Platform.OS !== 'web');
  const [preparation, setPreparation] = useState(Platform.OS === 'web' ? 'The private offline assistant is available in the Android and iOS app.' : 'Preparing your private assistant…');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const lifecycle = useRef({ version: 0 });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    const abort = new AbortController();
    void prepareLocalModel(abort.signal, message => { if (mounted) setPreparation(message); })
      .then(uri => { if (!mounted) return; setPreparation('Starting your assistant…'); return session.model.load(uri); })
      .then(() => { if (mounted) { setReady(true); setPreparing(false); setPreparation('Ready · Runs on your phone'); } })
      .catch(error => { if (mounted) { setPreparing(false); setPreparation(error instanceof Error ? error.message : 'The assistant could not start. You can still use Medicines and Log.'); } });
    return () => { mounted = false; abort.abort(); };
  }, [attempt, session]);
  useEffect(() => {
    const guard = lifecycle.current;
    const version = ++guard.version;
    return () => { queueMicrotask(() => { if (guard.version === version) { void session.agent.dispose().finally(() => session.model.dispose()).catch(() => {}); } }); };
  }, [session]);
  const busy = snapshot.phase !== 'idle';
  const suggestedDraft = params.suggestion && !busy ? params.suggestion : undefined;
  const visibleDraft = suggestedDraft ?? draft;
  function send(message = visibleDraft) {
    if (!ready || busy || !message.trim()) return;
    setDraft(''); router.setParams({ suggestion: undefined }); setError('');
    void session.agent.send(message).catch(() => { setDraft(message); setError('Finish the current action before sending another message.'); });
  }
  const review = snapshot.review;
  const online = review?.toolName === 'search_medicine_guidance';
  const status = { idle: 'Ready', generating: 'Thinking…', executing: 'Completing your action…', awaiting_confirmation: 'Waiting for your review', stopping: 'Stopping…' }[snapshot.phase];
  const button = (title: string, action: () => void, disabled = false, secondary = false) => <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={action} disabled={disabled} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && { color: c.primary }]}>{title}</Text></Pressable>;
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} onContentSizeChange={() => { if (snapshot.entries.length) scroll.current?.scrollToEnd({ animated: true }); }}>
      <View style={styles.intro}><MessageCircleHeart size={36} color={c.primary} strokeWidth={1.75} /><Text style={styles.heading}>Kumusta. How can I help?</Text><Text style={styles.body}>Keep track of medicines and readings, or find general medicine information. I’ll ask before saving anything or going online.</Text><View style={styles.trust}><ShieldCheck color={c.primary} size={18}/><Text style={styles.caption}>Conversation stays in memory. Approved memories stay on your phone.</Text></View></View>
      {button('Manage memories', () => router.push('/memories'), busy, true)}
      {!ready && <View style={styles.card}>{preparing && <ActivityFeedback label="Preparing your private assistant…"/>}<Text accessibilityLiveRegion="polite" style={styles.body}>{preparation}</Text>{!preparing && Platform.OS !== 'web' && button('Try again', () => { setPreparing(true); setAttempt(value => value + 1); })}</View>}
      {!snapshot.entries.length && <View style={styles.suggestions}>{['Show my medicines', 'Show today’s reminders', 'Help me record a reading'].map(title => <View key={title}>{button(title, () => send(title), !ready || busy, true)}</View>)}</View>}
      {snapshot.entries.map(entry => <View key={entry.id} style={[styles.message, entry.role === 'user' && styles.user]}>
        <Text style={styles.label}>{entry.role === 'user' ? 'You' : entry.role === 'assistant' ? 'Alalay' : entry.toolName && isToolName(entry.toolName) ? toolMetadata[entry.toolName].title : 'Action status'}</Text>
        <Text selectable style={styles.messageText}>{entry.role === 'tool' ? toolDisplay(entry.content) : entry.role === 'notice' && entry.content.startsWith('Proposed ') ? 'Reviewing the requested action…' : entry.content}</Text>
        {entry.role === 'tool' && sources(entry.content).map(source => <Link key={source.url} href={source.url} style={styles.source}>{source.title} · NHS source</Link>)}
      </View>)}
      {busy && snapshot.phase !== 'awaiting_confirmation' && <ActivityFeedback label={status}/>}
      {review && <View style={styles.review}><Text style={styles.reviewHeading}>{review.title}</Text><Text style={styles.body}>{online ? 'Allow this lookup on nhs.uk? NHS receives your IP address and the requested medicine pages. Your chat and saved records are not sent. Permission applies to this lookup only. Verify the exact product leaflet or pharmacist before acting.' : 'Check every detail. Confirm applies this action on your phone.'}</Text>{review.fields.map(field => <View key={field.label}><Text style={styles.label}>{field.label}</Text><Text selectable style={styles.messageText}>{field.value}</Text></View>)}<View style={styles.suggestions}>{button(online ? 'Allow online lookup' : review.toolName === 'forget_memory' ? 'Confirm and forget' : 'Confirm and save', () => { void session.agent.confirm(review.id).catch(() => setError('This review has expired.')); })}{button('Cancel', () => { void session.agent.cancel(review.id).catch(() => setError('This review has expired.')); }, false, true)}</View></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
    <View style={styles.composer}><View style={styles.status}><Text accessibilityLiveRegion="polite" style={styles.caption}>{ready ? status : preparing ? 'Preparing assistant…' : 'Assistant unavailable'}</Text>{busy ? button('Stop', () => { void session.agent.stop(); }, snapshot.phase === 'stopping', true) : snapshot.entries.length > 0 && button('New chat', () => { void session.agent.reset(); }, false, true)}</View><View style={styles.inputRow}><TextInput accessibilityLabel="Message Alalay" value={visibleDraft} onChangeText={text => { router.setParams({ suggestion: undefined }); setDraft(text); }} editable={ready && !busy} multiline placeholder="Message Alalay…" placeholderTextColor={c.textMuted} style={styles.input}/><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!ready || busy || !visibleDraft.trim()} onPress={() => send()} style={[styles.send, (!ready || busy || !visibleDraft.trim()) && styles.disabled]}><Send color={c.onPrimary} size={22}/></Pressable></View></View>
  </KeyboardAvoidingView>;
}
function makeStyles(c: typeof Colors.light | typeof Colors.dark) { return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, content: { padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 24 }, intro: { gap: 12, paddingVertical: 12 }, heading: { fontFamily: 'Manrope_700Bold', fontSize: 26, color: c.text }, body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23, color: c.textMuted }, caption: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, color: c.textMuted, flexShrink: 1 }, trust: { flexDirection: 'row', alignItems: 'center', gap: 8 }, card: { borderRadius: 16, backgroundColor: c.surface, padding: 16, gap: 12 }, suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 48, justifyContent: 'center', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: c.primary }, secondary: { backgroundColor: c.surfaceVariant }, buttonText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: c.onPrimary }, disabled: { opacity: 0.4 }, message: { borderRadius: 16, backgroundColor: c.surface, padding: 16, gap: 8 }, user: { backgroundColor: c.surfaceVariant, marginLeft: 28 }, label: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: c.textMuted }, messageText: { fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 24, color: c.text }, source: { color: c.primary, fontFamily: 'Manrope_600SemiBold', fontSize: 15, paddingVertical: 12 }, review: { padding: 16, gap: 16, borderWidth: 2, borderColor: c.primary, borderRadius: 16, backgroundColor: c.surface }, reviewHeading: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: c.primary }, composer: { padding: 16, gap: 8, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surface }, status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' }, input: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, minHeight: 52, maxHeight: 130, color: c.text, fontSize: 16 }, send: { minHeight: 52, width: 52, borderRadius: 26, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }, error: { color: c.error, fontSize: 15 },
}); }
