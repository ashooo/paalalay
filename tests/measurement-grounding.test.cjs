const assert = require('node:assert/strict');
const test = require('node:test');
test('assistant output removes template reasoning markers and preserves the final answer', () => {
  const { assistantText } = require('../src/ai/assistant-text.ts');
  assert.equal(assistantText('<think>internal</think>\nYour reading was saved.'), 'Your reading was saved.');
  assert.equal(assistantText('<think>unfinished'), '');
  assert.equal(assistantText('Ordinary answer.'), 'Ordinary answer.');
});
const { measurementGrounding } = require('../src/ai/measurement-grounding.ts');
const { createAgentController } = require('../src/ai/agent-controller.ts');
test('production grounding rejects invented readings and guessed units while allowing explicit values', () => {
  assert.equal(measurementGrounding('log_blood_pressure', { systolic: 120, diastolic: 80 }, 'My BP is 120/80.'), undefined);
  assert(measurementGrounding('log_blood_pressure', { systolic: 120, diastolic: 80, pulse_bpm: 70 }, 'My BP is 120/80.'));
  assert(measurementGrounding('log_blood_sugar', { value: 90, unit: 'mg_dL' }, 'My glucose is 90'));
  assert.equal(measurementGrounding('log_blood_sugar', { value: 5.2, unit: 'mmol_L' }, 'Record glucose 5.2 mmol/L'), undefined);
  assert(measurementGrounding('log_temperature', { value_c: 37 }, 'Temperature 37'));
  assert.equal(measurementGrounding('log_temperature', { value_c: 37 }, 'Temperature 37 °C'), undefined);
});
test('invented optional measurement never reaches a production confirmation or handler', async () => {
  let executions = 0; let completion = 0;
  const model = { countTokens: async () => 100, stop: async () => {}, generate: async (_, tools) => ++completion === 1 ? { text: '', toolCalls: [{ name: 'log_blood_pressure', arguments: '{"systolic":120,"diastolic":80,"pulse_bpm":70}' }] } : (assert.equal(tools, false), { text: 'Please supply your pulse if you want it recorded.', toolCalls: [] }) };
  const agent = createAgentController(model, { log_blood_pressure: async () => { executions++; throw Error(); } }, { groundMeasurementWrites: true });
  await agent.send('My BP is 120/80.'); assert.equal(executions, 0); assert.equal(agent.getSnapshot().review, undefined);
});
