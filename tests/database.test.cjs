const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createToolDispatcher } = require('../src/ai/dispatcher.ts');

test('baseline migration and confirmed BP writes persist across real SQLite connections', async () => {
  // Isolated synthetic test file; never opens the application's actual database.
  const databasePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paalalay-db-test-')), 'synthetic.db');
  let opened = 0;
  let closed = 0;
  const bind = (args) => args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const originalLoad = Module._load;
  Module._load = function (name, ...args) {
    if (name === 'expo-sqlite') return {
      openDatabaseAsync: async () => {
        opened++;
        const sql = new DatabaseSync(databasePath);
        return {
          databasePath,
          execAsync: async (query) => sql.exec(query),
          runAsync: async (query, ...params) => sql.prepare(query).run(...bind(params)),
          getFirstAsync: async (query, ...params) => sql.prepare(query).get(...bind(params)) ?? null,
          getAllAsync: async (query, ...params) => sql.prepare(query).all(...bind(params)),
          closeAsync: async () => { sql.close(); closed++; },
          withTransactionAsync: async (operation) => {
            sql.exec('BEGIN');
            try { await operation(); sql.exec('COMMIT'); }
            catch (error) { sql.exec('ROLLBACK'); throw error; }
          },
        };
      },
    };
    return originalLoad.call(this, name, ...args);
  };
  try {
    const storage = require('../src/db/chat-storage.ts');
    const prepared = await storage.prepareChatDatabase();
    assert.equal(prepared.migrations.length, 1);
    assert.equal(prepared.migrations[0].version, 1);
    const dispatcher = createToolDispatcher(storage.createDatabaseToolHandlers());
    const args = { systolic: 120, diastolic: 80, notes: "Synthetic quote ' and SQL ; test", recorded_at: '2026-10-10T00:00:00.000Z' };
    const pending = await dispatcher.propose('log_blood_pressure', args);
    assert.equal(pending.kind, 'confirmation');
    let inspect = new DatabaseSync(databasePath);
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM health_logs').get().count, 0);
    inspect.close();
    const saved = await dispatcher.confirm(pending.review.id);
    assert.equal(saved.status, 'success');
    assert.match(saved.data.log_id, /^[0-9a-f-]{36}$/);
    const row = await storage.readBloodPressure(saved.data.log_id);
    assert.equal(row.systolic, 120);
    assert.equal(row.diastolic, 80);
    assert.equal(row.notes, args.notes);
    assert.equal(row.recorded_at, args.recorded_at);
    await storage.prepareChatDatabase();
    assert.equal((await storage.readBloodPressure(saved.data.log_id)).id, saved.data.log_id);
    const cancel = await dispatcher.propose('log_blood_pressure', args);
    dispatcher.cancel(cancel.review.id);
    const rejected = await dispatcher.confirm(cancel.review.id);
    assert.equal(rejected.status, 'error');
    inspect = new DatabaseSync(databasePath);
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM health_logs').get().count, 1);
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 1);
    inspect.close();
    const medications = await dispatcher.propose('list_medications', {});
    assert.deepEqual(medications.result.data.medications, []);
    const synthetic = await storage.testDatabasePersistence();
    assert.equal(synthetic.notes, 'Synthetic development persistence test');
    assert.equal(opened, closed);
  } finally { Module._load = originalLoad; }
});
