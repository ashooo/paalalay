export type ModelProbeResult = {
  text: string;
  toolCalls: { name: string; arguments: string }[];
};
export type LocalModelRuntime = {
  load: (uri: string) => Promise<void>;
  complete: (prompt: string, withTools: boolean) => Promise<ModelProbeResult>;
  dispose: () => Promise<void>;
};
