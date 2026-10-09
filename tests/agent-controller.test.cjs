const assert = require('node:assert/strict');
const test = require('node:test');
const { createAgentController } = require('../src/ai/agent-controller.ts');

const bpResult = { status: 'success', data: { log_id: '00000000-0000-4000-8000-000000000001', log_type: 'blood_pressure', recorded_at: '2026-10-09T10:00:00.000Z' } };
const call = (name = 'log_blood_pressure', args = '{"systolic":120,"diastolic":80}', id = 'native_call') => ({ text: 'Already saved!', toolCalls: [{ id, name, arguments: args }] });
const answer = (text = 'Mock completed; nothing was saved.') => ({ text, toolCalls: [] });
const pause = () => new Promise((resolve) => setImmediate(resolve));

function setup(outputs, handlers = {}, overrides = {}) {
  const requests = [];
  const model = {
    countTokens: async () => 100,
    generate: async (messages, tools) => {
      requests.push({ messages: JSON.parse(JSON.stringify(messages)), tools });
      const next = outputs.shift();
      if (!next) throw new Error('Unexpected extra completion');
      return typeof next === 'function' ? next() : next;
    },
    stop: async () => {},
    ...overrides,
  };
  return { agent: createAgentController(model, handlers), requests };
}

test('agent ordinary answers and later turns retain conversation history', async () => {
  const { agent, requests } = setup([answer('Hello'), answer('Again')]);
  await agent.send('Hi');
  assert.equal(agent.getSnapshot().phase, 'idle');
  await agent.send('Follow up');
  assert.deepEqual(requests[1].messages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
});

test('agent reads execute immediately and feed a matched result into the next model turn', async () => {
  const { agent, requests } = setup([call('list_medications', '{}'), answer()], {
    list_medications: async () => ({ status: 'success', data: { medications: [] } }),
  });
  await agent.send('List my medicines');
  const messages = requests[1].messages;
  assert.equal(messages[2].tool_calls[0].id, 'native_call');
  assert.equal(messages[3].tool_call_id, 'native_call');
  assert.equal(messages[3].name, 'list_medications');
  assert.equal(JSON.parse(messages[3].content).status, 'success');
  assert.equal(agent.getSnapshot().entries.some((e) => e.content === 'Already saved!'), false);
});

test('agent pauses writes, rejects competing sends/double confirmation, and resumes only after approval', async () => {
  let executions = 0;
  const { agent, requests } = setup([call(), answer()], { log_blood_pressure: async () => { executions++; return bpResult; } });
  await agent.send('Record 120/80');
  const review = agent.getSnapshot().review;
  assert.equal(agent.getSnapshot().phase, 'awaiting_confirmation');
  assert.equal(executions, 0);
  assert.equal(requests.length, 1);
  await assert.rejects(agent.send('Another message'), /current turn/);
  await assert.rejects(agent.confirm(review.id + 1), /no longer valid/);
  const first = agent.confirm(review.id);
  await assert.rejects(agent.confirm(review.id), /no longer valid/);
  await first;
  assert.equal(executions, 1);
  assert.equal(requests.length, 2);
  assert.equal(agent.getSnapshot().phase, 'idle');
});

test('agent cancellation feeds CANCELLED and disables tools for its explanation', async () => {
  let executions = 0;
  const { agent, requests } = setup([call(), answer('Cancelled')], { log_blood_pressure: async () => { executions++; return bpResult; } });
  await agent.send('Record 120/80');
  await agent.cancel(agent.getSnapshot().review.id);
  assert.equal(executions, 0);
  assert.equal(requests[1].tools, false);
  assert.equal(JSON.parse(requests[1].messages.at(-1).content).error.code, 'CANCELLED');
});

test('agent invalid JSON, missing arguments, unknown tools and unavailable handlers produce one tool-free explanation', async () => {
  for (const [proposal, code] of [
    [call('log_blood_pressure', '{bad'), 'VALIDATION_ERROR'],
    [call('log_blood_pressure', '{"systolic":120}'), 'VALIDATION_ERROR'],
    [call('extract_prescription_text', '{}'), 'PERMISSION_DENIED'],
    [call('list_medications', '{}'), 'NOT_FOUND'],
  ]) {
    const { agent, requests } = setup([proposal, answer('Please clarify')]);
    await agent.send('Test');
    assert.equal(requests.length, 2);
    assert.equal(requests[1].tools, false);
    assert.equal(JSON.parse(requests[1].messages.at(-1).content).error.code, code);
  }
});

test('agent rejects multiple calls and rejects tool proposals in a tool-free explanation', async () => {
  let executions = 0;
  const handlers = { log_blood_pressure: async () => { executions++; return bpResult; } };
  const multi = call(); multi.toolCalls.push({ name: 'list_medications', arguments: '{}' });
  const { agent } = setup([multi], handlers);
  await agent.send('Do two things');
  assert.equal(agent.getSnapshot().phase, 'idle');
  assert.match(agent.getSnapshot().entries.at(-1).content, /Multiple/);
  const second = setup([call('list_medications', '{}'), call()], handlers);
  await second.agent.send('Test');
  assert.match(second.agent.getSnapshot().entries.at(-1).content, /disabled/);
  assert.equal(executions, 0);
});

test('agent suppresses repeated successful writes with reordered or normalized args', async () => {
  let executions = 0;
  const { agent, requests } = setup([call(), call('log_blood_pressure', '{"diastolic":80,"systolic":120}'), answer()], {
    log_blood_pressure: async () => { executions++; return bpResult; },
  });
  await agent.send('Record 120/80');
  await agent.confirm(agent.getSnapshot().review.id);
  assert.equal(executions, 1);
  assert.equal(requests[2].tools, false);
  const messages = requests[2].messages;
  assert.equal(JSON.parse(messages.at(-1).content).error.code, 'PERMISSION_DENIED');
  assert.notEqual(messages[2].tool_calls[0].id, messages[4].tool_calls[0].id);
});

test('agent failed writes never retry and preserve the returned error', async () => {
  let executions = 0;
  const { agent, requests } = setup([call(), answer('Failed')], {
    log_blood_pressure: async () => { executions++; return { status: 'error', error: { code: 'INTERNAL_ERROR', message: 'Service failed.' } }; },
  });
  await agent.send('Record 120/80');
  await agent.confirm(agent.getSnapshot().review.id);
  assert.equal(executions, 1);
  assert.equal(requests[1].tools, false);
});

test('agent caps completions at five, making the fifth tool-free', async () => {
  const outputs = Array.from({ length: 4 }, () => call('list_medications', '{}'));
  outputs.push(answer());
  const { agent, requests } = setup(outputs, { list_medications: async () => ({ status: 'success', data: { medications: [] } }) });
  await agent.send('Keep reading');
  assert.equal(requests.length, 5);
  assert.deepEqual(requests.map((r) => r.tools), [true, true, true, true, false]);
  assert.equal(agent.getSnapshot().completions, 5);
});

test('agent trims complete older turns and preserves the active tool exchange', async () => {
  const { agent, requests } = setup([answer('Older answer'), call('list_medications', '{}'), answer()], {
    list_medications: async () => ({ status: 'success', data: { medications: [] } }),
  }, { countTokens: async (messages) => messages.some((m) => m.content === 'Old turn') && messages.some((m) => m.content === 'Current turn') ? 4000 : 100 });
  await agent.send('Old turn');
  await agent.send('Current turn');
  assert.equal(requests[1].messages.some((m) => m.content === 'Old turn'), false);
  assert.deepEqual(requests[2].messages.map((m) => m.role), ['system', 'user', 'assistant', 'tool']);
});

test('agent context overflow stops before inference or tool execution', async () => {
  const { agent, requests } = setup([], {}, { countTokens: async () => 5000 });
  await agent.send('Too large');
  assert.equal(requests.length, 0);
  assert.match(agent.getSnapshot().entries.at(-1).content, /too large/);
});

test('agent stopping inference discards late proposals and retains its lock until completion', async () => {
  let finish;
  let interrupted = 0;
  const { agent } = setup([() => new Promise((resolve) => { finish = resolve; })], {}, { stop: async () => { interrupted++; } });
  const sending = agent.send('Test');
  await pause();
  const stopping = agent.stop();
  await pause();
  assert.equal(agent.getSnapshot().phase, 'stopping');
  await assert.rejects(agent.send('Race'), /current turn/);
  finish(call());
  await Promise.all([sending, stopping]);
  assert.equal(interrupted, 1);
  assert.equal(agent.getSnapshot().review, undefined);
  assert.equal(agent.getSnapshot().phase, 'idle');
});

test('agent stop during a handler displays its real result without another model completion', async () => {
  let finish;
  const { agent, requests } = setup([call()], { log_blood_pressure: async () => new Promise((resolve) => { finish = resolve; }) });
  await agent.send('Record 120/80');
  const confirming = agent.confirm(agent.getSnapshot().review.id);
  await pause();
  const stopping = agent.stop();
  finish(bpResult);
  await Promise.all([confirming, stopping]);
  assert.equal(requests.length, 1);
  assert.equal(agent.getSnapshot().entries.some((e) => e.role === 'tool' && JSON.parse(e.content).status === 'success'), true);
  assert.match(agent.getSnapshot().entries.at(-1).content, /could not be undone/);
});

test('agent reset cancels a pending review, clears memory, and invalidates old approvals', async () => {
  const { agent } = setup([call(), answer()], { log_blood_pressure: async () => bpResult });
  await agent.send('Record');
  const id = agent.getSnapshot().review.id;
  await agent.reset();
  assert.equal(agent.getSnapshot().entries.length, 0);
  await assert.rejects(agent.confirm(id), /no longer valid/);
  await agent.send('Hi');
  assert.equal(agent.getSnapshot().entries.length, 2);
});

test('agent disposal cancels reviews, detaches subscribers, and prevents future sends', async () => {
  let updates = 0;
  const { agent } = setup([call()], { log_blood_pressure: async () => bpResult });
  agent.subscribe(() => { updates++; });
  await agent.send('Record');
  const previous = updates;
  await agent.dispose();
  assert.equal(updates, previous);
  await assert.rejects(agent.send('Hi'), /current turn/);
});
