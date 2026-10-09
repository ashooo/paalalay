let connection: any;
let connectionPath: string | undefined;

export async function getDb() {
  const sqlite = (await import('node:sqlite' as string)) as any;
  const path = (await import('path' as string)) as any;
  const fs = (await import('fs' as string)) as any;

  const dbPath = process.env.PAALALAY_DB_PATH || path.join(process.cwd(), 'paalalay.db');
  if (connection && connectionPath === dbPath) return connection;
  if (connection) { connection.close(); connection = undefined; }
  if (!fs.existsSync(dbPath)) throw new Error('Database missing. Explicit setup is required.');
  const db = new sqlite.DatabaseSync(dbPath);

  db.exec('PRAGMA foreign_keys = ON;');

  try {
    const baseline = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
    if (!baseline) throw new Error('Database schema is out of sync. Explicit setup is required.');
  } catch (error) { db.close(); throw error; }
  connection = db;
  connectionPath = dbPath;
  return connection;
}

export function closeServerDatabase() {
  connection?.close();
  connection = undefined;
  connectionPath = undefined;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
