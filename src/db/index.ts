import type * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { migrations } from './migrations';

export const DATABASE_NAME = 'paalalay.db';

const isNodeServer = typeof process !== 'undefined' && process.release?.name === 'node' && Platform.OS !== 'ios' && Platform.OS !== 'android';

/**
 * Initializes the SQLite database and runs all pending migrations in order.
 */
export async function initializeDatabase(db?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  let database: SQLite.SQLiteDatabase;

  if (db) {
    database = db;
  } else if (isNodeServer) {
    const { createNodeSQLiteAdapter } = await import('./node-adapter');
    database = await createNodeSQLiteAdapter(DATABASE_NAME);
  } else {
    const SQLiteModule = await import('expo-sqlite');
    database = await SQLiteModule.openDatabaseAsync(DATABASE_NAME);
  }

  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Ensure migrations table exists
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

  // Sort and apply pending migrations
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sortedMigrations) {
    if (!appliedVersions.has(migration.version)) {
      await database.withTransactionAsync(async () => {
        await migration.up(database);
        const appliedAt = new Date().toISOString();
        await database.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, appliedAt]
        );
      });
    }
  }

  return database;
}

export * from './types';
export * from './migrations';
