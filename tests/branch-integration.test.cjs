const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');

test('merged API writes validate inputs, retain IDs/history, and reads never seed', async () => {
  const databasePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paalalay-integration-')), 'synthetic.db');
  const previousPath = process.env.PAALALAY_DB_PATH;
  process.env.PAALALAY_DB_PATH = databasePath;
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function(name, ...args) {
    if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
    return resolve.call(this, name, ...args);
  };
  const { closeServerDatabase } = require('../src/db/server-db.ts');
  const post = (body) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  try {
    // A missing file must not be created merely by opening a read endpoint.
    const directory = require('../src/app/api/doctors+api.ts');
    assert.equal((await directory.GET(new Request('http://localhost/api/doctors'))).status, 500);
    assert.equal(fs.existsSync(databasePath), false);
    const db = new DatabaseSync(databasePath);
    db.exec(fs.readFileSync(path.resolve(__dirname, '../src/db/schema.sql'), 'utf8'));
    db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(1, '001_initial_baseline_schema', '2026-10-10T00:00:00Z');
    const meds = require('../src/app/api/medications+api.ts');
    for (const invalid of [null, {}, { name: 'Synthetic', strength_text: '' }]) {
      assert.equal((await meds.POST(post(invalid))).status, 400);
    }
    const created = await (await meds.POST(post({ name: "Synthetic quote ' medication", strength_text: '10 mg' }))).json();
    assert.equal(created.status, 'success');
    const listed = await (await meds.GET(new Request('http://localhost/api/medications'))).json();
    assert.equal(listed.data.medications[0].is_active, true);
    const schedule = require('../src/app/api/medications/schedule+api.ts');
    assert.equal((await schedule.POST(post({ medication_id: created.data.medication_id, times_local: ['25:00'] }))).status, 400);
    const scheduled = await (await schedule.POST(post({ medication_id: created.data.medication_id, times_local: ['09:00'] }))).json();
    assert.equal(scheduled.data.notifications_scheduled, 0);
    const intake = require('../src/app/api/medications/intake+api.ts');
    const occurrence = { medication_id: created.data.medication_id, schedule_id: scheduled.data.schedule_ids[0], scheduled_for: '2026-10-10T01:00:00Z', status: 'taken' };
    const taken = await (await intake.POST(post(occurrence))).json();
    const skipped = await (await intake.POST(post({ ...occurrence, status: 'skipped' }))).json();
    assert.equal(skipped.data.intake_id, taken.data.intake_id);
    const reformatted = await (await intake.POST(post({ ...occurrence, scheduled_for: '2026-10-10T01:00:00.000Z' }))).json();
    assert.equal(reformatted.data.intake_id, taken.data.intake_id);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM medication_intakes').get().count, 1);
    assert.equal((await intake.POST(post({ ...occurrence, medication_id: '00000000-0000-4000-8000-000000000099' }))).status, 400);
    assert.equal(db.prepare('SELECT id FROM medication_intakes').get().id, skipped.data.intake_id);
    const replacement = await (await schedule.POST(post({ medication_id: created.data.medication_id, times_local: ['10:00'] }))).json();
    assert.equal(replacement.status, 'success');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM medication_intakes').get().count, 1);
    assert.equal(db.prepare('SELECT enabled FROM medication_schedules WHERE id = ?').get(occurrence.schedule_id).enabled, 0);
    // Fail after disabling old schedules: the replacement must roll back completely.
    db.exec("CREATE TRIGGER synthetic_schedule_failure BEFORE INSERT ON medication_schedules WHEN NEW.time_local = '11:00' BEGIN SELECT RAISE(ABORT, 'Synthetic schedule failure'); END");
    const failedReplacement = await schedule.POST(post({ medication_id: created.data.medication_id, times_local: ['10:30', '11:00'] }));
    assert.equal(failedReplacement.status, 500);
    assert.equal(db.prepare('SELECT enabled FROM medication_schedules WHERE id = ?').get(replacement.data.schedule_ids[0]).enabled, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM medication_schedules').get().count, 2);
    db.exec('DROP TRIGGER synthetic_schedule_failure');
    const manager = require('../src/app/api/medications/manage+api.ts');
    assert.equal((await manager.PUT(post(null))).status, 400);
    const edit = { id: created.data.medication_id, name: 'Synthetic edited medicine', strength_text: '10 mg', instructions: 'Synthetic pharmacist instructions', is_active: false };
    assert.equal((await manager.PUT(post(edit))).status, 200);
    const management = await (await manager.GET()).json();
    assert.equal(management.data.medicines[0].is_active, 0);
    assert.equal(management.data.medicines[0].instructions, edit.instructions);
    assert.equal(management.data.intakes.length, 1);
    assert.equal(management.data.schedules.length, 1);
    assert.equal((await manager.PUT(post({ ...edit, is_active: true }))).status, 200);
    const samples = [
      ['blood-pressure', { systolic: 120, diastolic: 80 }],
      ['blood-sugar', { value: 90, unit: 'mg_dL' }],
      ['temperature', { value_c: 0 }], ['weight', { value_kg: 60 }], ['symptom', { symptom: 'Synthetic symptom' }],
    ];
    for (const [route, args] of samples) {
      const endpoint = require(`../src/app/api/health-logs/${route}+api.ts`);
      assert.equal((await endpoint.POST(post(null))).status, 400);
      const result = await (await endpoint.POST(post({ ...args, recorded_at: '2026-10-10T01:00:00Z' }))).json();
      assert.equal(result.status, 'success');
      assert.match(result.data.log_id, /^[0-9a-f-]{36}$/);
    }
    const bp = require('../src/app/api/health-logs/blood-pressure+api.ts');
    assert.equal((await bp.POST(post({ systolic: -1, diastolic: 80 }))).status, 400);
    const history = require('../src/app/api/health-logs/history+api.ts');
    const logs = await (await history.GET(new Request('http://localhost/api/health-logs/history'))).json();
    assert.equal(logs.data.logs.length, 5);
    assert.equal(logs.data.logs.find(row => row.log_type === 'temperature').values.value_c, 0);
    const summary = require('../src/app/api/insights/summary+api.ts');
    const result = await (await summary.GET(new Request('http://localhost/api/insights/summary?from=2026-10-10&to=2026-10-10'))).json();
    assert.equal(result.data.counts.total, 5);
    const doctors = await (await directory.GET(new Request('http://localhost/api/doctors'))).json();
    assert.deepEqual(doctors.data.doctors, []);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM doctors').get().count, 0);
    const { doctorService } = require('../src/features/doctors/service/doctor.service.ts');
    const readAdapter = { getAllAsync: async (sql, params) => db.prepare(sql).all(...params) };
    assert.equal((await doctorService.searchSpecialists({}, readAdapter)).error.code, 'VALIDATION_ERROR');
    assert.equal((await doctorService.searchSpecialists({ specialty: 'Cardiology', limit: 31 }, readAdapter)).error.code, 'VALIDATION_ERROR');
    db.prepare('INSERT INTO doctors (id, doctor_name, specialty, facility_name, address, city) VALUES (?, ?, ?, ?, ?, ?)').run('00000000-0000-4000-8000-000000000001', 'Synthetic placeholder', 'Cardiology', 'Synthetic clinic', 'Synthetic address', 'Pasig');
    const searched = await doctorService.searchSpecialists({ specialty: 'cardiology', city: 'pasig' }, readAdapter);
    assert.equal(searched.data.results.length, 1);
    assert.equal((await doctorService.searchSpecialists({ specialty: 'cardiology', city: 'Cebu' }, readAdapter)).data.results.length, 0);
    const details = await doctorService.searchDoctorsWithDetails({ specialty: 'cardiology' }, readAdapter);
    assert.equal(details.data.doctors[0].verified_at, null);
    db.close();
    closeServerDatabase();
    const reopened = new DatabaseSync(databasePath, { readOnly: true });
    assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM health_logs').get().count, 5);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 1);
    reopened.close();
  } finally {
    closeServerDatabase();
    Module._resolveFilename = resolve;
    if (previousPath === undefined) delete process.env.PAALALAY_DB_PATH;
    else process.env.PAALALAY_DB_PATH = previousPath;
  }
});

test('OCR adapter accepts local files, requires editable review, and returns native failures', async () => {
  const load = Module._load;
  const resolve = Module._resolveFilename;
  let fail = false;
  let calls = 0;
  Module._resolveFilename = function(name, ...args) {
    if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
    return resolve.call(this, name, ...args);
  };
  Module._load = function(name, ...args) {
    if (name === 'rn-mlkit-ocr') return { recognizeText: async () => {
      calls++;
      if (fail) throw new Error('Synthetic native failure');
      return { text: 'Synthetic Medicine 10 mg\nTake as instructed', blocks: [{ text: 'Synthetic Medicine 10 mg' }] };
    } };
    return load.call(this, name, ...args);
  };
  try {
    const ocr = require('../src/features/ocr/services/ocrService.ts');
    const remote = await ocr.extractPrescriptionText({ image_uri: 'https://example.com/prescription.jpg' });
    assert.equal(remote.error.code, 'VALIDATION_ERROR');
    assert.equal(calls, 0);
    const recognized = await ocr.extractPrescriptionText({ image_uri: 'file:///synthetic.jpg' });
    assert.equal(recognized.data.requires_manual_review, true);
    const handoff = ocr.buildMedicationHandoff(recognized.data.raw_text);
    assert.equal(handoff.requires_manual_review, true);
    assert.equal(handoff.parsedHints.suggestedStrength, '10 mg');
    fail = true;
    assert.equal((await ocr.extractPrescriptionText({ image_uri: 'file:///synthetic.jpg' })).error.code, 'INTERNAL_ERROR');
  } finally { Module._load = load; Module._resolveFilename = resolve; }
});

test('manual health forms translate to frozen API arguments without guessed fields', async () => {
  const { measurementInput } = require('../src/features/health/measurement-input.ts');
  const mapped = measurementInput({ log_type: 'blood_sugar', glucose_value: 90, glucose_unit: 'mg_dL' });
  assert.equal(mapped.success, true);
  assert.deepEqual(JSON.parse(JSON.stringify(mapped.args)), { value: 90, unit: 'mg_dL' });
  assert.equal(measurementInput({ log_type: 'blood_pressure', systolic: -1, diastolic: 80 }).success, false);
  assert.equal(measurementInput({ log_type: 'toString' }).success, false);
  assert.equal(measurementInput({ log_type: 'temperature', temperature_c: 0 }).args.value_c, 0);
  const load = Module._load;
  const originalFetch = global.fetch;
  let payload;
  Module._load = function(name, ...args) {
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    return load.call(this, name, ...args);
  };
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return Response.json({ status: 'success', data: {} });
  };
  try {
    const api = require('../src/services/api-client.ts');
    await api.logHealthMeasurement({ log_type: 'blood_sugar', glucose_value: 90, glucose_unit: 'mg_dL' });
    assert.deepEqual(payload, { value: 90, unit: 'mg_dL' });
    const result = await api.createMedication({ name: 'Synthetic', strength_text: '' });
    assert.equal(result.error.code, 'VALIDATION_ERROR');
  } finally { Module._load = load; global.fetch = originalFetch; }
});
