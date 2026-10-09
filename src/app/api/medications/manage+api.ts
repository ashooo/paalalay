import { getDb } from '@/db/server-db';
import { editMedicine, readManagement, type ManagementDatabase } from '@/features/medications/management-repository';

async function adapter(): Promise<ManagementDatabase> {
  const db = await getDb();
  return { getAllAsync: async (sql, args = []) => db.prepare(sql).all(...args), runAsync: async (sql, args) => ({ changes: Number(db.prepare(sql).run(...args).changes) }) };
}
export async function GET() {
  try { return Response.json({ status: 'success', data: await readManagement(await adapter()) }); }
  catch { return Response.json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: 'Could not read medicines. Existing database setup is required.' } }, { status: 500 }); }
}
export async function PUT(request: Request) {
  let input;
  try { input = await request.json(); } catch { return Response.json({ status: 'error', error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON.' } }, { status: 400 }); }
  try {
    // Validate before opening a database connection.
    const { editMedicineSchema } = await import('@/features/medications/management-repository');
    const parsed = editMedicineSchema.safeParse(input);
    if (!parsed.success) return Response.json({ status: 'error', error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } }, { status: 400 });
    await editMedicine(await adapter(), parsed.data);
    return Response.json({ status: 'success', data: {} });
  } catch { return Response.json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: 'Could not update this medicine.' } }, { status: 500 }); }
}
