import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

export const DATABASE_NAME = 'paalalay.db';

let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Runs all pending migrations sequentially.
 * Verifies table existence in sqlite_master to guarantee baseline tables exist,
 * even if schema_migrations was partially populated in a previous run.
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Ensure migrations tracking table exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Get all applied migration versions
  const appliedRows = await database.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Sanity check: verify if baseline tables actually exist in sqlite_master
  // If baseline tables were not created (e.g. from a dirty state or interrupted run),
  // force migration 1 to re-run and execute CREATE TABLE IF NOT EXISTS.
  const baselineTable = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='doctors';"
  );
  if (!baselineTable) {
    appliedVersions.delete(1);
  }

  // Sort and apply pending migrations
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sortedMigrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up(database);
      const appliedAt = new Date().toISOString();
      await database.runAsync(
        'INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        [migration.version, migration.name, appliedAt]
      );
    }
  }
}

/**
 * Initializes the SQLite database and runs all pending migrations in order.
 * Memoizes the initialization promise to guarantee concurrent callers share a
 * single migration run, preventing "cannot start a transaction within a transaction" errors.
 */
export async function initializeDatabase(customDb?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  if (customDb) {
    await runMigrations(customDb);
    return customDb;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await runMigrations(database);
      return database;
    } catch (err) {
      dbInitPromise = null; // Allow retry on failure
      throw err;
    }
  })();

  return dbInitPromise;
}

export * from './types';
export * from './migrations';
