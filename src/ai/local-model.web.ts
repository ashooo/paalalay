import type { LocalModelRuntime } from './local-model.types';
import type { ToolName } from '../contracts/tools';

export function createLocalModelRuntime(_toolNames?: readonly ToolName[]): LocalModelRuntime {
  const unavailable = async () => { throw new Error('Local llama.rn inference requires an Android or iOS development build.'); };
  return { load: unavailable, complete: unavailable, generate: unavailable, countTokens: unavailable, stop: async () => {}, dispose: async () => {} };
}
