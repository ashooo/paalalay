import type { LlamaContext } from 'llama.rn';

import { getModelTools } from '../contracts/tools';
import type { LocalModelRuntime } from './local-model.types';

/** Lazy native import keeps tool-only testing available when the native module is absent. */
export function createLocalModelRuntime(): LocalModelRuntime {
  let context: LlamaContext | undefined;
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }

  return {
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
    complete(prompt, withTools) {
      return enqueue(async () => {
        if (disposed || !context) throw new Error('Load a model first.');
        if (!prompt.trim()) throw new Error('Enter a test prompt.');
        const result = await context.completion({
          messages: [
            {
              role: 'system',
              content: 'You are Paalalay, an offline health-record assistant. Use only explicitly supplied values. Ask for missing medicine names, strengths, units, dates, or times. Never diagnose or recommend doses. Propose at most one tool call. A proposal is not a saved action; user confirmation is required for every write.',
            },
            { role: 'user', content: prompt.trim() },
          ],
          n_predict: 256,
          temperature: 0,
          jinja: true,
          chat_template_kwargs: { enable_thinking: false },
          ...(withTools ? { tools: getModelTools(), tool_choice: 'auto', parallel_tool_calls: false } : {}),
        });
        return {
          text: result.content || result.text,
          toolCalls: (result.tool_calls ?? []).map((call) => ({
            name: call.function.name, arguments: call.function.arguments,
          })),
        };
      });
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
}
