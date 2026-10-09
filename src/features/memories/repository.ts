export interface Memory { id: string; text: string; created_at: string; updated_at: string }
export const MEMORY_SCHEMA = 'CREATE TABLE memories (id TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 300), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);';
export interface MemoryDatabase {
  getAllAsync<T>(sql: string, params?: string[]): Promise<T[]>;
  runAsync(sql: string, params: string[]): Promise<{ changes: number }>;
}
export function createMemoryRepository(db: MemoryDatabase, uuid: () => string, now = () => new Date().toISOString()) {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> { const result = queue.then(operation); queue = result.catch(() => undefined); return result; }
  const valid = (text: string) => { const value = text.trim(); if (!value || value.length > 300) throw new Error('A memory must contain 1 to 300 characters.'); return value; };
  return {
    list: () => serial(() => db.getAllAsync<Memory>('SELECT id, text, created_at, updated_at FROM memories ORDER BY updated_at DESC, id ASC LIMIT 40')),
    save: (text: string) => serial(async () => {
      const value = valid(text);
      const duplicate = await db.getAllAsync<Memory>('SELECT * FROM memories WHERE text = ? COLLATE NOCASE LIMIT 1', [value]);
      if (duplicate.length) return duplicate[0];
      const count = await db.getAllAsync<{ n: number }>('SELECT COUNT(*) AS n FROM memories');
      if (count[0].n >= 40) throw new Error('You have 40 memories. Forget an older one before adding another.');
      const memory = { id: uuid(), text: value, created_at: now(), updated_at: now() };
      await db.runAsync('INSERT INTO memories (id, text, created_at, updated_at) VALUES (?, ?, ?, ?)', [memory.id, memory.text, memory.created_at, memory.updated_at]);
      return memory;
    }),
    update: (id: string, text: string) => serial(async () => {
      const result = await db.runAsync('UPDATE memories SET text = ?, updated_at = ? WHERE id = ?', [valid(text), now(), id]);
      if (!result.changes) throw new Error('This memory no longer exists.');
    }),
    forget: (id: string, expectedText: string) => serial(async () => {
      const result = await db.runAsync('DELETE FROM memories WHERE id = ? AND text = ?', [id, expectedText]);
      if (!result.changes) throw new Error('This memory changed or no longer exists. Refresh before trying again.');
    }),
  };
}
export function memoryContext(texts: readonly string[]) {
  return texts.slice(0, 12).map(text => text.trim().slice(0, 300)).filter(Boolean);
}
