import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createAgentController } from '@/ai/agent-controller';
import { createLocalModelRuntime } from '@/ai/local-model';
import { createMockToolHandlers } from '@/ai/mock-handlers';
import { BottomTabInset } from '@/constants/theme';
import { createScriptedPreview } from './scripted-preview';

function Button({ title, disabled, secondary, onPress }: {
  title: string; disabled?: boolean; secondary?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled) && styles.dim]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export default function ChatScreen() {
  const [preview, setPreview] = useState(false);
  const [revision, setRevision] = useState(0);
  return <ChatSession key={`${preview}:${revision}`} preview={preview}
    switchPreview={() => setPreview(!preview)} restartSession={() => setRevision((value) => value + 1)} />;
}

function ChatSession({ preview, switchPreview, restartSession }: { preview: boolean; switchPreview: () => void; restartSession: () => void }) {
  const [session] = useState(() => {
    const runtime = preview ? createScriptedPreview() : createLocalModelRuntime();
    return { runtime, agent: createAgentController(runtime, createMockToolHandlers()) };
  });
  const snapshot = useSyncExternalStore(session.agent.subscribe, session.agent.getSnapshot, session.agent.getSnapshot);
  const [uri, setUri] = useState('file:///data/user/0/com.paalalay.app/files/models/Qwen3-0.6B-Q8_0.gguf');
  const [loaded, setLoaded] = useState(preview);
  const [setupBusy, setSetupBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [modelStatus, setModelStatus] = useState(preview ? 'Scripted preview ready · no model running' : 'Model not loaded');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const setupLock = useRef(false);
  const actionLock = useRef(false);
  const mounted = useRef(true);
  const lifecycle = useRef({ version: 0 });
  const active = snapshot.phase !== 'idle';
  const locked = active || setupBusy || actionBusy;

  useEffect(() => {
    const guard = lifecycle.current;
    mounted.current = true;
    guard.version++;
    return () => {
      mounted.current = false;
      const cleanup = ++guard.version;
      // React Strict Mode replays effects; release only if no setup replay follows.
      void Promise.resolve().then(async () => {
        if (guard.version !== cleanup) return;
        await session.agent.dispose();
        await session.runtime.dispose();
      }).catch(() => {});
    };
  }, [session]);

  async function configure() {
    if (setupLock.current || actionLock.current || session.agent.getSnapshot().phase !== 'idle') return;
    setupLock.current = true;
    setSetupBusy(true);
    setError('');
    try {
      setModelStatus('Loading the device-local model on CPU…');
      await session.runtime.load(uri);
      if (mounted.current) { setLoaded(true); setModelStatus('Local model ready · synthetic services connected'); }
    } catch {
      if (mounted.current) {
        setLoaded(false);
        setModelStatus('Model setup failed');
        setError('Check that this development build includes llama.rn and that the device can read the file URI. No cloud fallback is used.');
      }
    } finally {
      setupLock.current = false;
      if (mounted.current) setSetupBusy(false);
    }
  }

  async function control(operation: () => Promise<void>) {
    if (actionLock.current || setupLock.current) return;
    actionLock.current = true;
    setActionBusy(true);
    setError('');
    try { await operation(); }
    catch { if (mounted.current) setError('This action is no longer available. Finish the current turn before trying again.'); }
    finally {
      actionLock.current = false;
      if (mounted.current) setActionBusy(false);
    }
  }

  function send(text = draft) {
    if (!loaded || locked || !text.trim() || actionLock.current || setupLock.current) return;
    setDraft('');
    setError('');
    void session.agent.send(text).catch(() => {
      if (mounted.current) { setDraft(text); setError('Finish the current turn before sending another message.'); }
    });
  }

  function resolveReview(confirm: boolean) {
    const review = session.agent.getSnapshot().review;
    if (!review || actionLock.current || setupLock.current) return;
    setError('');
    // The controller synchronously consumes the review; Stop remains available during follow-up.
    void (confirm ? session.agent.confirm(review.id) : session.agent.cancel(review.id)).catch(() => {
      if (mounted.current) setError('This confirmation is no longer valid.');
    });
  }

  const status = {
    idle: 'Ready', generating: 'Thinking locally…', executing: 'Running mock handler…',
    awaiting_confirmation: 'Waiting for your review', stopping: 'Stopping; waiting for the current operation…',
  }[snapshot.phase];

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => { if (snapshot.entries.length) scrollRef.current?.scrollToEnd({ animated: true }); }}>
        <Text style={styles.eyebrow}>PAALALAY / DEVELOPMENT</Text>
        <Text style={styles.heading}>Chat</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{preview ? 'SCRIPTED UI PREVIEW · NO MODEL INFERENCE' : 'LOCAL MODEL · MOCK SERVICES'}</Text>
          <Text style={styles.body}>History stays in memory. Only medication listing and blood-pressure recording have synthetic handlers. No health records are saved.</Text>
          {Platform.OS === 'web' && <>
            <Text style={styles.body}>Actual llama.rn inference needs an Android or iOS development build and a device-local GGUF. The browser has no native model.</Text>
            <Button title={preview ? 'Exit scripted preview' : 'Use scripted UI preview'} disabled={locked} secondary onPress={switchPreview} />
          </>}
        </View>

        {!preview && <View style={styles.card}>
          <Text style={styles.label}>Device model URI</Text>
          <TextInput accessibilityLabel="Chat model URI" value={uri} onChangeText={setUri} editable={!locked && !loaded}
            autoCorrect={false} autoCapitalize="none" style={styles.input} />
          <Text style={styles.body}>This example path must exist on your device. The project’s model file is not bundled with the app.</Text>
          <Text accessibilityLiveRegion="polite" style={styles.label}>{modelStatus}</Text>
          <View style={styles.actions}>
            <Button title="Load model" onPress={() => void configure()} disabled={locked || loaded || Platform.OS === 'web'} />
            <Button title="Unload model" secondary disabled={locked || !loaded} onPress={() => void control(async () => {
              await session.agent.reset();
              await session.runtime.dispose();
              if (mounted.current) restartSession();
            })} />
          </View>
          <Text style={styles.body}>Unloading clears this in-memory chat session.</Text>
        </View>}

        <View style={styles.actions}>
          <Button title="List medications sample" secondary disabled={locked || !loaded} onPress={() => send('List my medications.')} />
          <Button title="BP 120/80 sample" secondary disabled={locked || !loaded} onPress={() => send('Record my blood pressure as 120/80.')} />
          <Button title="Missing BP sample" secondary disabled={locked || !loaded} onPress={() => send('Record my blood pressure.')} />
        </View>

        {!snapshot.entries.length && <Text style={styles.empty}>{preview ? 'Choose a sample to exercise the conversation loop. Each write pauses here for your confirmation.' : 'Load your model to start a conversation. Each write pauses here for your confirmation.'}</Text>}
        {snapshot.entries.map((item) => <View key={item.id} style={[styles.message, item.role === 'user' && styles.userMessage, item.role === 'notice' && styles.statusMessage]}>
          <Text style={styles.messageLabel}>{item.role === 'tool' ? `Mock tool result · ${item.toolName}` : item.role === 'notice' ? 'Action status' : item.role === 'user' ? 'You' : preview ? 'Scripted assistant' : 'Local assistant'}</Text>
          <Text selectable style={item.role === 'tool' ? styles.code : styles.messageText}>{item.content}</Text>
        </View>)}

        {snapshot.review && <View style={styles.review}>
          <Text style={styles.reviewTitle}>{snapshot.review.title}</Text>
          <Text style={styles.body}>Review every value. Confirm runs a mock handler; no record is saved.</Text>
          {snapshot.review.fields.map((field) => <View key={field.label} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text><Text selectable style={styles.messageText}>{field.value}</Text>
          </View>)}
          <View style={styles.actions}>
            <Button title="Confirm mock action" disabled={actionBusy} onPress={() => resolveReview(true)} />
            <Button title="Cancel action" secondary disabled={actionBusy} onPress={() => resolveReview(false)} />
          </View>
        </View>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.statusRow}>
          <Text accessibilityLiveRegion="polite" style={styles.status}>{loaded ? status : modelStatus} · {snapshot.completions}/5</Text>
          <Button title="Stop" secondary disabled={!active || actionBusy || setupBusy} onPress={() => void control(session.agent.stop)} />
          <Button title="New chat" secondary disabled={locked || !snapshot.entries.length} onPress={() => void control(session.agent.reset)} />
        </View>
        <TextInput accessibilityLabel="Chat message" value={draft} onChangeText={setDraft} editable={loaded && !locked}
          multiline placeholder={loaded ? 'Type a message…' : 'Load the native model first'} placeholderTextColor="#627987" style={[styles.input, styles.draft]} />
        <Button title="Send message" disabled={locked || !loaded || !draft.trim()} onPress={() => send()} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#eef3f6' },
  content: { padding: 20, paddingTop: Platform.OS === 'web' ? 100 : 20, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  eyebrow: { color: '#486373', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heading: { color: '#132e3d', fontSize: 30, fontWeight: '700' },
  notice: { backgroundColor: '#e0f0ec', padding: 16, borderRadius: 12, gap: 10 },
  noticeTitle: { color: '#135646', fontSize: 13, fontWeight: '700' },
  body: { color: '#344e5d', fontSize: 14, lineHeight: 21 },
  card: { padding: 16, backgroundColor: '#fff', borderRadius: 12, gap: 10 },
  label: { color: '#344e5d', fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#b7cbd7', borderRadius: 8, padding: 12, color: '#132e3d', backgroundColor: '#f8fafb', fontSize: 14 },
  draft: { minHeight: 56, maxHeight: 130, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, backgroundColor: '#15675b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  secondary: { backgroundColor: '#dce8ee' }, buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryText: { color: '#244b5e' }, dim: { opacity: 0.45 },
  empty: { color: '#627987', fontSize: 15, paddingVertical: 20 },
  message: { backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 8 },
  userMessage: { backgroundColor: '#dcefe9', marginLeft: 24 }, statusMessage: { backgroundColor: '#e4ebef' },
  messageLabel: { color: '#486373', fontSize: 12, fontWeight: '700' },
  messageText: { color: '#132e3d', fontSize: 15, lineHeight: 23 },
  code: { color: '#213e4e', fontSize: 12, lineHeight: 19, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  review: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#248771', padding: 16, borderRadius: 14, gap: 12 },
  reviewTitle: { color: '#135646', fontSize: 20, fontWeight: '700' }, field: { gap: 4 },
  composer: { gap: 10, padding: 16, paddingBottom: Platform.OS === 'web' ? 16 : BottomTabInset + 16, borderTopWidth: 1, borderColor: '#cbdbe4', backgroundColor: '#fff', width: '100%', maxWidth: 800, alignSelf: 'center' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  status: { color: '#486373', fontSize: 12, flexGrow: 1 }, error: { color: '#9b2635', fontSize: 14, lineHeight: 21 },
});
