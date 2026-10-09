import type * as SQLite from 'expo-sqlite';

export async function createNodeSQLiteAdapter(dbName: string): Promise<SQLite.SQLiteDatabase> {
  const path = (await import('path' as string)) as any;
  const fs = (await import('fs' as string)) as any;
  const sqliteModule = (await import('node:sqlite' as string)) as any;

  const DatabaseSync = sqliteModule.DatabaseSync;
  const dbPath = path.join(process.cwd(), dbName);
  const syncDb = new DatabaseSync(dbPath);

  syncDb.exec('PRAGMA foreign_keys = ON;');

  // Run initial schema if schema.sql exists
  const schemaFile = path.join(process.cwd(), 'src/db/schema.sql');
  if (fs.existsSync(schemaFile)) {
    const sql = fs.readFileSync(schemaFile, 'utf8');
    syncDb.exec(sql);
  }

  const adapter: SQLite.SQLiteDatabase = {
    databaseName: dbName,
    databasePath: dbPath,
    execAsync: async (source: string) => {
      syncDb.exec(source);
    },
    runAsync: async (source: string, ...params: any[]) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = syncDb.prepare(source);
      const res = stmt.run(...flatParams);
      return {
        lastInsertRowId: Number(res.lastInsertRowid ?? 0),
        changes: Number(res.changes ?? 0),
      };
    },
    getAllAsync: async <T>(source: string, ...params: any[]) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = syncDb.prepare(source);
      const rows = stmt.all(...flatParams);
      return rows as T[];
    },
    getFirstAsync: async <T>(source: string, ...params: any[]) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = syncDb.prepare(source);
      const row = stmt.get(...flatParams);
      return (row ?? null) as T | null;
    },
    withTransactionAsync: async <T>(task: () => Promise<T>) => {
      syncDb.exec('BEGIN TRANSACTION;');
      try {
        const result = await task();
        syncDb.exec('COMMIT;');
        return result;
      } catch (e) {
        syncDb.exec('ROLLBACK;');
        throw e;
      }
    },
    closeAsync: async () => {
      syncDb.close();
    },
  } as unknown as SQLite.SQLiteDatabase;

  return adapter;
}
