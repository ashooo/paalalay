import type { LocalModelRuntime } from './local-model.types';

export function createLocalModelRuntime(): LocalModelRuntime {
  const unavailable = async () => { throw new Error('Local llama.rn inference requires an Android or iOS development build.'); };
  return { load: unavailable, complete: unavailable, generate: unavailable, countTokens: unavailable, stop: async () => {}, dispose: async () => {} };
}
