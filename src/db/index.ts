import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import { migrations } from './migrations';
import type { SchemaMigration } from './types';

export const DATABASE_NAME = 'paalalay.db';

let cachedDbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Primary SQLite connection accessor for all feature repositories (Dev 1, Dev 2, Dev 3, Dev 4).
 * Creates the approved baseline only on first install. Existing files are never migrated here.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (cachedDbInstance) {
    return cachedDbInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const freshInstall = !new File(SQLite.defaultDatabaseDirectory, DATABASE_NAME).exists;
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      try {
        if (freshInstall) {
          // Explicitly approved: an empty first-install database, never a reset or seed.
          await database.withTransactionAsync(async () => {
            const baseline = migrations.find(migration => migration.version === 1);
            if (!baseline) throw new Error('Baseline schema unavailable.');
            await baseline.up(database);
            await database.runAsync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [baseline.version, baseline.name, new Date().toISOString()]);
          });
        }
        await database.execAsync('PRAGMA foreign_keys = ON;');
        const versions = await database.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations;');
        if (versions.some(row => !migrations.some(migration => migration.version === row.version))) {
          throw new Error('Your saved database was created by a different app version. It has not been changed.');
        }
        if (!migrations.every((migration) => versions.some((row) => row.version === migration.version))) {
          throw new Error('Your saved database needs a reviewed upgrade. It has not been changed.');
        }
        // Detect incomplete legacy schemas without repairing them or rewriting migration history.
        await database.getAllAsync('SELECT id, strength_text, instructions FROM medications LIMIT 0');
        await database.getAllAsync('SELECT id, timezone, enabled FROM medication_schedules LIMIT 0');
        await database.getAllAsync('SELECT id, scheduled_for, status FROM medication_intakes LIMIT 0');
        await database.getAllAsync('SELECT id, log_type, recorded_at FROM health_logs LIMIT 0');
        await database.getAllAsync('SELECT id, source_url, verified_at FROM doctors LIMIT 0');
        return database;
      } catch (error) {
        await database.closeAsync();
        throw error;
      }
    })();
  }

  try {
    cachedDbInstance = await initializationPromise;
    return cachedDbInstance;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Initializes the SQLite database, verifies foreign key support,
 * and runs all pending migrations in ascending version order.
 */
export async function initializeDatabase(
  db?: SQLite.SQLiteDatabase
): Promise<SQLite.SQLiteDatabase> {
  const database = db ?? (await SQLite.openDatabaseAsync(DATABASE_NAME));

  // Enforce foreign key constraints globally
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

  // Sort migrations strictly in ascending version order
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  // Apply pending migrations inside isolated transactions
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
      console.log(`[SQLite Migration] Applied version ${migration.version}: ${migration.name}`);
    }
  }

  return database;
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
