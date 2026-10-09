import { createToolDispatcher, type ConfirmationReview } from './dispatcher';
import { MODEL_INPUT_TOKENS } from './model-config';
import { createSystemMessage } from './system-prompt';
import type { ConversationMessage, ConversationModel, ModelToolCall } from './local-model.types';
import { isToolName, toolError, toolInputSchemas, toolMetadata, type ToolHandlers, type ToolResult } from '../contracts/tools';

export type AgentPhase = 'idle' | 'generating' | 'executing' | 'awaiting_confirmation' | 'stopping';
export type ChatEntry = { id: number; role: 'user' | 'assistant' | 'tool' | 'notice'; content: string; toolName?: string };
export type AgentSnapshot = {
  phase: AgentPhase; entries: readonly ChatEntry[]; review?: ConfirmationReview; completions: number;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Model and services are injected; no React, native modules, storage, or network access. */
export function createAgentController(model: ConversationModel, handlers: ToolHandlers, options?: { persistentTools?: boolean }) {
  const instructions = createSystemMessage(options?.persistentTools ? 'persistent' : 'mock');
  const dispatcher = createToolDispatcher(handlers);
  const listeners = new Set<() => void>();
  const history: ConversationMessage[][] = [];
  const entries: ChatEntry[] = [];
  const usedCallIds = new Set<string>();
  let snapshot: AgentSnapshot = Object.freeze({ phase: 'idle', entries: [], completions: 0 });
  let task: Promise<void> | undefined;
  let stopped = false;
  let closed = false;
  let calls = 0;
  let finalOnly = false;
  let entryId = 0;
  let callId = 0;
  let pending: { review: ConfirmationReview; call: Required<ModelToolCall>; writeKey?: string } | undefined;
  const successfulWrites = new Set<string>();
  const current = () => history[history.length - 1];

  function publish(phase: AgentPhase) {
    snapshot = Object.freeze({ phase, entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))), review: pending?.review, completions: calls });
    listeners.forEach((listener) => listener());
  }
  function entry(role: ChatEntry['role'], content: string, toolName?: string) {
    entries.push({ id: ++entryId, role, content, toolName });
  }
  function notice(content: string) {
    entry('notice', content);
    current()?.push({ role: 'assistant', content });
  }
  function appendResult(call: Required<ModelToolCall>, result: ToolResult) {
    current().push({ role: 'tool', name: call.name, tool_call_id: call.id, content: JSON.stringify(result) });
    entry('tool', JSON.stringify(result, null, 2), call.name);
    if (result.status === 'error') finalOnly = true;
  }

  async function context(withTools: boolean) {
    let start = 0;
    while (true) {
      const messages = [instructions, ...history.slice(start).flat()];
      // Match native allocation, reserving output tokens and a safety margin.
      const count = await model.countTokens(messages, withTools);
      if (stopped || closed) return undefined;
      if (count <= MODEL_INPUT_TOKENS) return messages;
      if (start >= history.length - 1) {
        notice(`The active request is too large for the model context (${count} input tokens; limit ${MODEL_INPUT_TOKENS}, including system instructions and tool schemas). No additional tool was executed. Shorten the message or start a new chat.`);
        return undefined;
      }
      start++; // Drop only complete older user turns, never part of an active exchange.
    }
  }

  async function loop() {
    while (!stopped && !closed && calls < 5) {
      const withTools = !finalOnly && calls < 4;
      const messages = await context(withTools);
      if (!messages) return;
      publish('generating');
      calls++;
      const output = await model.generate(messages, withTools);
      if (stopped || closed) return;
      if (!output.toolCalls.length) {
        const text = output.text.trim() || 'The model returned no answer. Try rephrasing your message.';
        current().push({ role: 'assistant', content: text });
        entry('assistant', text);
        return;
      }
      if (!withTools || output.toolCalls.length !== 1) {
        notice(withTools ? 'Multiple tool calls were rejected. No action was executed; request one action at a time.' : 'The model proposed another tool while tools were disabled. No action was executed.');
        return;
      }
      const proposal = output.toolCalls[0];
      let id = proposal.id;
      if (!id || usedCallIds.has(id)) {
        do { id = `paalalay_call_${++callId}`; } while (usedCallIds.has(id));
      }
      usedCallIds.add(id);
      const call = { ...proposal, id };
      current().push({ role: 'assistant', content: '', tool_calls: [{ id, type: 'function', function: { name: call.name, arguments: call.arguments } }] });
      entry('notice', `Proposed ${call.name}; not executed.`, call.name);
      let args: unknown;
      try { args = JSON.parse(call.arguments); }
      catch { appendResult(call, toolError('VALIDATION_ERROR', 'Tool arguments were not valid JSON. Ask the user to clarify.')); continue; }
      let writeKey: string | undefined;
      if (isToolName(call.name) && toolMetadata[call.name].mode === 'write') {
        const validated = toolInputSchemas[call.name].safeParse(args);
        if (validated.success) writeKey = `${call.name}:${canonical(validated.data)}`;
      }
      if (writeKey && successfulWrites.has(writeKey)) {
        appendResult(call, toolError('PERMISSION_DENIED', 'This write already succeeded in this user turn. It was not executed again.'));
        continue;
      }
      publish('executing');
      const outcome = await dispatcher.propose(call.name, args);
      if (outcome.kind === 'confirmation') {
        if (stopped || closed) {
          appendResult(call, dispatcher.cancel(outcome.review.id));
          return;
        }
        pending = { review: outcome.review, call, writeKey };
        publish('awaiting_confirmation');
        return;
      }
      appendResult(call, outcome.result);
      if (stopped || closed) return;
    }
  }

  function launch(operation: () => Promise<void>): Promise<void> {
    // Install the lock synchronously; model/service calls begin on the next microtask.
    const running = Promise.resolve().then(operation).catch(() => {
      if (!stopped && !closed) notice('The local model could not finish this turn. Any displayed tool result remains valid; no automatic retry was made.');
    }).finally(() => {
      task = undefined;
      if (!closed && !pending && !stopped) publish('idle');
    });
    task = running;
    return running;
  }

  const controller = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    send(text: string): Promise<void> {
      if (closed || task || pending || snapshot.phase !== 'idle') return Promise.reject(new Error('Finish the current turn first.'));
      if (!text.trim()) return Promise.reject(new Error('Enter a message.'));
      stopped = false;
      calls = 0;
      finalOnly = false;
      successfulWrites.clear();
      history.push([{ role: 'user', content: text.trim() }]);
      entry('user', text.trim());
      publish('generating');
      return launch(loop);
    },
    confirm(id: number): Promise<void> {
      if (closed || task || !pending || pending.review.id !== id) return Promise.reject(new Error('This confirmation is no longer valid.'));
      const action = pending;
      pending = undefined;
      publish('executing');
      return launch(async () => {
        if (stopped || closed) {
          appendResult(action.call, dispatcher.cancel(id));
          return;
        }
        const result = await dispatcher.confirm(id);
        appendResult(action.call, result);
        if (result.status === 'success' && action.writeKey) successfulWrites.add(action.writeKey);
        if (!stopped && !closed) await loop();
      });
    },
    cancel(id: number): Promise<void> {
      if (closed || task || !pending || pending.review.id !== id) return Promise.reject(new Error('This confirmation is no longer valid.'));
      const action = pending;
      pending = undefined;
      appendResult(action.call, dispatcher.cancel(id));
      publish('generating');
      return launch(loop);
    },
    async stop() {
      if (snapshot.phase === 'idle') return;
      stopped = true;
      if (pending) {
        appendResult(pending.call, dispatcher.cancel(pending.review.id));
        pending = undefined;
      }
      publish('stopping');
      try { await model.stop(); } catch { /* Retain the lock until the active operation settles. */ }
      await task;
      if (!closed) {
        notice('Turn stopped. Any tool already executing could not be undone; its result is shown above.');
        publish('idle');
      }
    },
    async reset() {
      await controller.stop();
      if (closed) return;
      history.length = 0;
      entries.length = 0;
      calls = 0;
      usedCallIds.clear();
      successfulWrites.clear();
      publish('idle');
    },
    async dispose() {
      closed = true;
      listeners.clear();
      await controller.stop();
    },
  };
  return controller;
}

export type AgentController = ReturnType<typeof createAgentController>;
