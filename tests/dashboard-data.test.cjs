const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('dashboard reads seven UTC dates, retains glucose units and surfaces failures instead of empty history', async () => {
  const original = Module._load;
  let failure = false;
  const requests = [];
  Module._load = function(name, ...args) {
    if (name === '../../services/api-client') return {
      getHealthSummary: async input => { requests.push(input); return failure ? { status: 'error' } : { status: 'success', data: { counts: { blood_pressure: 1 } } }; },
      fetchHealthHistory: async input => { requests.push(input); return { status: 'success', data: { logs: [
        { log_type: 'blood_sugar', recorded_at: '2026-10-10T01:00:00Z', values: { value: 5.2, unit: 'mmol_L' } },
        { log_type: 'blood_sugar', recorded_at: '2026-10-09T01:00:00Z', glucose_value: 90, glucose_unit: 'mg_dL' },
        { log_type: 'blood_pressure', recorded_at: '2026-10-08T01:00:00Z', systolic: 120, diastolic: 80 },
      ] } }; },
    };
    return original.call(this, name, ...args);
  };
  const modulePath = require.resolve('../src/features/insights/dashboard-data.ts');
  delete require.cache[modulePath];
  try {
    const { loadDashboardData } = require(modulePath);
    const result = await loadDashboardData(new Date('2026-10-10T02:00:00Z'));
    assert.deepEqual(requests[0], { from: '2026-10-04', to: '2026-10-10' });
    assert.equal(requests[1].limit, 100);
    assert.deepEqual(result.sugar.map(row => row.glucose_unit), ['mg_dL', 'mmol_L']);
    assert.equal(result.bp[0].pulse_bpm, null);
    failure = true;
    await assert.rejects(loadDashboardData(), /could not be loaded/);
  } finally { Module._load = original; delete require.cache[modulePath]; }
});
