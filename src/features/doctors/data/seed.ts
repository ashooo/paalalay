import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, initializeDatabase } from '@/db';
import { PLACEHOLDER_DOCTORS } from './placeholder-doctors';

/**
 * Idempotent seeder for placeholder doctors.
 *
 * DESIGN RATIONALE:
 * We chose a dedicated idempotent seed function over a database migration file because:
 * 1. It prevents contaminating the permanent schema migration history (schema_migrations)
 *    with throwaway synthetic records.
 * 2. When real, verified records with authentic source URLs and DOH/hospital timestamps
 *    are supplied before the demo, they can seamlessly replace or update this table
 *    without requiring migration rollbacks or extra cleanup migrations.
 * 3. It is fully idempotent via `INSERT OR IGNORE` on the primary key `id`.
 * 4. It can be triggered cleanly at app bootstrap, in dev/demo screens, or within unit/integration tests.
 */
let seedPromise: Promise<{ insertedCount: number; totalPlaceholders: number }> | null = null;

export async function seedPlaceholderDoctors(
  db?: SQLiteDatabase
): Promise<{ insertedCount: number; totalPlaceholders: number }> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    let database: SQLiteDatabase;
    if (db) {
      database = db;
    } else {
      try {
        database = await getDatabase();
      } catch {
        database = await initializeDatabase();
      }
    }

    // Check if doctors are already seeded to skip unnecessary transactions
    try {
      const existing = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM doctors;'
      );
      if (existing && existing.count > 0) {
        return { insertedCount: 0, totalPlaceholders: PLACEHOLDER_DOCTORS.length };
      }
    } catch {
      // If table doesn't exist yet, proceed with insert attempt
    }

    let insertedCount = 0;

    await database.withTransactionAsync(async () => {
      for (const doc of PLACEHOLDER_DOCTORS) {
        const result = await database.runAsync(
          `INSERT OR IGNORE INTO doctors (
            id,
            doctor_name,
            specialty,
            facility_name,
            address,
            city,
            latitude,
            longitude,
            phone,
            source_url,
            verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            doc.id,
            doc.doctor_name,
            doc.specialty,
            doc.facility_name,
            doc.address,
            doc.city,
            doc.latitude,
            doc.longitude,
            doc.phone,
            doc.source_url,
            doc.verified_at,
          ]
        );

        if (result.changes > 0) {
          insertedCount += result.changes;
        }
      }
    });

    return {
      insertedCount,
      totalPlaceholders: PLACEHOLDER_DOCTORS.length,
    };
  })();

  return seedPromise;
}
