import type { SchemaMigration } from './types';

export const DATABASE_NAME = 'paalalay.db (web-preview)';

export interface WebSQLiteDatabase {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
  closeAsync(): Promise<void>;
}

// In-memory / localStorage store for web preview
const webStorage: {
  medications: Record<string, unknown>[];
  health_logs: Record<string, unknown>[];
  schema_migrations: SchemaMigration[];
} = {
  medications: [],
  health_logs: [],
  schema_migrations: [
    {
      version: 1,
      name: '001_initial_baseline_schema',
      applied_at: new Date().toISOString(),
    },
  ],
};

// Load existing web storage if in browser
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const savedMeds = window.localStorage.getItem('paalalay_medications');
    if (savedMeds) webStorage.medications = JSON.parse(savedMeds);
    const savedLogs = window.localStorage.getItem('paalalay_health_logs');
    if (savedLogs) webStorage.health_logs = JSON.parse(savedLogs);
  } catch {
    // Ignore storage parse errors
  }
}

function syncToLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('paalalay_medications', JSON.stringify(webStorage.medications));
      window.localStorage.setItem('paalalay_health_logs', JSON.stringify(webStorage.health_logs));
    } catch {
      // Ignore storage write errors
    }
  }
}

class MockWebDatabase implements WebSQLiteDatabase {
  async execAsync(sql: string): Promise<void> {
    console.log('[Web SQLite Mock execAsync]:', sql.slice(0, 80));
  }

  async getAllAsync<T = unknown>(sql: string, _params?: unknown[]): Promise<T[]> {
    const lower = sql.toLowerCase();
    if (lower.includes('from medications')) {
      return [...webStorage.medications] as T[];
    }
    if (lower.includes('from health_logs')) {
      return [...webStorage.health_logs] as T[];
    }
    if (lower.includes('from schema_migrations')) {
      return [...webStorage.schema_migrations] as T[];
    }
    return [] as T[];
  }

  async runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const lower = sql.toLowerCase();
    console.log('[Web SQLite Mock runAsync]:', sql.slice(0, 80), params);

    if (lower.includes('insert into medications') && params) {
      const [id, name, strength_text, instructions, source, is_active, created_at, updated_at] = params;
      webStorage.medications.push({
        id,
        name,
        strength_text,
        instructions,
        source,
        is_active: is_active ?? 1,
        created_at,
        updated_at,
      });
      syncToLocalStorage();
      return { lastInsertRowId: webStorage.medications.length, changes: 1 };
    }

    if (lower.includes('insert into health_logs') && params) {
      webStorage.health_logs.push({ params });
      syncToLocalStorage();
      return { lastInsertRowId: webStorage.health_logs.length, changes: 1 };
    }

    return { lastInsertRowId: 1, changes: 1 };
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    return await task();
  }

  async closeAsync(): Promise<void> {
    console.log('[Web SQLite Mock] Closed.');
  }
}

const mockDb = new MockWebDatabase();

export async function getDatabase(): Promise<any> {
  return mockDb;
}

export async function initializeDatabase(_db?: any): Promise<any> {
  return mockDb;
}

export async function getMigrationHistory(_db?: any): Promise<SchemaMigration[]> {
  return [...webStorage.schema_migrations];
}

export async function closeDatabase(): Promise<void> {
  await mockDb.closeAsync();
}

export * from './types';
export * from './migrations';
