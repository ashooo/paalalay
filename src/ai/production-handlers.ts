import * as client from '../services/api-client';
import { getMedicineManagement } from '../features/medications/management-service';
import { todayOccurrences } from '../features/medications/occurrences';
import { parseToolResult, type ToolData, type ToolHandlers, type ToolName, type ToolResult } from '../contracts/tools';
import { createMedicineReferenceHandlers } from './medicine-guidance';

const validated = <N extends ToolName>(name: N, result: unknown) => parseToolResult(name, result) as ToolResult<ToolData<N>>;
export function createProductionToolHandlers(): ToolHandlers {
  return {
    ...createMedicineReferenceHandlers(),
    list_medications: async args => validated('list_medications', await client.fetchMedications(args.active_only)),
    create_medication: async args => validated('create_medication', await client.createMedication(args)),
    set_medication_schedule: async args => validated('set_medication_schedule', await client.setMedicationSchedule(args)),
    record_medication_intake: async args => validated('record_medication_intake', await client.recordMedicationIntake(args)),
    get_today_medications: async args => {
      const data = await getMedicineManagement();
      const items = todayOccurrences(data.medicines, data.schedules, data.intakes, args.date ? new Date(`${args.date}T12:00:00`) : new Date());
      return validated('get_today_medications', { status: 'success', data: { items: items.map(item => ({ medication_id: item.medication_id, schedule_id: item.schedule_id, time_local: item.time_local, status: item.status })) } });
    },
    get_medication_history: async args => {
      // Reads the complete requested range, rather than the management screen's recent subset.
      const { getDatabase } = await import('../db');
      const db = await getDatabase();
      const conditions: string[] = []; const params: (string | number)[] = [];
      if (args.medication_id) { conditions.push('medication_id = ?'); params.push(args.medication_id); }
      if (args.from) { conditions.push('scheduled_for >= ?'); params.push(`${args.from}T00:00:00.000Z`); }
      if (args.to) { conditions.push('scheduled_for <= ?'); params.push(`${args.to}T23:59:59.999Z`); }
      params.push(args.limit ?? 50);
      const events = await db.getAllAsync(`SELECT id AS intake_id, medication_id, scheduled_for, status FROM medication_intakes ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY scheduled_for DESC LIMIT ?`, params);
      return validated('get_medication_history', { status: 'success', data: { events } });
    },
    log_blood_pressure: async args => validated('log_blood_pressure', await client.logHealthMeasurement({ log_type: 'blood_pressure', ...args })),
    log_blood_sugar: async ({ value, unit, context, ...args }) => validated('log_blood_sugar', await client.logHealthMeasurement({ log_type: 'blood_sugar', glucose_value: value, glucose_unit: unit, glucose_context: context, ...args })),
    log_temperature: async ({ value_c, ...args }) => validated('log_temperature', await client.logHealthMeasurement({ log_type: 'temperature', temperature_c: value_c, ...args })),
    log_weight: async ({ value_kg, ...args }) => validated('log_weight', await client.logHealthMeasurement({ log_type: 'weight', weight_kg: value_kg, ...args })),
    log_symptom: async ({ symptom, severity, ...args }) => validated('log_symptom', await client.logHealthMeasurement({ log_type: 'symptom', symptom_name: symptom, symptom_severity: severity, ...args })),
    get_health_history: async args => {
      const result = await client.fetchHealthHistory(args);
      if (result.status !== 'success') return validated('get_health_history', result);
      return validated('get_health_history', { status: 'success', data: { logs: result.data.logs.map((row: Record<string, unknown>) => ({ ...row, values: row.values ?? Object.fromEntries(Object.entries(row).filter(([key, value]) => !['id', 'log_type', 'created_at', 'recorded_at'].includes(key) && value !== null)) })) } });
    },
    get_health_summary: async args => validated('get_health_summary', await client.getHealthSummary(args)),
    search_specialists: async args => validated('search_specialists', await client.searchSpecialists(args)),
  };
}
