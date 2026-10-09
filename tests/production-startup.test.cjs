const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const { MODEL_ASSET, prepareModelAsset } = require('../src/ai/model-asset.ts');
test('model setup reuses a verified local file and never downloads it again', async () => {
  let downloads = 0;
  const port = { existing: async () => ['legacy'], size: () => MODEL_ASSET.bytes, hash: async () => MODEL_ASSET.sha256, download: async () => { downloads++; }, removeTemporary: async () => {}, publish: async () => {} };
  assert.equal(await prepareModelAsset(port, new AbortController().signal, () => {}), 'legacy'); assert.equal(downloads, 0);
});
test('model download verifies size and checksum before publication; failed checks clean only temporary files', async () => {
  let published = 0; const removed = [];
  const port = { existing: async () => [], size: () => MODEL_ASSET.bytes, hash: async () => 'wrong', download: async url => { assert(url.includes('23749fef')); return 'temp'; }, removeTemporary: async uri => removed.push(uri), publish: async () => { published++; return 'ready'; } };
  await assert.rejects(prepareModelAsset(port, new AbortController().signal, () => {}), /verified/);
  assert.equal(published, 0); assert.deepEqual(removed, ['temp']);
  port.hash = async () => MODEL_ASSET.sha256;
  assert.equal(await prepareModelAsset(port, new AbortController().signal, () => {}), 'ready'); assert.equal(published, 1);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(prepareModelAsset(port, abort.signal, () => {}), /cancelled/); assert.equal(published, 1);
});
test('first install creates only the baseline once; existing incompatible storage is never repaired or seeded', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'paalalay-startup-'));
  const filename = path.join(directory, 'synthetic.db');
  const original = Module._load; let opens = 0; let schemaWrites = 0; let database;
  Module._load = function(name, ...args) {
    if (name === 'expo-file-system') return { File: class { get exists() { return fs.existsSync(filename); } } };
    if (name === 'expo-sqlite') return { defaultDatabaseDirectory: directory, openDatabaseAsync: async () => {
      opens++; const sql = new DatabaseSync(filename);
      const parameters = params => params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      return { execAsync: async query => { if (/CREATE|INSERT|REPLACE/i.test(query)) schemaWrites++; sql.exec(query); }, getAllAsync: async (query, ...params) => sql.prepare(query).all(...parameters(params)), getFirstAsync: async (query, ...params) => sql.prepare(query).get(...parameters(params)) ?? null, runAsync: async (query, ...params) => { schemaWrites++; return sql.prepare(query).run(...parameters(params)); }, closeAsync: async () => sql.close(), withTransactionAsync: async operation => { sql.exec('BEGIN'); try { await operation(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } } };
    } };
    return original.call(this, name, ...args);
  };
  const modulePath = require.resolve('../src/db/index.ts'); delete require.cache[modulePath];
  try {
    database = require(modulePath);
    const [a, b] = await Promise.all([database.getDatabase(), database.getDatabase()]); assert.equal(a, b); assert.equal(opens, 1);
    assert.equal((await a.getAllAsync('SELECT * FROM health_logs')).length, 0);
    assert.equal((await a.getAllAsync('SELECT * FROM doctors')).length, 0);
    const written = schemaWrites; await database.closeDatabase(); await database.getDatabase(); assert.equal(schemaWrites, written);
    await database.closeDatabase();
    // Synthetic existing file with an unknown version; allowed test inserts only.
    const inspect = new DatabaseSync(filename); inspect.prepare('INSERT INTO schema_migrations VALUES (99, ?, ?)').run('Future schema', 'synthetic'); inspect.close();
    // Future versions must not silently be read by an older app.
    await assert.rejects(database.getDatabase(), /different app version/);
    const unchanged = new DatabaseSync(filename); assert.equal(unchanged.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 2); unchanged.close();
    assert.equal(schemaWrites, written); await database.closeDatabase();
    const brokenPath = path.join(directory, 'broken.db'); const broken = new DatabaseSync(brokenPath);
    broken.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT);'); broken.prepare('INSERT INTO schema_migrations VALUES (1, ?, ?)').run('baseline', 'keep-this'); broken.close();
    // Select the broken synthetic file through the file/SQLite adapter without altering the real app.
    Module._load = function(name, ...args) {
      if (name === 'expo-file-system') return { File: class { get exists() { return true; } } };
      if (name === 'expo-sqlite') return { openDatabaseAsync: async () => { const sql = new DatabaseSync(brokenPath); return { execAsync: async query => { assert.equal(query, 'PRAGMA foreign_keys = ON;'); sql.exec(query); }, getAllAsync: async query => sql.prepare(query).all(), closeAsync: async () => sql.close() }; } };
      return original.call(this, name, ...args);
    };
    delete require.cache[modulePath]; database = require(modulePath);
    await assert.rejects(database.getDatabase());
    const after = new DatabaseSync(brokenPath); assert.equal(after.prepare('SELECT applied_at FROM schema_migrations').get().applied_at, 'keep-this'); assert.equal(after.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n, 1); after.close();
  } finally { if (database) await database.closeDatabase(); Module._load = original; delete require.cache[modulePath]; }
});
