import type { LlamaContext } from 'llama.rn';

import { getModelTools } from '../contracts/tools';
import type { ConversationMessage, LocalModelRuntime } from './local-model.types';

/** Lazy native import keeps tool-only testing available when the native module is absent. */
export function createLocalModelRuntime(): LocalModelRuntime {
  let context: LlamaContext | undefined;
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  let generationActive = false;
  let stopVersion = 0;

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }

  const runtime: LocalModelRuntime = {
    load(uri) {
      return enqueue(async () => {
        if (disposed) throw new Error('This model session has closed.');
        const path = uri.trim();
        if (!path.startsWith('file:///') || !path.toLowerCase().endsWith('.gguf')) {
          throw new Error('Enter an app-accessible file:/// URI ending in .gguf on this device.');
        }
        if (context) {
          const previous = context;
          context = undefined;
          await previous.release();
        }
        const { initLlama } = await import('llama.rn');
        context = await initLlama({ model: path, n_ctx: 4096, n_gpu_layers: 0, use_mlock: false });
      });
    },
    generate(messages, withTools) {
      const version = stopVersion;
      return enqueue(async () => {
        if (disposed || !context) throw new Error('Load a model first.');
        if (version !== stopVersion) throw new Error('Generation stopped.');
        generationActive = true;
        try {
          const result = await context.completion({
            messages,
            n_predict: 256,
            temperature: 0,
            jinja: true,
            chat_template_kwargs: { enable_thinking: false },
            tools: getModelTools(),
            tool_choice: withTools ? 'auto' : 'none',
            parallel_tool_calls: false,
          });
          return {
            text: result.content || result.text,
            toolCalls: (result.tool_calls ?? []).map((call) => ({
              id: call.id, name: call.function.name, arguments: call.function.arguments,
            })),
          };
        } finally { generationActive = false; }
      });
    },
    countTokens(messages, withTools) {
      return enqueue(async () => {
        if (disposed || !context) throw new Error('Load a model first.');
        const formatted = await context.getFormattedChat(messages, null, {
          jinja: true, tools: getModelTools(), tool_choice: withTools ? 'auto' : 'none',
          parallel_tool_calls: false, chat_template_kwargs: { enable_thinking: false },
        });
        return (await context.tokenize(formatted.prompt)).tokens.length;
      });
    },
    async complete(prompt, withTools) {
      if (!prompt.trim()) throw new Error('Enter a test prompt.');
      const messages: ConversationMessage[] = [
        { role: 'system', content: 'You are Paalalay, an offline health-record assistant. Use only explicitly supplied values. Ask for missing medicine names, strengths, units, dates, or times. Never diagnose or recommend doses. Propose at most one tool call. A proposal is not a saved action; user confirmation is required for every write.' },
        { role: 'user', content: prompt.trim() },
      ];
      return runtime.generate(messages, withTools);
    },
    async stop() {
      stopVersion++;
      if (generationActive) await context?.stopCompletion();
    },
    dispose() {
      disposed = true;
      return enqueue(async () => {
        const previous = context;
        context = undefined;
        await previous?.release();
      });
    },
  };
  return runtime;
}
