import type { LlamaContext } from 'llama.rn';

import { getModelTools, type ToolName } from '../contracts/tools';
import type { ConversationMessage, LocalModelRuntime } from './local-model.types';
import { MODEL_CONTEXT_TOKENS, MODEL_OUTPUT_TOKENS } from './model-config';
import { createSystemMessage } from './system-prompt';

/** Lazy native import keeps tool-only testing available when the native module is absent. */
export function createLocalModelRuntime(toolNames?: readonly ToolName[]): LocalModelRuntime {
  const tools = getModelTools(toolNames);
  const chatOptions = (withTools: boolean) => ({
    jinja: true,
    enable_thinking: false,
    chat_template_kwargs: { enable_thinking: false },
    tools: withTools ? tools : undefined,
    tool_choice: withTools ? 'auto' : 'none',
    parallel_tool_calls: false,
  });
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
        context = await initLlama({ model: path, n_ctx: MODEL_CONTEXT_TOKENS, n_gpu_layers: 0, use_mlock: false });
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
            n_predict: MODEL_OUTPUT_TOKENS,
            temperature: 0,
            ...chatOptions(withTools),
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
        const formatted = await context.getFormattedChat(messages, null, chatOptions(withTools));
        return (await context.tokenize(formatted.prompt)).tokens.length;
      });
    },
    async complete(prompt, withTools) {
      if (!prompt.trim()) throw new Error('Enter a test prompt.');
      const messages: ConversationMessage[] = [
        createSystemMessage('test'),
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
