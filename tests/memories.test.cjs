const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { MEMORY_SCHEMA, createMemoryRepository, memoryContext } = require('../src/features/memories/repository.ts');
const { createMemoryToolHandlers } = require('../src/ai/memory-handlers.ts');
const { createAgentController } = require('../src/ai/agent-controller.ts');

function repository() {
  const db = new DatabaseSync(':memory:'); db.exec(MEMORY_SCHEMA);
  const store = createMemoryRepository({ getAllAsync: async (sql, params = []) => db.prepare(sql).all(...params), runAsync: async (sql, params) => db.prepare(sql).run(...params) }, randomUUID);
  return { db, store };
}
test('native memory storage persists after reopening and never repairs an existing incompatible file', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'paalalay-memory-test-'));
  const filename = path.join(directory, 'assistant-memory.db');
  const original = Module._load, modulePath = require.resolve('../src/features/memories/store.ts');
  const connections = []; let schemaWrites = 0;
  Module._load = function(name, ...args) {
    if (name === 'expo-crypto') return { randomUUID };
    if (name === 'expo-file-system') return { File: class { constructor(dir, file) { assert.equal(dir, directory); assert.equal(file, 'assistant-memory.db'); } get exists() { return fs.existsSync(filename); } } };
    if (name === 'expo-sqlite') return { defaultDatabaseDirectory: directory, openDatabaseAsync: async name => {
      assert.equal(name, 'assistant-memory.db');
      const db = new DatabaseSync(filename); connections.push(db);
      return { getAllAsync: async (query, params = []) => db.prepare(query).all(...params), runAsync: async (query, params) => db.prepare(query).run(...params), execAsync: async query => { schemaWrites++; db.exec(query); }, closeAsync: async () => db.close(), withTransactionAsync: async operation => { db.exec('BEGIN'); try { await operation(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } } };
    } };
    return original.call(this, name, ...args);
  };
  try {
    delete require.cache[modulePath]; const first = require(modulePath);
    const [a, b] = await Promise.all([first.getMemoryStore(), first.getMemoryStore()]); assert.equal(a, b); assert.equal(connections.length, 1);
    const saved = await a.save('I prefer concise replies'); connections.pop().close();
    delete require.cache[modulePath]; const reopened = await require(modulePath).getMemoryStore();
    assert.equal((await reopened.list())[0].id, saved.id); assert.equal(schemaWrites, 1); connections.pop().close();
    // Select a different, existing incompatible file through the injected adapter.
    const broken = path.join(directory, 'existing-incompatible.db'); const db = new DatabaseSync(broken);
    db.exec('CREATE TABLE protected_record (text TEXT); INSERT INTO protected_record VALUES (\'keep\');'); db.close();
    Module._load = function(name, ...args) {
      if (name === 'expo-crypto') return { randomUUID };
      if (name === 'expo-file-system') return { File: class { get exists() { return true; } } };
      if (name === 'expo-sqlite') return { defaultDatabaseDirectory: directory, openDatabaseAsync: async () => { const sql = new DatabaseSync(broken); return { getAllAsync: async query => sql.prepare(query).all(), execAsync: async () => assert.fail('Existing storage must not be modified'), closeAsync: async () => sql.close() }; } };
      return original.call(this, name, ...args);
    };
    delete require.cache[modulePath]; await assert.rejects(require(modulePath).getMemoryStore(), /memories/);
    const after = new DatabaseSync(broken); assert.equal(after.prepare('SELECT text FROM protected_record').get().text, 'keep'); assert.equal(after.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get().n, 1); after.close();
  } finally { Module._load = original; delete require.cache[modulePath]; for (const connection of connections) connection.close(); }
});
test('memory management deduplicates concurrent saves, binds quotes, and refuses stale forgetting', async () => {
  const { db, store } = repository();
  try {
    const [first, duplicate] = await Promise.all([store.save("I prefer short replies; 'quoted'"), store.save("I prefer short replies; 'quoted'")]);
    assert.equal(first.id, duplicate.id); assert.equal((await store.list()).length, 1);
    await store.update(first.id, 'I prefer Filipino replies');
    await assert.rejects(store.forget(first.id, first.text), /changed/);
    assert.equal((await store.list())[0].text, 'I prefer Filipino replies');
    await store.forget(first.id, 'I prefer Filipino replies');
    assert.deepEqual(await store.list(), []);
    await assert.rejects(store.save(' '.repeat(3))); await assert.rejects(store.save('x'.repeat(301)));
    for (let index = 0; index < 40; index++) await store.save(`Preference ${index}`);
    await assert.rejects(store.save('Preference 41'), /40 memories/);
    assert.equal(memoryContext(Array(40).fill('x'.repeat(500))).length, 12);
    assert.equal(memoryContext(['x'.repeat(500)])[0].length, 300);
  } finally { db.close(); }
});
test('assistant memory saves require confirmation, survive chat reset, and forgetting clears later model context', async () => {
  const { db, store } = repository(); let next = 'remember'; const prompts = [];
  const model = {
    countTokens: async () => 50, stop: async () => {},
    generate: async messages => {
      prompts.push(messages[0].content);
      if (next === 'remember') { next = 'answer'; return { text: 'Pretend already saved', toolCalls: [{ name: 'remember_memory', arguments: JSON.stringify({ text: 'I prefer short replies' }) }] }; }
      if (next === 'forget') { next = 'answer'; const [memory] = await store.list(); return { text: '', toolCalls: [{ name: 'forget_memory', arguments: JSON.stringify({ memory_id: memory.id, text: memory.text }) }] }; }
      return { text: 'Done.', toolCalls: [] };
    },
  };
  const agent = createAgentController(model, createMemoryToolHandlers(async () => store), { persistentTools: true, loadMemories: async () => (await store.list()).map(memory => memory.text) });
  try {
    await agent.send('Remember that I prefer short replies');
    assert.equal((await store.list()).length, 0); assert.equal(agent.getSnapshot().phase, 'awaiting_confirmation');
    assert(!agent.getSnapshot().entries.some(entry => entry.content.includes('Pretend already saved')));
    await agent.confirm(agent.getSnapshot().review.id); assert.equal((await store.list()).length, 1);
    assert(prompts.at(-1).includes('Saved user-approved context'));
    await agent.reset(); await agent.send('Hello'); assert(prompts.at(-1).includes('I prefer short replies'));
    next = 'forget'; await agent.send('Forget my reply preference');
    const cancelled = agent.getSnapshot().review.id; await agent.cancel(cancelled); assert.equal((await store.list()).length, 1);
    await assert.rejects(agent.confirm(cancelled));
    next = 'forget'; await agent.send('Forget my reply preference'); await agent.confirm(agent.getSnapshot().review.id);
    await agent.reset(); await agent.send('Hello again'); assert(!prompts.at(-1).includes('Saved user-approved context'));
  } finally { await agent.dispose(); db.close(); }
});
test('memory context failure does not fabricate data or prevent ordinary conversation', async () => {
  const agent = createAgentController({ countTokens: async () => 50, stop: async () => {}, generate: async messages => { assert(!messages[0].content.includes('Saved user-approved context')); return { text: 'Hello', toolCalls: [] }; } }, {}, { loadMemories: async () => { throw new Error('Unavailable'); } });
  await agent.send('Hello'); assert.equal(agent.getSnapshot().entries.at(-1).content, 'Hello'); await agent.dispose();
});
