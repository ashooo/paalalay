# Database Migrations Guide (Dev 1, 2, 3, 4)

This directory manages the sequential, ordered SQLite migrations for PAALALAY.

## Migration Conventions

1. **Naming:** Name migration files `00X_<module>_<description>.ts` (e.g. `002_medications_dosage_column.ts`, `003_doctors_indexes.ts`).
2. **Version Numbers:** Version numbers must be monotonically increasing positive integers (`1, 2, 3...`).
3. **Execution Safety:** Each migration's `up(db)` callback is executed within a dedicated transaction (`database.withTransactionAsync`).
4. **Idempotence:** Always use `IF NOT EXISTS` or check column existence to prevent migration failures on partially applied schemas.
5. **Foreign Keys:** `PRAGMA foreign_keys = ON;` is enforced globally before any migration runs.

---

## How to Add an Independent Migration

### Step 1: Create your migration file
Create `src/db/migrations/002_your_feature.ts`:

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './types';

export const migration002: Migration = {
  version: 2,
  name: '002_your_feature_name',
  up: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      -- Your SQL statements here
      ALTER TABLE medications ADD COLUMN reminder_notes TEXT;
    `);
  },
};
```

### Step 2: Register in `src/db/migrations/index.ts`
Import and add your migration to the exported `migrations` array:

```typescript
import { migration001 } from './001_initial_baseline';
import { migration002 } from './002_your_feature';

export const migrations: Migration[] = [
  migration001,
  migration002, // <-- added
];
```

---

## How to Query the Database from Your Module

In your service or repository (e.g. `src/features/medications/repositories/medicationRepo.ts`):

```typescript
import { getDatabase } from '@/db';

export async function getAllMedications() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM medications WHERE is_active = 1;');
}
```

The `getDatabase()` helper guarantees:
- SQLite is opened (`paalalay.db`).
- Foreign keys are turned ON (`PRAGMA foreign_keys = ON`).
- The existing migration history is checked; missing setup is reported as an error.
- Migrations run only through the explicit setup action in Assistant, after approval.
- A single cached connection instance is shared across the entire app.
