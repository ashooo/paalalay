import type { LocalModelRuntime } from '../../ai/local-model.types';

/** Explicit, development-only UI fixture. Never a fallback for native inference. */
export function createScriptedPreview(): LocalModelRuntime {
  return {
    load: async () => {}, dispose: async () => {}, stop: async () => {}, countTokens: async () => 100,
    complete: async () => ({ text: 'Use the Chat sample buttons for the scripted preview.', toolCalls: [] }),
    generate: async (messages) => {
      const last = messages[messages.length - 1];
      if (last.role === 'tool') {
        const response = JSON.parse(last.content);
        return { text: response.status === 'success'
          ? 'The synthetic mock handler completed. No record was saved.'
          : response.error.code === 'CANCELLED' ? 'Cancelled. No mock action ran.'
            : 'Please provide both systolic and diastolic readings before recording blood pressure.', toolCalls: [] };
      }
      if (last.content === 'List my medications.') {
        return { text: '', toolCalls: [{ name: 'list_medications', arguments: '{}' }] };
      }
      if (last.content === 'Record my blood pressure as 120/80.') {
        return { text: '', toolCalls: [{ name: 'log_blood_pressure', arguments: '{"systolic":120,"diastolic":80}' }] };
      }
      if (last.content === 'Record my blood pressure.') {
        return { text: '', toolCalls: [{ name: 'log_blood_pressure', arguments: '{}' }] };
      }
      return { text: 'This is a scripted UI preview, not model inference. Choose a sample below to test a read, confirmation, or clarification.', toolCalls: [] };
    },
  };
}
