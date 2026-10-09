import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createToolDispatcher, type ConfirmationReview } from '@/ai/dispatcher';
import { createLocalModelRuntime } from '@/ai/local-model';
import type { LocalModelRuntime, ModelProbeResult } from '@/ai/local-model.types';
import { createMockToolHandlers } from '@/ai/mock-handlers';
import { toolExamples } from '@/ai/tool-examples';
import { getModelTools, isToolName, toolMetadata, type ToolName } from '@/contracts/tools';

const modelFilename = 'Qwen3-0.6B-Q8_0.gguf';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function Button({ title, onPress, disabled = false, secondary = false }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && styles.dim]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export default function DevToolsScreen() {
  const [dispatcher] = useState(() => createToolDispatcher(createMockToolHandlers()));
  const [toolName, setToolName] = useState<string>('log_blood_pressure');
  const [argsText, setArgsText] = useState(pretty(toolExamples.log_blood_pressure));
  const [review, setReview] = useState<ConfirmationReview>();
  const [result, setResult] = useState('Run a tool to see its response.');
  const [toolBusy, setToolBusy] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [modelUri, setModelUri] = useState(`file:///data/user/0/com.paalalay.app/files/models/${modelFilename}`);
  const [modelStatus, setModelStatus] = useState('Not loaded');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [prompt, setPrompt] = useState('Record my blood pressure: systolic 120, diastolic 80.');
  const [probe, setProbe] = useState<ModelProbeResult>();
  const runtimeRef = useRef<LocalModelRuntime | undefined>(undefined);
  const aliveRef = useRef(true);
  const toolLock = useRef(false);
  const modelLock = useRef(false);
  const reviewRef = useRef<ConfirmationReview | undefined>(undefined);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (reviewRef.current) dispatcher.cancel(reviewRef.current.id);
      const runtime = runtimeRef.current;
      runtimeRef.current = undefined;
      void runtime?.dispose().catch(() => {});
    };
  }, [dispatcher]);

  function selectTool(name: ToolName) {
    if (review || toolLock.current) return;
    setToolName(name);
    setArgsText(pretty(toolExamples[name]));
    setResult('Ready. Sample arguments are synthetic.');
  }

  async function runTool() {
    if (toolLock.current || reviewRef.current) return;
    let args: unknown;
    try { args = JSON.parse(argsText); }
    catch { setResult('Invalid JSON. Check quotes, commas, and braces.'); return; }
    toolLock.current = true;
    setToolBusy(true);
    try {
      const outcome = await dispatcher.propose(toolName.trim(), args);
      if (!aliveRef.current) {
        if (outcome.kind === 'confirmation') dispatcher.cancel(outcome.review.id);
        return;
      }
      if (outcome.kind === 'confirmation') {
        reviewRef.current = outcome.review;
        setReview(outcome.review);
        setResult('Waiting for confirmation. No handler has run.');
      } else setResult(pretty(outcome.result));
    } finally {
      toolLock.current = false;
      if (aliveRef.current) setToolBusy(false);
    }
  }

  async function confirm() {
    const current = reviewRef.current;
    if (!current || toolLock.current) return;
    toolLock.current = true;
    setToolBusy(true);
    try {
      const response = await dispatcher.confirm(current.id);
      if (aliveRef.current) { setResult(pretty(response)); setReview(undefined); }
      reviewRef.current = undefined;
    } finally {
      toolLock.current = false;
      if (aliveRef.current) setToolBusy(false);
    }
  }

  function cancel() {
    if (!reviewRef.current || toolLock.current) return;
    setResult(pretty(dispatcher.cancel(reviewRef.current.id)));
    reviewRef.current = undefined;
    setReview(undefined);
  }

  async function modelOperation(operation: 'load' | 'complete' | 'tools' | 'unload') {
    if (modelLock.current) return;
    modelLock.current = true;
    setModelBusy(true);
    setProbe(undefined);
    try {
      const runtime = runtimeRef.current ?? (runtimeRef.current = createLocalModelRuntime());
      if (operation === 'load') {
        setModelLoaded(false);
        setModelStatus('Loading model on CPU…');
        await runtime.load(modelUri);
        if (aliveRef.current) { setModelLoaded(true); setModelStatus('Loaded. Ready for an offline prompt.'); }
      } else if (operation === 'unload') {
        await runtime.dispose();
        runtimeRef.current = undefined;
        if (aliveRef.current) { setModelLoaded(false); setModelStatus('Unloaded'); }
      } else {
        setModelStatus('Generating…');
        const output = await runtime.complete(prompt, operation === 'tools');
        if (aliveRef.current) { setProbe(output); setModelStatus('Completed. Proposals have not executed.'); }
      }
    } catch {
      if (aliveRef.current) {
        if (operation === 'load' || operation === 'unload') setModelLoaded(false);
        setModelStatus(operation === 'load'
          ? 'Load failed. Check the device file URI and that this development build includes llama.rn.'
          : 'Model operation failed. Check model/template support or unload and reload.');
      }
    } finally {
      modelLock.current = false;
      if (aliveRef.current) setModelBusy(false);
    }
  }

  function copyProposal() {
    if (reviewRef.current || toolLock.current || !probe || probe.toolCalls.length !== 1) return;
    const call = probe.toolCalls[0];
    setToolName(call.name);
    setArgsText(call.arguments);
    setResult('Model proposal copied. Run it to validate and review; nothing has executed.');
  }

  const toolDisabled = toolBusy || !!review;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.eyebrow}>PAALALAY / DEVELOPMENT</Text>
        <Text style={styles.heading}>Test bench</Text>
        <Text style={styles.caption}>Temporary screen for local tools and model probes. Use synthetic inputs.</Text>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Mock services · no database connection</Text>
          <Text style={styles.body}>Only list_medications and log_blood_pressure are connected. Other tools return NOT_FOUND. Mock success does not save a record.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>1. Tool dispatcher</Text>
          <Text style={styles.body}>Choose a contract to fill sample JSON, or enter any tool name to test rejection.</Text>
          <View style={styles.chips}>
            {(Object.keys(toolMetadata) as ToolName[]).map((name) => (
              <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: toolName === name, disabled: toolDisabled }}
                disabled={toolDisabled} onPress={() => selectTool(name)}
                style={[styles.chip, toolName === name && styles.chipSelected, toolDisabled && styles.dim]}>
                <Text style={styles.chipText}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Tool name</Text>
          <TextInput accessibilityLabel="Tool name" value={toolName} onChangeText={setToolName} editable={!toolDisabled}
            autoCapitalize="none" autoCorrect={false} style={styles.input} />
          <Text style={styles.label}>Arguments (JSON)</Text>
          <TextInput accessibilityLabel="Tool arguments JSON" value={argsText} onChangeText={setArgsText} editable={!toolDisabled}
            multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={[styles.input, styles.editor]} />
          <View style={styles.actions}>
            <Button title={toolBusy ? 'Running…' : 'Run tool'} onPress={() => void runTool()} disabled={toolDisabled} />
            <Button title={showSchema ? 'Hide schema' : 'Show schema'} onPress={() => setShowSchema(!showSchema)} secondary />
            <Button title="Invalid BP sample" onPress={() => { setToolName('log_blood_pressure'); setArgsText('{"systolic":120}'); }} disabled={toolDisabled} secondary />
          </View>
          {showSchema && <Text selectable style={styles.code}>{isToolName(toolName)
            ? pretty(getModelTools().find((tool) => tool.function.name === toolName)) : 'Unknown or internal tool.'}</Text>}
        </View>

        {review && <View style={[styles.card, styles.review]}>
          <Text style={styles.section}>Review: {review.title}</Text>
          <Text style={styles.body}>Confirm runs a synthetic mock handler. Cancel runs nothing.</Text>
          {review.fields.map((field) => <View key={field.label} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text><Text selectable style={styles.body}>{field.value}</Text>
          </View>)}
          <View style={styles.actions}>
            <Button title="Confirm mock action" onPress={() => void confirm()} disabled={toolBusy} />
            <Button title="Cancel" onPress={cancel} disabled={toolBusy} secondary />
          </View>
        </View>}

        <View style={styles.card}>
          <Text style={styles.section}>Response</Text><Text selectable style={styles.code}>{result}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>2. Local model probe</Text>
          <Text style={styles.body}>Development model: {modelFilename}. Copy it onto the device separately; it is excluded from the package.</Text>
          <Text style={styles.body}>This URI is an example device path. A Windows project path cannot be loaded by Android.</Text>
          {Platform.OS === 'web' && <Text style={styles.noticeTitle}>Model inference is available in native development builds only. Tools above work on web.</Text>}
          <Text style={styles.label}>Device model URI</Text>
          <TextInput accessibilityLabel="Device model URI" value={modelUri} onChangeText={setModelUri} editable={!modelBusy && !modelLoaded}
            autoCapitalize="none" autoCorrect={false} style={styles.input} />
          <Text accessibilityLiveRegion="polite" style={styles.body}>{modelStatus}</Text>
          <View style={styles.actions}>
            <Button title="Load model" onPress={() => void modelOperation('load')} disabled={Platform.OS === 'web' || modelBusy || modelLoaded} />
            <Button title="Unload" onPress={() => void modelOperation('unload')} disabled={modelBusy || !modelLoaded} secondary />
          </View>
          <Text style={styles.label}>Test prompt</Text>
          <TextInput accessibilityLabel="Model test prompt" value={prompt} onChangeText={setPrompt} editable={!modelBusy}
            multiline style={[styles.input, styles.prompt]} />
          <View style={styles.actions}>
            <Button title="Generate text" onPress={() => void modelOperation('complete')} disabled={modelBusy || !modelLoaded} />
            <Button title="Propose tool" onPress={() => void modelOperation('tools')} disabled={modelBusy || !modelLoaded} secondary />
          </View>
          {probe && <>
            <Text selectable style={styles.code}>{pretty(probe)}</Text>
            <Button title="Copy proposal to tool panel" onPress={copyProposal} disabled={toolDisabled || probe.toolCalls.length !== 1} secondary />
            <Text style={styles.body}>Tool proposals require separate validation and review above. Multiple calls are not dispatched.</Text>
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef3f6' },
  content: { padding: 20, paddingTop: Platform.OS === 'web' ? 96 : 20, paddingBottom: 120, gap: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#486373', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heading: { fontSize: 32, fontWeight: '700', color: '#132e3d' },
  caption: { color: '#486373', fontSize: 16, lineHeight: 24 },
  notice: { backgroundColor: '#e0f0ec', padding: 16, borderRadius: 12, gap: 8 },
  noticeTitle: { color: '#135646', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: '#d7e2e8' },
  section: { color: '#132e3d', fontWeight: '700', fontSize: 20 },
  body: { color: '#344e5d', fontSize: 14, lineHeight: 21 },
  label: { color: '#344e5d', fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: '#f5f8fa', color: '#132e3d', borderWidth: 1, borderColor: '#b7cbd7', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 48 },
  editor: { minHeight: 160, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  prompt: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f2f5f7', borderRadius: 8, padding: 10, minHeight: 44, justifyContent: 'center' },
  chipSelected: { backgroundColor: '#ccebe3' },
  chipText: { fontSize: 12, color: '#173f42' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { backgroundColor: '#15675b', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  secondary: { backgroundColor: '#e6eef2' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryText: { color: '#244b5e' },
  dim: { opacity: 0.45 },
  code: { color: '#213e4e', fontSize: 12, lineHeight: 19, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: '#f5f8fa', padding: 12, borderRadius: 8 },
  review: { borderColor: '#248771', borderWidth: 2 },
  field: { gap: 4 },
});
