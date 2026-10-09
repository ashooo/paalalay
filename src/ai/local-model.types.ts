export type ModelToolCall = { id?: string; name: string; arguments: string };
export type ConversationMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
};
export type ModelProbeResult = {
  text: string;
  toolCalls: ModelToolCall[];
};
export type ConversationModel = {
  generate: (messages: ConversationMessage[], withTools: boolean) => Promise<ModelProbeResult>;
  countTokens: (messages: ConversationMessage[], withTools: boolean) => Promise<number>;
  stop: () => Promise<void>;
};
export type LocalModelRuntime = {
  load: (uri: string) => Promise<void>;
  complete: (prompt: string, withTools: boolean) => Promise<ModelProbeResult>;
  dispose: () => Promise<void>;
} & ConversationModel;
