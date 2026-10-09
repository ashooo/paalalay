import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Interface that every database migration file must implement.
 */
export interface Migration {
  /**
   * Monotonically increasing version number (1, 2, 3, ...).
   */
  version: number;

  /**
   * Descriptive, human-readable migration name (e.g. '001_initial_baseline_schema').
   */
  name: string;

  /**
   * Execution logic to apply schema updates.
   */
  up: (db: SQLiteDatabase) => Promise<void>;

  /**
   * Optional rollback logic.
   */
  down?: (db: SQLiteDatabase) => Promise<void>;
}
