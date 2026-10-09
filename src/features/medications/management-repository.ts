import { z } from 'zod';
import type { MedicineRow, ScheduleRow, IntakeRow } from './occurrences';

export const editMedicineSchema = z.strictObject({ id: z.uuid(), name: z.string().trim().min(1), strength_text: z.string().trim().min(1), instructions: z.string().trim().nullable(), is_active: z.boolean() });
export interface ManagementDatabase {
  getAllAsync<T>(sql: string, params: (string | number | null)[]): Promise<T[]>;
  runAsync(sql: string, params: (string | number | null)[]): Promise<{ changes: number }>;
}
export async function readManagement(db: ManagementDatabase) {
  const medicines = await db.getAllAsync<MedicineRow>('SELECT * FROM medications ORDER BY is_active DESC, name, id', []);
  const schedules = await db.getAllAsync<ScheduleRow>('SELECT * FROM medication_schedules WHERE enabled = 1 ORDER BY time_local, id', []);
  const intakes = await db.getAllAsync<IntakeRow>('SELECT * FROM medication_intakes ORDER BY scheduled_for DESC LIMIT 100', []);
  return { medicines, schedules, intakes };
}
export async function editMedicine(db: ManagementDatabase, input: unknown) {
  const parsed = editMedicineSchema.parse(input);
  const result = await db.runAsync('UPDATE medications SET name = ?, strength_text = ?, instructions = ?, is_active = ?, updated_at = ? WHERE id = ?',
    [parsed.name, parsed.strength_text, parsed.instructions || null, parsed.is_active ? 1 : 0, new Date().toISOString(), parsed.id]);
  if (result.changes !== 1) throw new Error('Medicine not found.');
}
