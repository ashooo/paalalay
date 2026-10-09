import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import { migrations } from './migrations';
import type { SchemaMigration } from './types';

export const DATABASE_NAME = 'paalalay.db';

let cachedDbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Runs all pending migrations sequentially.
 * Verifies table existence in sqlite_master to guarantee baseline tables exist,
 * even if schema_migrations was partially populated in a previous run.
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Ensure migrations tracking table exists (Table 8 - Dev 4)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Retrieve applied migration versions
  const appliedRows = await database.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r: { version: number }) => r.version));

  // Sanity check: verify if baseline tables actually exist in sqlite_master
  // If baseline tables were not created (e.g. from a dirty state or interrupted run),
  // force migration 1 to re-run and execute CREATE TABLE IF NOT EXISTS.
  const baselineTable = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='doctors';"
  );
  if (!baselineTable) {
    appliedVersions.delete(1);
  }

  // Sort migrations strictly in ascending version order
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  // Apply pending migrations inside isolated transactions
  for (const migration of sortedMigrations) {
    if (!appliedVersions.has(migration.version)) {
      await database.withTransactionAsync(async () => {
        await migration.up(database);
        const appliedAt = new Date().toISOString();
        await database.runAsync(
          'INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, appliedAt]
        );
      });
      console.log(`[SQLite Migration] Applied version ${migration.version}: ${migration.name}`);
    }
  }
}

/**
 * Primary SQLite connection accessor for all feature repositories (Dev 1, Dev 2, Dev 3, Dev 4).
 * Opens the existing database. Schema setup is an explicit operation only.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (cachedDbInstance) {
    return cachedDbInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!new File(SQLite.defaultDatabaseDirectory, DATABASE_NAME).exists) {
        throw new Error('Database missing. Use the explicit setup control in Assistant.');
      }
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      try {
        await database.execAsync('PRAGMA foreign_keys = ON;');
        const versions = await database.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations;');
        if (!migrations.every((migration) => versions.some((row) => row.version === migration.version))) {
          throw new Error('Database setup is required. Use the explicit setup control in Assistant.');
        }
        cachedDbInstance = database;
        return database;
      } catch (error) {
        await database.closeAsync();
        throw error;
      }
    })();
  }

  try {
    const db = await initializationPromise;
    cachedDbInstance = db;
    return db;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Initializes the SQLite database, verifies foreign key support,
 * and runs all pending migrations in ascending version order.
 * Memoizes execution to guarantee concurrent callers share a single migration run.
 */
export async function initializeDatabase(
  db?: SQLite.SQLiteDatabase
): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    await runMigrations(db);
    cachedDbInstance = db;
    return db;
  }

  if (cachedDbInstance) {
    return cachedDbInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await runMigrations(database);
      cachedDbInstance = database;
      return database;
    } catch (error) {
      cachedDbInstance = null;
      throw error;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Retrieves the history of all migrations currently recorded in the database.
 */
export async function getMigrationHistory(
  db?: SQLite.SQLiteDatabase
): Promise<SchemaMigration[]> {
  const database = db ?? (await getDatabase());
  return await database.getAllAsync<SchemaMigration>(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;'
  );
}

/**
 * Closes and resets the cached database instance (useful for testing or profile switches).
 */
export async function closeDatabase(): Promise<void> {
  if (cachedDbInstance) {
    await cachedDbInstance.closeAsync();
    cachedDbInstance = null;
  }
}

export * from './types';
export * from './migrations';
