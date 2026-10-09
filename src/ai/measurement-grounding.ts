/** Additional production guard: measurements must come from the active request, never older chat. */
export function measurementGrounding(name: string, args: unknown, request: string): string | undefined {
  const fields: Record<string, string[]> = { log_blood_pressure: ['systolic', 'diastolic', 'pulse_bpm'], log_blood_sugar: ['value'], log_temperature: ['value_c'], log_weight: ['value_kg'], log_symptom: ['severity'] };
  if (!fields[name] || !args || typeof args !== 'object') return undefined;
  const values = args as Record<string, unknown>;
  const numbers = [...request.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  for (const field of fields[name]) {
    if (typeof values[field] === 'number' && !numbers.includes(values[field])) return 'Please provide the measurement values in digits in this message. I will not reuse or invent readings.';
  }
  if (name === 'log_blood_sugar' && values.unit === 'mg_dL' && !/mg\s*[\/_]?\s*dl|milligrams? per decilit(?:er|re)/i.test(request)) return 'Please confirm the glucose unit: mg/dL or mmol/L.';
  if (name === 'log_blood_sugar' && values.unit === 'mmol_L' && !/mmol\s*[\/_]?\s*l|millimoles? per lit(?:er|re)/i.test(request)) return 'Please confirm the glucose unit: mg/dL or mmol/L.';
  if (name === 'log_temperature' && !/celsius|°\s*c|\bdegrees? c\b/i.test(request)) return 'Please confirm that your temperature is in Celsius.';
  if (name === 'log_weight' && !/\bkg\b|kilograms?/i.test(request)) return 'Please confirm that your weight is in kilograms.';
  return undefined;
}
