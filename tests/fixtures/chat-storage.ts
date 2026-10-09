import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase } from '../../src/db/index';
import { toolError, type ToolHandlers, type ToolInput } from '../../src/contracts/tools';

// Call only from the explicit development setup action; never during startup.
export async function prepareChatDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await initializeDatabase(db);
    return { path: db.databasePath, migrations: await db.getAllAsync<{ version: number; name: string }>('SELECT version, name FROM schema_migrations ORDER BY version') };
  } finally { await db.closeAsync(); }
}

async function withDatabase<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    // Opening an existing session never runs migrations. Missing setup is an error.
    const baseline = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_migrations WHERE version = 1');
    if (!baseline) throw new Error('Database setup has not been completed.');
    return await operation(db);
  } finally { await db.closeAsync(); }
}

export function createDatabaseToolHandlers(): ToolHandlers {
  return {
    list_medications: async ({ active_only }) => withDatabase(async (db) => {
      const rows = await db.getAllAsync<{ id: string; name: string; strength_text: string; is_active: number }>(
        'SELECT id, name, strength_text, is_active FROM medications WHERE (? = 0 OR is_active = 1) ORDER BY name, id',
        active_only ? 1 : 0,
      );
      return { status: 'success', data: { medications: rows.map((row) => ({ ...row, is_active: row.is_active === 1 })) } };
    }),
    log_blood_pressure: async (args: ToolInput<'log_blood_pressure'>) => withDatabase(async (db) => {
      const id = await db.getFirstAsync<{ id: string }>(`SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random() % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS id`);
      if (!id) return toolError('INTERNAL_ERROR', 'Could not allocate a record ID.');
      const created = new Date().toISOString();
      const recorded = args.recorded_at ?? created;
      const result = await db.runAsync(
        'INSERT INTO health_logs (id, log_type, systolic, diastolic, pulse_bpm, notes, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id.id, 'blood_pressure', args.systolic, args.diastolic, args.pulse_bpm ?? null, args.notes ?? null, recorded, created],
      );
      if (result.changes !== 1) return toolError('INTERNAL_ERROR', 'The record was not inserted.');
      return { status: 'success', data: { log_id: id.id, log_type: 'blood_pressure', recorded_at: recorded } };
    }),
  };
}

export async function readBloodPressure(id: string) {
  return withDatabase((db) => db.getFirstAsync<{ id: string; systolic: number; diastolic: number; notes: string | null; recorded_at: string }>(
    'SELECT id, systolic, diastolic, notes, recorded_at FROM health_logs WHERE id = ? AND log_type = ?', [id, 'blood_pressure'],
  ));
}

/** Explicitly inserts one synthetic record, then verifies it through a reopened connection. */
export async function testDatabasePersistence() {
  const result = await createDatabaseToolHandlers().log_blood_pressure!({ systolic: 120, diastolic: 80, notes: 'Synthetic development persistence test' });
  if (result.status === 'error') throw new Error(result.error.message);
  const row = await readBloodPressure(result.data.log_id);
  if (!row || row.systolic !== 120 || row.diastolic !== 80) throw new Error('Saved record did not survive reopening the database.');
  return row;
}
