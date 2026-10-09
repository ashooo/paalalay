const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { createToolDispatcher } = require('../src/ai/dispatcher.ts');
const { toolInputSchemas } = require('../src/contracts/tools.ts');
test('production chat registers real tools and converts measurements without guessing optional fields', async () => {
  const original = Module._load; const writes = [];
  const id = '00000000-0000-4000-8000-000000000001';
  Module._load = function(name, ...args) {
    if (name === '../services/api-client') return {
      fetchMedications: async () => ({ status: 'success', data: { medications: [] } }),
      logHealthMeasurement: async input => { writes.push(input); return { status: 'success', data: { log_id: id, log_type: input.log_type, recorded_at: '2026-10-10T00:00:00.000Z' } }; },
    };
    if (name === '../features/medications/management-service') return { getMedicineManagement: async () => ({ medicines: [], schedules: [], intakes: [] }) };
    return original.call(this, name, ...args);
  };
  const modulePath = require.resolve('../src/ai/production-handlers.ts'); delete require.cache[modulePath];
  try {
    const handlers = require(modulePath).createProductionToolHandlers();
    assert.deepEqual(Object.keys(handlers).sort(), Object.keys(toolInputSchemas).sort());
    const dispatcher = createToolDispatcher(handlers);
    const review = await dispatcher.propose('log_blood_sugar', { value: 5.2, unit: 'mmol_L' });
    assert.equal(writes.length, 0); assert.equal(review.kind, 'confirmation');
    assert.equal((await dispatcher.confirm(review.review.id)).status, 'success');
    assert.deepEqual(writes, [{ log_type: 'blood_sugar', glucose_value: 5.2, glucose_unit: 'mmol_L', glucose_context: undefined }]);
    assert.equal((await dispatcher.propose('list_medications', {})).result.status, 'success');
    assert.equal((await dispatcher.propose('get_today_medications', {})).result.status, 'success');
  } finally { Module._load = original; delete require.cache[modulePath]; }
});
