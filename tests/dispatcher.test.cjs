const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Use the project's existing TypeScript compiler to load pure TS modules in Node.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { createToolDispatcher } = require('../src/ai/dispatcher.ts');
const { createMockToolHandlers } = require('../src/ai/mock-handlers.ts');
const { toolInputSchemas, toolMetadata, getModelTools } = require('../src/contracts/tools.ts');

const id = '00000000-0000-4000-8000-000000000001';
const instant = '2026-10-09T10:00:00.000Z';
const bp = { systolic: 120, diastolic: 80 };
const success = { status: 'success', data: { log_id: id, log_type: 'blood_pressure', recorded_at: instant } };

test('all frozen public tools have validators and model schemas; internal OCR is excluded', () => {
  const tools = getModelTools();
  assert.equal(tools.length, 14);
  assert.deepEqual(tools.map((t) => t.function.name), Object.keys(toolInputSchemas));
  assert.equal(tools.some((t) => t.function.name === 'extract_prescription_text'), false);
  for (const tool of tools) assert.equal(tool.function.parameters.additionalProperties, false);
});

test('all public inputs accept representative contract arguments', () => {
  const inputs = {
    create_medication: { name: 'Example medicine', strength_text: '5 mg' },
    list_medications: {}, get_today_medications: {},
    set_medication_schedule: { medication_id: id, times_local: ['08:00'], timezone: 'Asia/Manila' },
    record_medication_intake: { medication_id: id, schedule_id: id, scheduled_for: instant, status: 'taken' },
    get_medication_history: {}, log_blood_pressure: bp,
    log_blood_sugar: { value: 90, unit: 'mg_dL' }, log_temperature: { value_c: 36.5 },
    log_weight: { value_kg: 65 }, log_symptom: { symptom: 'Headache' }, get_health_history: {},
    get_health_summary: { from: '2026-10-01', to: '2026-10-09' }, search_specialists: { specialty: 'cardiology' },
  };
  for (const [name, input] of Object.entries(inputs)) assert.equal(toolInputSchemas[name].safeParse(input).success, true, name);
});

test('every write is held for confirmation and cancellation never invokes its handler', async () => {
  const inputs = {
    create_medication: { name: 'Example', strength_text: '5 mg' },
    set_medication_schedule: { medication_id: id, times_local: ['08:00'] },
    record_medication_intake: { medication_id: id, schedule_id: id, scheduled_for: instant, status: 'taken' },
    log_blood_pressure: bp, log_blood_sugar: { value: 90, unit: 'mg_dL' },
    log_temperature: { value_c: 36.5 }, log_weight: { value_kg: 65 }, log_symptom: { symptom: 'Headache' },
  };
  for (const [name, input] of Object.entries(inputs)) {
    let calls = 0;
    const dispatcher = createToolDispatcher({ [name]: async () => { calls++; return success; } });
    assert.equal(toolMetadata[name].mode, 'write');
    const outcome = await dispatcher.propose(name, input);
    assert.equal(outcome.kind, 'confirmation');
    assert.equal(calls, 0);
    assert.equal(dispatcher.cancel(outcome.review.id).error.code, 'CANCELLED');
    assert.equal((await dispatcher.confirm(outcome.review.id)).error.code, 'PERMISSION_DENIED');
    assert.equal(calls, 0);
  }
});

test('confirmed write uses a snapshot of validated args and executes once, including simultaneous double taps', async () => {
  let calls = 0;
  let received;
  let finish;
  const dispatcher = createToolDispatcher({ log_blood_pressure: async (args) => {
    calls++; received = args;
    await new Promise((resolve) => { finish = resolve; });
    return success;
  } });
  const input = { ...bp };
  const { review } = await dispatcher.propose('log_blood_pressure', input);
  input.systolic = 999;
  assert.equal(review.fields.find((f) => f.label === 'Systolic (mmHg)').value, '120');
  assert.equal(Object.isFrozen(review.fields), true);
  const first = dispatcher.confirm(review.id);
  assert.equal((await dispatcher.confirm(review.id)).error.code, 'PERMISSION_DENIED');
  assert.equal((await dispatcher.propose('list_medications', {})).result.error.code, 'PERMISSION_DENIED');
  finish();
  assert.deepEqual(await first, success);
  assert.deepEqual(received, bp);
  assert.equal(calls, 1);
});

test('pending review blocks new proposals; stale confirmation cannot approve a newer action', async () => {
  const dispatcher = createToolDispatcher(createMockToolHandlers());
  const first = await dispatcher.propose('log_blood_pressure', bp);
  assert.equal((await dispatcher.propose('log_blood_pressure', bp)).result.error.code, 'PERMISSION_DENIED');
  dispatcher.cancel(first.review.id);
  const second = await dispatcher.propose('log_blood_pressure', bp);
  assert.equal((await dispatcher.confirm(first.review.id)).error.code, 'PERMISSION_DENIED');
  assert.equal((await dispatcher.confirm(second.review.id)).status, 'success');
});

test('reads execute immediately with schema defaults', async () => {
  let received;
  const dispatcher = createToolDispatcher({ list_medications: async (args) => {
    received = args; return { status: 'success', data: { medications: [] } };
  } });
  const outcome = await dispatcher.propose('list_medications', {});
  assert.equal(outcome.kind, 'result');
  assert.equal(outcome.result.status, 'success');
  assert.deepEqual(received, { active_only: true });
});

test('unknown, internal, and inherited tool names are denied', async () => {
  const dispatcher = createToolDispatcher(createMockToolHandlers());
  for (const name of ['extract_prescription_text', 'delete_database', 'constructor', '__proto__']) {
    assert.equal((await dispatcher.propose(name, {})).result.error.code, 'PERMISSION_DENIED');
  }
});

test('missing or malformed arguments require clarification without executing', async () => {
  const dispatcher = createToolDispatcher(createMockToolHandlers());
  for (const input of [{ systolic: 120 }, { ...bp, diastolic: '80' }, { ...bp, confirm: true }, null]) {
    const outcome = await dispatcher.propose('log_blood_pressure', input);
    assert.equal(outcome.result.error.code, 'VALIDATION_ERROR');
    assert.match(outcome.result.error.message, /clarify/);
  }
  const badInputs = [
    ['create_medication', { name: 'Example', strength_text: ' ' }],
    ['set_medication_schedule', { medication_id: id, times_local: ['25:00'] }],
    ['set_medication_schedule', { medication_id: id, times_local: ['08:00', '08:00'] }],
    ['set_medication_schedule', { medication_id: id, times_local: ['08:00'], days_of_week: [7] }],
    ['set_medication_schedule', { medication_id: id, times_local: ['08:00'], timezone: 'invalid' }],
    ['record_medication_intake', { medication_id: id, schedule_id: id, scheduled_for: '2026-10-09T18:00:00+08:00', status: 'taken' }],
    ['get_health_summary', { from: '2026-10-10', to: '2026-10-09' }],
    ['get_today_medications', { date: '2026-02-30' }],
    ['get_health_history', { limit: 101 }], ['search_specialists', { specialty: 'cardiology', limit: 31 }],
  ];
  for (const [name, input] of badInputs) assert.equal(toolInputSchemas[name].safeParse(input).success, false, name);
});

test('unconnected tools return NOT_FOUND instead of fake success', async () => {
  const dispatcher = createToolDispatcher({});
  assert.equal((await dispatcher.propose('log_blood_pressure', bp)).result.error.code, 'NOT_FOUND');
});

test('service errors are preserved; exceptions and invalid responses are sanitized', async () => {
  const cases = [
    [async () => ({ status: 'error', error: { code: 'NOT_FOUND', message: 'Record not found.' } }), 'NOT_FOUND'],
    [async () => { throw new Error('private patient details'); }, 'INTERNAL_ERROR'],
    [async () => ({ status: 'success' }), 'INTERNAL_ERROR'],
    [async () => ({ status: 'success', data: { log_id: 'bad' } }), 'INTERNAL_ERROR'],
  ];
  for (const [handler, expected] of cases) {
    const dispatcher = createToolDispatcher({ log_blood_pressure: handler });
    const { review } = await dispatcher.propose('log_blood_pressure', bp);
    const result = await dispatcher.confirm(review.id);
    assert.equal(result.error.code, expected);
    assert.doesNotMatch(result.error.message, /private patient/);
    assert.equal((await dispatcher.confirm(review.id)).error.code, 'PERMISSION_DENIED');
  }
});

test('test bench examples stay compatible with every frozen tool schema', () => {
  const { toolExamples } = require('../src/ai/tool-examples.ts');
  for (const [name, input] of Object.entries(toolExamples)) {
    assert.equal(toolInputSchemas[name].safeParse(input).success, true, name);
  }
});

test('web model adapter fails explicitly while retaining an inert cleanup', async () => {
  const { createLocalModelRuntime } = require('../src/ai/local-model.web.ts');
  const runtime = createLocalModelRuntime();
  await assert.rejects(runtime.load('file:///model.gguf'), /development build/);
  await assert.rejects(runtime.complete('Hello', false), /development build/);
  await runtime.dispose();
});

test('native model adapter validates paths, passes tool definitions, and releases after an in-flight generation', async () => {
  const Module = require('node:module');
  const originalLoad = Module._load;
  let options;
  let completionOptions;
  let finish;
  let releases = 0;
  Module._load = function(request, ...args) {
    if (request === 'llama.rn') return {
      initLlama: async (params) => {
        options = params;
        return {
          completion: async (params) => {
            completionOptions = params;
            await new Promise((resolve) => { finish = resolve; });
            return { text: 'raw', content: 'hello', tool_calls: [{ function: { name: 'log_blood_pressure', arguments: '{"systolic":120,"diastolic":80}' } }] };
          },
          release: async () => { releases++; },
        };
      },
    };
    return originalLoad.call(this, request, ...args);
  };
  try {
    const { createLocalModelRuntime } = require('../src/ai/local-model.ts');
    const runtime = createLocalModelRuntime();
    await assert.rejects(runtime.load('C:/models/example.gguf'), /file:\/\/\//);
    assert.equal(options, undefined);
    await assert.rejects(runtime.complete('Hello', false), /Load a model/);
    await runtime.load('file:///models/example.gguf');
    assert.equal(options.model, 'file:///models/example.gguf');
    assert.equal(options.n_gpu_layers, 0);
    const pending = runtime.complete('Record blood pressure 120/80', true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(completionOptions.tools.length, 14);
    assert.equal(completionOptions.parallel_tool_calls, false);
    const disposal = runtime.dispose();
    assert.equal(releases, 0);
    finish();
    const result = await pending;
    assert.equal(result.text, 'hello');
    assert.equal(result.toolCalls[0].name, 'log_blood_pressure');
    await disposal;
    assert.equal(releases, 1);
    await assert.rejects(runtime.load('file:///models/example.gguf'), /closed/);
  } finally {
    Module._load = originalLoad;
  }
});
