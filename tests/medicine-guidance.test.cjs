const assert = require('node:assert/strict');
const test = require('node:test');
const { createMedicineReferenceHandlers, medicineLinks, guidanceExcerpt } = require('../src/ai/medicine-guidance.ts');
const { createAgentController } = require('../src/ai/agent-controller.ts');
const { createToolDispatcher } = require('../src/ai/dispatcher.ts');
const local = { name: 'lookup_medicine_reference', arguments: '{"medicine":"Amoxicillin"}' };
const online = { name: 'search_medicine_guidance', arguments: '{"medicine":"Amoxicillin","topic":"missed_dose"}' };
function model(responses) { return { countTokens: async () => 100, stop: async () => {}, generate: async (_, tools) => { const response = responses.shift(); assert(response); if (response.expectedTools !== undefined) assert.equal(tools, response.expectedTools); return { text: '', toolCalls: [], ...response }; } }; }
const index = '<a href="/medicines/amoxicillin/">Amoxicillin</a><a href="https://evil.test/">Amoxicillin</a>';
test('NHS lookup is permission gated and sends only allowlisted URLs without chat or credentials', async () => {
  const calls = [];
  const handlers = createMedicineReferenceHandlers(async (url, options) => {
    calls.push(url); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.body, undefined);
    return { ok: true, text: async () => url.endsWith('/medicines/') ? index : '<a href="https://www.nhs.uk/medicines/amoxicillin/how-and-when-to-take-amoxicillin/">How to take</a>' };
  });
  const agent = createAgentController(model([{ toolCalls: [local] }, { toolCalls: [online] }, { text: 'Read your leaflet.', expectedTools: false }]), handlers);
  await agent.send('Medicine safety question');
  assert.equal(calls.length, 0); assert.equal(agent.getSnapshot().phase, 'awaiting_confirmation');
  const id = agent.getSnapshot().review.id;
  await agent.confirm(id); assert.equal(calls.length, 3);
  assert(agent.getSnapshot().entries.some(entry => entry.content.includes('https://www.nhs.uk/medicines/amoxicillin/how-and-when')));
  await assert.rejects(agent.confirm(id));
});
test('only complete relevant safety sections are supplied; dosage and long sections are omitted', () => {
  const html = '<main><h2>Dosage</h2><p>Example 500 mg</p><h2>If you forget to take it</h2><p>Check your leaflet. Do not double doses.</p><h2>Other</h2><p>Unrelated</p></main>';
  assert(guidanceExcerpt(html, 'missed_dose').includes('Do not double'));
  assert(!guidanceExcerpt(html, 'missed_dose').includes('500'));
  assert.equal(guidanceExcerpt(html, 'food'), undefined);
  assert.equal(guidanceExcerpt('<h2>If you forget</h2>' + 'x'.repeat(2000), 'missed_dose'), undefined);
  assert.equal(guidanceExcerpt('<h2>If you forget</h2><p>Take 500 mg of this example drug.</p>', 'missed_dose'), undefined);
});
test('online lookup cannot bypass local lookup, cancellation or stop; stale consent fails', async () => {
  let calls = 0;
  const handlers = createMedicineReferenceHandlers(async () => { calls++; throw Error('No'); });
  const bypass = createAgentController(model([{ toolCalls: [online] }, { text: 'Clarify.', expectedTools: false }]), handlers);
  await bypass.send('Question'); assert.equal(calls, 0); assert.equal(bypass.getSnapshot().review, undefined);
  for (const operation of ['cancel', 'stop']) {
    const agent = createAgentController(model([{ toolCalls: [local] }, { toolCalls: [online] }, { text: 'Cancelled.', expectedTools: false }]), handlers);
    await agent.send('Question'); const id = agent.getSnapshot().review.id;
    if (operation === 'cancel') await agent.cancel(id); else await agent.stop();
    assert.equal(calls, 0); await assert.rejects(agent.confirm(id));
  }
});
test('offline, malformed names, ambiguous formulations and absent pages fail without dosing claims', async () => {
  let calls = 0;
  const handlers = createMedicineReferenceHandlers(async () => { calls++; throw Error('private details'); });
  assert.equal((await handlers.search_medicine_guidance({ medicine: 'Name 500mg', topic: 'food' })).error.code, 'VALIDATION_ERROR');
  assert.equal(calls, 0);
  const failure = await handlers.search_medicine_guidance({ medicine: 'Amoxicillin', topic: 'food' });
  assert.equal(failure.status, 'error'); assert(!JSON.stringify(failure).includes('private details'));
  const ambiguous = createMedicineReferenceHandlers(async () => ({ ok: true, text: async () => index + '<a href="/medicines/other/">Amoxicillin</a>' }));
  assert.equal((await ambiguous.search_medicine_guidance({ medicine: 'Amoxicillin', topic: 'food' })).error.code, 'NOT_FOUND');
  assert.equal(medicineLinks('<a href="//evil.test/medicines/name/">Name</a>').length, 0);
});
test('online permission is required even though the tool does not save records', async () => {
  let called = false;
  const dispatcher = createToolDispatcher({ search_medicine_guidance: async () => { called = true; throw Error(); } });
  const proposal = await dispatcher.propose(online.name, JSON.parse(online.arguments));
  assert.equal(proposal.kind, 'confirmation'); assert.equal(called, false);
  dispatcher.cancel(proposal.review.id); assert.equal(called, false);
});
test('online content cannot trigger writes and the next user turn needs fresh permission', async () => {
  let writes = 0;
  const handlers = createMedicineReferenceHandlers(async url => ({ ok: true, text: async () => url.endsWith('/medicines/') ? index : '<main>No dosing text</main>' }));
  handlers.log_blood_pressure = async () => { writes++; throw Error('Never execute'); };
  const agent = createAgentController(model([
    { toolCalls: [local] }, { toolCalls: [online] },
    { toolCalls: [{ name: 'log_blood_pressure', arguments: '{"systolic":120,"diastolic":80}' }], expectedTools: false },
    { toolCalls: [local] }, { toolCalls: [online] },
  ]), handlers);
  await agent.send('First'); const old = agent.getSnapshot().review.id; await agent.confirm(old);
  assert.equal(writes, 0); assert.equal(agent.getSnapshot().review, undefined);
  await agent.send('Second'); assert.notEqual(agent.getSnapshot().review.id, old);
  await assert.rejects(agent.confirm(old)); await agent.stop();
});
