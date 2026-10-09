import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR', 'NOT_FOUND', 'PERMISSION_DENIED', 'CANCELLED', 'INTERNAL_ERROR',
]);
export type ToolErrorCode = z.infer<typeof errorCodeSchema>;
export type ToolResult<T = Record<string, unknown>> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: { code: ToolErrorCode; message: string } };

const text = z.string().trim().min(1);
const uuid = z.uuid();
const date = z.iso.date();
const utc = z.iso.datetime();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm local time.');
export const healthLogTypeSchema = z.enum([
  'blood_pressure', 'blood_sugar', 'temperature', 'weight', 'symptom',
]);
const eventFields = { recorded_at: utc.optional(), notes: text.optional() };
const historyFields = {
  from: date.optional(), to: date.optional(), limit: z.number().int().min(1).max(100).optional(),
};
const orderedDates = (from?: string, to?: string) => !from || !to || from <= to;
const rangeError = { message: 'End date must be on or after start date.' };

export const toolInputSchemas = {
  create_medication: z.strictObject({
    name: text, strength_text: text, dosage_form: text.optional(), instructions: text.optional(),
    start_date: date.optional(), end_date: date.optional(),
    source: z.enum(['manual', 'ocr_verified']).optional(),
  }).refine((a) => orderedDates(a.start_date, a.end_date), rangeError),
  list_medications: z.strictObject({ active_only: z.boolean().default(true) }),
  get_today_medications: z.strictObject({ date: date.optional() }),
  set_medication_schedule: z.strictObject({
    medication_id: uuid,
    times_local: z.array(time).min(1).refine((a) => new Set(a).size === a.length, 'Remove duplicate times.'),
    days_of_week: z.array(z.number().int().min(0).max(6)).min(1)
      .refine((a) => new Set(a).size === a.length, 'Remove duplicate days.').optional(),
    starts_on: date.optional(), ends_on: date.optional(),
    timezone: text.refine((value) => {
      try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
      catch { return false; }
    }, 'Use a valid IANA timezone.').optional(),
  }).refine((a) => orderedDates(a.starts_on, a.ends_on), rangeError),
  record_medication_intake: z.strictObject({
    medication_id: uuid, schedule_id: uuid, scheduled_for: utc,
    status: z.enum(['taken', 'skipped']), ...eventFields,
  }),
  get_medication_history: z.strictObject({ medication_id: uuid.optional(), ...historyFields })
    .refine((a) => orderedDates(a.from, a.to), rangeError),
  log_blood_pressure: z.strictObject({
    systolic: z.number().int().positive(), diastolic: z.number().int().positive(),
    pulse_bpm: z.number().int().positive().optional(), ...eventFields,
  }),
  log_blood_sugar: z.strictObject({
    value: z.number().positive(), unit: z.enum(['mg_dL', 'mmol_L']),
    context: z.enum(['fasting', 'before_meal', 'after_meal', 'random', 'unknown']).optional(),
    ...eventFields,
  }),
  log_temperature: z.strictObject({ value_c: z.number(), ...eventFields }),
  log_weight: z.strictObject({ value_kg: z.number().positive(), ...eventFields }),
  log_symptom: z.strictObject({ symptom: text, severity: z.number().int().min(1).max(10).optional(), ...eventFields }),
  get_health_history: z.strictObject({ log_type: healthLogTypeSchema.optional(), ...historyFields })
    .refine((a) => orderedDates(a.from, a.to), rangeError),
  get_health_summary: z.strictObject({ from: date, to: date, log_type: healthLogTypeSchema.optional() })
    .refine((a) => orderedDates(a.from, a.to), rangeError),
  search_specialists: z.strictObject({ specialty: text, city: text.optional(), limit: z.number().int().min(1).max(30).optional() }),
};

const object = z.record(z.string(), z.unknown());
const logOutput = <T extends string>(type: T) => z.object({ log_id: uuid, log_type: z.literal(type), recorded_at: utc });
export const toolOutputSchemas = {
  create_medication: z.object({ medication_id: uuid, name: text, is_active: z.boolean() }),
  list_medications: z.object({ medications: z.array(z.object({ id: uuid, name: text, strength_text: text, is_active: z.boolean() })) }),
  get_today_medications: z.object({ items: z.array(z.object({ medication_id: uuid, schedule_id: uuid, time_local: time, status: text })) }),
  set_medication_schedule: z.object({ schedule_ids: z.array(uuid), notifications_scheduled: z.number().int().nonnegative() }),
  record_medication_intake: z.object({ intake_id: uuid, status: z.enum(['taken', 'skipped']), recorded_at: utc }),
  get_medication_history: z.object({ events: z.array(z.object({ intake_id: uuid, medication_id: uuid, scheduled_for: utc, status: text })) }),
  log_blood_pressure: logOutput('blood_pressure'),
  log_blood_sugar: logOutput('blood_sugar'),
  log_temperature: logOutput('temperature'),
  log_weight: logOutput('weight'),
  log_symptom: logOutput('symptom'),
  get_health_history: z.object({ logs: z.array(z.object({ id: uuid, log_type: healthLogTypeSchema, recorded_at: utc, values: object })) }),
  get_health_summary: z.object({ counts: object, latest_readings: object, medication_adherence: object.optional() }),
  search_specialists: z.object({ results: z.array(z.object({ id: text, specialty: text, doctor_name: text.optional(), facility_name: text, address: text, city: text })) }),
};

export type ToolName = keyof typeof toolInputSchemas;
export type ToolInput<N extends ToolName> = z.output<(typeof toolInputSchemas)[N]>;
export type ToolData<N extends ToolName> = z.output<(typeof toolOutputSchemas)[N]>;
export type ToolHandlers = { [N in ToolName]?: (args: ToolInput<N>) => Promise<ToolResult<ToolData<N>>> };

export const toolMetadata = {
  create_medication: { owner: 'Dev 2', mode: 'write', title: 'Add medication', description: 'Save a medication with a user-verified name and strength. Never infer dosing.' },
  list_medications: { owner: 'Dev 2', mode: 'read', title: 'List medications', description: 'List existing medications; active only by default.' },
  get_today_medications: { owner: 'Dev 2', mode: 'read', title: 'View medication reminders', description: 'Get reminders for a device-local date.' },
  set_medication_schedule: { owner: 'Dev 2', mode: 'write', title: 'Set medication reminders', description: 'Create or replace a medication reminder schedule using user-confirmed local times.' },
  record_medication_intake: { owner: 'Dev 2', mode: 'write', title: 'Record medication intake', description: 'Mark one scheduled occurrence as taken or skipped.' },
  get_medication_history: { owner: 'Dev 2', mode: 'read', title: 'View medication history', description: 'Get medication intake history for a date range.' },
  log_blood_pressure: { owner: 'Dev 2', mode: 'write', title: 'Record blood pressure', description: 'Record user-measured systolic and diastolic values in mmHg; no diagnosis.' },
  log_blood_sugar: { owner: 'Dev 2', mode: 'write', title: 'Record blood sugar', description: 'Record a user-measured glucose value with an explicit unit.' },
  log_temperature: { owner: 'Dev 2', mode: 'write', title: 'Record temperature', description: 'Record a user-measured temperature in Celsius.' },
  log_weight: { owner: 'Dev 2', mode: 'write', title: 'Record weight', description: 'Record user-measured body weight in kilograms.' },
  log_symptom: { owner: 'Dev 2', mode: 'write', title: 'Record symptom', description: 'Record a symptom in the user’s words; no diagnosis.' },
  get_health_history: { owner: 'Dev 2', mode: 'read', title: 'View health history', description: 'Get typed health events for a date range.' },
  get_health_summary: { owner: 'Dev 3', mode: 'read', title: 'View health summary', description: 'Aggregate existing health records for an explicit date range.' },
  search_specialists: { owner: 'Dev 3', mode: 'read', title: 'Find specialists', description: 'Search the curated offline directory. Never invent directory entries.' },
} as const satisfies Record<ToolName, { owner: string; mode: 'read' | 'write'; title: string; description: string }>;

export function isToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(toolInputSchemas, name);
}

// JSON Schema is generated from the same validators used by the dispatcher.
export function getModelTools(names: readonly ToolName[] = Object.keys(toolInputSchemas) as ToolName[]) {
  return names.map((name) => ({
    type: 'function' as const,
    function: {
      name,
      description: toolMetadata[name].description,
      parameters: z.toJSONSchema(toolInputSchemas[name], { io: 'input' }),
    },
  }));
}

export function toolError(code: ToolErrorCode, message: string): ToolResult<never> {
  return { status: 'error', error: { code, message } };
}

export function parseToolResult(name: ToolName, result: unknown): ToolResult {
  const schema = z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('success'), data: toolOutputSchemas[name] }),
    z.strictObject({ status: z.literal('error'), error: z.strictObject({ code: errorCodeSchema, message: text }) }),
  ]);
  const parsed = schema.safeParse(result);
  return parsed.success ? parsed.data : toolError('INTERNAL_ERROR', 'The service returned an invalid response. Verify the action before retrying.');
}
