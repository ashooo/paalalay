import type { ToolInput, ToolName } from '../../src/contracts/tools';

const id = '00000000-0000-4000-8000-000000000001';
const instant = '2026-10-09T10:00:00.000Z';

/** Synthetic inputs only. These are not instructions or inferred patient values. */
export const toolExamples = {
  list_memories: {}, remember_memory: { text: 'I prefer short replies' }, forget_memory: { memory_id: id, text: 'I prefer short replies' },
  lookup_medicine_reference: { medicine: 'Amoxicillin' },
  search_medicine_guidance: { medicine: 'Amoxicillin', topic: 'missed_dose' },
  create_medication: { name: 'Example medicine', strength_text: '5 mg', source: 'manual' },
  list_medications: { active_only: true },
  get_today_medications: {},
  set_medication_schedule: { medication_id: id, times_local: ['08:00'], days_of_week: [0, 1, 2, 3, 4, 5, 6], timezone: 'Asia/Manila' },
  record_medication_intake: { medication_id: id, schedule_id: id, scheduled_for: instant, status: 'taken' },
  get_medication_history: { from: '2026-10-01', to: '2026-10-09' },
  log_blood_pressure: { systolic: 120, diastolic: 80 },
  log_blood_sugar: { value: 90, unit: 'mg_dL' },
  log_temperature: { value_c: 36.5 },
  log_weight: { value_kg: 65 },
  log_symptom: { symptom: 'Example symptom', severity: 3 },
  get_health_history: { limit: 10 },
  get_health_summary: { from: '2026-10-01', to: '2026-10-09' },
  search_specialists: { specialty: 'cardiology', city: 'Manila', limit: 5 },
} satisfies { [N in ToolName]: ToolInput<N> };
