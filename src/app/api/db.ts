export async function getDb() {
  const sqlite = (await import('node:sqlite' as string)) as any;
  const path = (await import('path' as string)) as any;
  const fs = (await import('fs' as string)) as any;

  const dbPath = path.join(process.cwd(), 'paalalay.db');
  const db = new sqlite.DatabaseSync(dbPath);

  db.exec('PRAGMA foreign_keys = ON;');

  const schemaPath = path.join(process.cwd(), 'src/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  return db;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
