const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const { todayOccurrences, scheduledInstant, localDate } = require('../src/features/medications/occurrences.ts');
const { reminderPlan, replaceReminders } = require('../src/features/medications/reminder-plan.ts');
const medicine = { id: '00000000-0000-4000-8000-000000000001', name: 'Synthetic medicine', strength_text: '10 mg', is_active: 1, instructions: 'Synthetic prescribed instruction' };
const schedule = { id: '00000000-0000-4000-8000-000000000002', medication_id: medicine.id, time_local: '08:00', days_of_week: '[0,1,2,3,4,5,6]', timezone: 'Asia/Manila', starts_on: null, ends_on: null, enabled: 1 };

test('today reminders use the schedule timezone and never infer intake or shift a late dose', () => {
  const now = new Date('2026-10-09T23:30:00Z');
  assert.equal(localDate(now, 'Asia/Manila'), '2026-10-10');
  const pending = todayOccurrences([medicine], [schedule], [], now)[0];
  assert.equal(pending.scheduled_for, '2026-10-10T00:00:00.000Z');
  assert.equal(pending.status, 'upcoming');
  const late = new Date('2026-10-10T03:00:00Z');
  assert.equal(todayOccurrences([medicine], [schedule], [], late)[0].status, 'not_recorded');
  const logged = { id: 'intake', medication_id: medicine.id, schedule_id: schedule.id, scheduled_for: '2026-10-10T00:00:00Z', status: 'taken', recorded_at: late.toISOString() };
  assert.equal(todayOccurrences([medicine], [schedule], [logged], late)[0].status, 'taken');
  assert.equal(todayOccurrences([medicine], [schedule], [logged], new Date('2026-10-11T03:00:00Z'))[0].status, 'not_recorded');
  assert.equal(schedule.time_local, '08:00');
  assert.equal(todayOccurrences([{ ...medicine, is_active: 0 }], [schedule], [], late).length, 0);
  assert.equal(todayOccurrences([medicine], [{ ...schedule, starts_on: '2026-10-11' }], [], late).length, 0);
  assert.equal(todayOccurrences([medicine], [{ ...schedule, ends_on: '2026-10-09' }], [], late).length, 0);
  assert.equal(scheduledInstant('2026-03-08', '02:30', 'America/New_York'), null);
});

test('reminder plans respect weekdays, boundaries, fixed timezones and queue limits', () => {
  const now = new Date('2026-10-10T01:00:00Z');
  const daily = reminderPlan([medicine], [schedule], 'Asia/Manila', now);
  assert.deepEqual(daily.plans[0].trigger, { type: 'daily', hour: 8, minute: 0 });
  const weekly = reminderPlan([medicine], [{ ...schedule, days_of_week: '[0,1]' }], 'Asia/Manila', now);
  assert.deepEqual(weekly.plans.map(p => p.trigger.weekday), [1, 2]);
  const bounded = reminderPlan([medicine], [{ ...schedule, ends_on: '2026-10-11' }], 'Asia/Manila', now);
  assert.equal(bounded.limited, true);
  assert.equal(bounded.plans.length, 1);
  assert.equal(bounded.plans[0].trigger.date.toISOString(), '2026-10-11T00:00:00.000Z');
  const abroad = reminderPlan([medicine], [schedule], 'UTC', now);
  assert.equal(abroad.plans[0].trigger.date.toISOString(), '2026-10-11T00:00:00.000Z');
  assert.equal(reminderPlan([{ ...medicine, end_date: '2026-10-09' }], [schedule], 'Asia/Manila', now).plans.length, 0);
  assert.throws(() => reminderPlan([medicine], Array.from({ length: 61 }, (_, i) => ({ ...schedule, id: String(i) })), 'Asia/Manila', now), /60/);
});

test('notification replacement cancels old app alerts and cleans failed setup without retry', async () => {
  const calls = [];
  const plans = reminderPlan([medicine], [schedule], 'Asia/Manila').plans;
  await replaceReminders({ list: async () => ['paalalay:old', 'unrelated'], cancel: async id => calls.push(['cancel', id]), schedule: async p => { calls.push(['schedule', p.identifier]); return p.identifier; } }, plans);
  assert.deepEqual(calls[0], ['cancel', 'paalalay:old']);
  assert.equal(calls.some(c => c[1] === 'unrelated'), false);
  const created = [];
  let attempted = 0;
  await assert.rejects(replaceReminders({ list: async () => [], cancel: async id => created.splice(created.indexOf(id), 1), schedule: async p => { if (++attempted === 2) throw new Error('Synthetic OS failure'); created.push(p.identifier); return p.identifier; } }, [...plans, { ...plans[0], identifier: 'paalalay:second' }]), /Synthetic OS/);
  assert.equal(attempted, 2);
  assert.deepEqual(created, []);
});

test('medicine edits and pauses preserve instructions, schedules and intake history in temporary SQLite', async () => {
  const { editMedicine, readManagement } = require('../src/features/medications/management-repository.ts');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paalalay-management-')), 'synthetic.db');
  const db = new DatabaseSync(file);
  try {
    db.exec(fs.readFileSync(path.resolve(__dirname, '../src/db/schema.sql'), 'utf8'));
    db.prepare('INSERT INTO medications (id,name,strength_text,instructions,source,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(medicine.id, medicine.name, medicine.strength_text, medicine.instructions, 'manual', 1, '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z');
    db.prepare('INSERT INTO medication_schedules (id,medication_id,time_local,days_of_week,timezone,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(schedule.id, medicine.id, '08:00', schedule.days_of_week, schedule.timezone, 1, '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z');
    db.prepare('INSERT INTO medication_intakes (id,medication_id,schedule_id,scheduled_for,status,recorded_at) VALUES (?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000003', medicine.id, schedule.id, '2026-10-10T00:00:00Z', 'skipped', '2026-10-10T01:00:00Z');
    const adapter = { getAllAsync: async (sql, args) => db.prepare(sql).all(...args), runAsync: async (sql, args) => db.prepare(sql).run(...args) };
    await assert.rejects(editMedicine(adapter, { id: medicine.id, name: '', strength_text: '10 mg', instructions: null, is_active: true }));
    await editMedicine(adapter, { id: medicine.id, name: "Synthetic ' edited", strength_text: '10 mg', instructions: 'As written on synthetic prescription', is_active: false });
    const data = await readManagement(adapter);
    assert.equal(data.medicines[0].is_active, 0);
    assert.equal(data.medicines[0].instructions, 'As written on synthetic prescription');
    assert.equal(data.intakes[0].status, 'skipped');
    assert.equal(data.schedules[0].time_local, '08:00');
    await editMedicine(adapter, { id: medicine.id, name: medicine.name, strength_text: medicine.strength_text, instructions: medicine.instructions, is_active: true });
    assert.equal((await readManagement(adapter)).intakes.length, 1);
  } finally { db.close(); }
});

test('native reminder adapter requests permissions on explicit enable and keeps notifications generic', async () => {
  const load = Module._load;
  const events = [];
  let allowed = false;
  Module._load = function(name, ...args) {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-notifications') return {
      AndroidImportance: { HIGH: 4 }, setNotificationHandler: () => events.push('handler'), setNotificationChannelAsync: async () => events.push('channel'),
      requestPermissionsAsync: async () => { events.push('permission'); return { granted: allowed }; },
      getAllScheduledNotificationsAsync: async () => [], cancelScheduledNotificationAsync: async () => {},
      scheduleNotificationAsync: async input => { assert.equal(input.content.title, 'PAALALAY'); assert.equal(input.content.body, 'Time for your reminder'); assert.equal(JSON.stringify(input.content).includes(medicine.name), false); events.push(input); return input.identifier; },
    };
    return load.call(this, name, ...args);
  };
  try {
    delete require.cache[require.resolve('../src/features/medications/native-reminders.ts')];
    const { enableReminders } = require('../src/features/medications/native-reminders.ts');
    await assert.rejects(enableReminders([medicine], [schedule]), /not allowed/);
    assert.deepEqual(events.slice(0, 3), ['handler', 'channel', 'permission']);
    assert.equal(events.filter(e => typeof e === 'object').length, 0);
    allowed = true;
    await enableReminders([medicine], [{ ...schedule, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }]);
    assert.equal(events.filter(e => typeof e === 'object').length, 1);
  } finally { Module._load = load; delete require.cache[require.resolve('../src/features/medications/native-reminders.ts')]; }
});
