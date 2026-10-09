import { toolInputSchemas, type ToolName } from '../../contracts/tools';

/** Translate manual form/storage field names into the frozen public tool arguments. */
export function measurementInput(data: Record<string, unknown>) {
  const common = { recorded_at: data.recorded_at, notes: data.notes };
  const inputs = {
    blood_pressure: { systolic: data.systolic, diastolic: data.diastolic, pulse_bpm: data.pulse_bpm, ...common },
    blood_sugar: { value: data.glucose_value, unit: data.glucose_unit, context: data.glucose_context, ...common },
    temperature: { value_c: data.temperature_c, ...common },
    weight: { value_kg: data.weight_kg, ...common },
    symptom: { symptom: data.symptom_name, severity: data.symptom_severity, ...common },
  };
  const kind = data.log_type as keyof typeof inputs;
  if (!Object.hasOwn(inputs, kind)) return { success: false as const, message: 'Choose a supported measurement type.' };
  const tool = `log_${kind}` as ToolName;
  const parsed = toolInputSchemas[tool].safeParse(inputs[kind]);
  return parsed.success ? { success: true as const, tool, args: parsed.data }
    : { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid measurement.' };
}
