import { migration001 } from './001_initial_baseline';
import type { Migration } from './types';

export * from './types';

/**
 * Ordered list of database migrations.
 * 
 * HOW TO ADD A NEW MIGRATION:
 * 1. Create a new file in `src/db/migrations/` named `00X_<feature_name>.ts`.
 * 2. Implement the `Migration` interface (`version`, `name`, `up`).
 * 3. Import and append your migration to this `migrations` array below.
 * 
 * Rules:
 * - Version numbers must be positive integers strictly increasing (1, 2, 3...).
 * - Schema updates run sequentially inside individual transactions.
 * - Migrations are recorded in the `schema_migrations` table and never re-run.
 */
export const migrations: Migration[] = [
  migration001,
  // Feature owners register future migrations here:
  // e.g. Dev 2: migration002_medication_refinements
  // e.g. Dev 3: migration003_doctor_seed_data
  // e.g. Dev 1: migration004_chat_audit_indexes
];
