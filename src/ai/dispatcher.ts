import {
  isToolName, parseToolResult, toolError, toolInputSchemas, toolMetadata,
  type ToolHandlers, type ToolName, type ToolResult,
} from '../contracts/tools';

export type ConfirmationReview = {
  id: number;
  toolName: ToolName;
  title: string;
  fields: readonly { label: string; value: string }[];
};
export type DispatchOutcome =
  | { kind: 'result'; toolName?: ToolName; result: ToolResult }
  | { kind: 'confirmation'; review: ConfirmationReview };

const labels: Record<string, string> = {
  text: 'Memory to keep on this device', memory_id: 'Memory ID to forget',
  medicine: 'Medicine name sent to NHS lookup', topic: 'Guidance topic',
  name: 'Medication name', strength_text: 'Strength', dosage_form: 'Form', instructions: 'Instructions',
  start_date: 'Start date', end_date: 'End date', source: 'Source', medication_id: 'Medication ID',
  times_local: 'Reminder times (local)', days_of_week: 'Days', starts_on: 'Starts on', ends_on: 'Ends on',
  timezone: 'Timezone', schedule_id: 'Schedule ID', scheduled_for: 'Scheduled occurrence (UTC)',
  status: 'Intake status', recorded_at: 'Recorded at (UTC)', notes: 'Notes',
  systolic: 'Systolic (mmHg)', diastolic: 'Diastolic (mmHg)', pulse_bpm: 'Pulse (bpm)',
  value: 'Blood sugar', unit: 'Unit', context: 'Measurement context', value_c: 'Temperature (°C)',
  value_kg: 'Weight (kg)', symptom: 'Symptom', severity: 'Severity (1–10)',
};
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function displayValue(key: string, value: unknown): string {
  if (key === 'days_of_week' && Array.isArray(value)) return value.map((day) => days[day]).join(', ');
  if (key === 'unit') return value === 'mg_dL' ? 'mg/dL' : 'mmol/L';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** One instance per chat. Only trusted UI code calls confirm/cancel; never expose them as model tools. */
export function createToolDispatcher(handlers: ToolHandlers) {
  // Snapshot registrations so callers cannot replace a handler after review.
  const registered = { ...handlers };
  let nextId = 0;
  let pending: { id: number; name: ToolName; args: Record<string, unknown> } | undefined;
  let busy = false;

  async function execute(name: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
    const handler = registered[name];
    if (!handler) return toolError('NOT_FOUND', 'This feature is not connected yet.');
    try {
      // Runtime validation above resolves the mapped-union call boundary.
      return parseToolResult(name, await handler(args as never));
    } catch {
      // Do not leak patient details or service exception text to logs/model context.
      return toolError('INTERNAL_ERROR', 'The service could not complete the action. Verify it before retrying.');
    }
  }

  return {
    async propose(name: string, input: unknown): Promise<DispatchOutcome> {
      if (busy || pending) return { kind: 'result', result: toolError('PERMISSION_DENIED', 'Finish or cancel the current action first.') };
      if (!isToolName(name)) return { kind: 'result', result: toolError('PERMISSION_DENIED', 'This tool is not available to the assistant.') };
      const parsed = toolInputSchemas[name].safeParse(input);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`).join('; ');
        return { kind: 'result', toolName: name, result: toolError('VALIDATION_ERROR', `Ask the user to clarify: ${issues}`) };
      }
      if (!registered[name]) return { kind: 'result', toolName: name, result: toolError('NOT_FOUND', 'This feature is not connected yet.') };
      const args = parsed.data;
      if (toolMetadata[name].mode !== 'read') {
        const id = ++nextId;
        pending = { id, name, args };
        const fields = Object.entries(args).map(([key, value]) => Object.freeze({ label: labels[key] ?? key, value: displayValue(key, value) }));
        return {
          kind: 'confirmation',
          review: Object.freeze({ id, toolName: name, title: toolMetadata[name].title, fields: Object.freeze(fields) }),
        };
      }
      busy = true;
      try { return { kind: 'result', toolName: name, result: await execute(name, args) }; }
      finally { busy = false; }
    },

    async confirm(id: number): Promise<ToolResult> {
      if (!pending || pending.id !== id || busy) return toolError('PERMISSION_DENIED', 'This confirmation is no longer valid.');
      const action = pending;
      pending = undefined; // Consume before awaiting: double taps cannot execute twice.
      busy = true;
      try { return await execute(action.name, action.args); }
      finally { busy = false; }
    },

    cancel(id: number): ToolResult {
      if (!pending || pending.id !== id) return toolError('PERMISSION_DENIED', 'This confirmation is no longer valid.');
      pending = undefined;
      return toolError('CANCELLED', 'The action was cancelled.');
    },
  };
}
