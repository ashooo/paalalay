import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { createMemoryRepository, MEMORY_SCHEMA } from './repository';

let pending: Promise<ReturnType<typeof createMemoryRepository>> | undefined;
export function getMemoryStore() {
  if (!pending) pending = (async () => {
    const name = 'assistant-memory.db';
    const fresh = !new File(SQLite.defaultDatabaseDirectory, name).exists;
    const db = await SQLite.openDatabaseAsync(name);
    try {
      // Approved independent memory storage. Existing files are checked, never repaired.
      if (fresh) await db.withTransactionAsync(async () => { await db.execAsync(MEMORY_SCHEMA); });
      await db.getAllAsync('SELECT id, text, created_at, updated_at FROM memories LIMIT 0');
      return createMemoryRepository({ getAllAsync: <T>(sql: string, params: string[] = []) => db.getAllAsync<T>(sql, params), runAsync: (sql, params) => db.runAsync(sql, params) }, randomUUID);
    } catch (error) { await db.closeAsync(); throw error; }
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
