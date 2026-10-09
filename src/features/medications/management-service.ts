import { Platform } from 'react-native';
import { editMedicine, editMedicineSchema, readManagement } from './management-repository';
import type { z } from 'zod';

async function responseData(response: Response) {
  const result = await response.json();
  if (result.status !== 'success') throw new Error(result.error?.message || 'Could not load medicines.');
  return result.data;
}
export async function getMedicineManagement(): Promise<Awaited<ReturnType<typeof readManagement>>> {
  if (Platform.OS === 'web') return responseData(await fetch('/api/medications/manage'));
  const { getDatabase } = await import('@/db');
  return readManagement(await getDatabase());
}
export async function updateMedicine(input: z.infer<typeof editMedicineSchema>) {
  const parsed = editMedicineSchema.parse(input);
  if (Platform.OS === 'web') { await responseData(await fetch('/api/medications/manage', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed) })); return; }
  const { getDatabase } = await import('@/db');
  await editMedicine(await getDatabase(), parsed);
}
