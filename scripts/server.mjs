import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3000;
const DB_FILE = join(process.cwd(), 'paalalay.db');

// Ensure database and tables exist
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON;');

const schemaFile = join(process.cwd(), 'src/db/schema.sql');
if (existsSync(schemaFile)) {
  const sql = readFileSync(schemaFile, 'utf8');
  db.exec(sql);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // 1. GET /api/medications
  if (method === 'GET' && pathname === '/api/medications') {
    const activeOnly = url.searchParams.get('active_only') !== 'false';
    const query = activeOnly
      ? 'SELECT * FROM medications WHERE is_active = 1 ORDER BY created_at DESC;'
      : 'SELECT * FROM medications ORDER BY created_at DESC;';
    const rows = db.prepare(query).all();
    return jsonResponse(res, 200, {
      status: 'success',
      data: {
        medications: rows.map((m) => ({
          id: m.id,
          name: m.name,
          strength_text: m.strength_text,
          dosage_form: m.dosage_form,
          instructions: m.instructions,
          source: m.source,
          is_active: m.is_active === 1,
          created_at: m.created_at,
          updated_at: m.updated_at,
        })),
      },
    });
  }

  // 2. POST /api/medications
  if (method === 'POST' && pathname === '/api/medications') {
    const body = await parseBody(req);
    if (!body || !body.name || !body.strength_text) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'Name and strength_text are required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO medications (id, name, strength_text, dosage_form, instructions, source, start_date, end_date, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      id,
      body.name,
      body.strength_text,
      body.dosage_form || null,
      body.instructions || null,
      body.source || 'manual',
      body.start_date || null,
      body.end_date || null,
      1,
      now,
      now
    );

    return jsonResponse(res, 201, {
      status: 'success',
      data: { medication_id: id, name: body.name, is_active: true },
    });
  }

  // 3. GET /api/medications/today
  if (method === 'GET' && pathname === '/api/medications/today') {
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();

    const schedules = db.prepare(`
      SELECT ms.* FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE m.is_active = 1 AND ms.enabled = 1;
    `).all();

    const items = [];
    for (const s of schedules) {
      let days = [0, 1, 2, 3, 4, 5, 6];
      try {
        days = JSON.parse(s.days_of_week);
      } catch {}
      if (!days.includes(dayOfWeek)) continue;
      items.push({
        medication_id: s.medication_id,
        schedule_id: s.id,
        time_local: s.time_local,
        status: 'pending',
      });
    }

    return jsonResponse(res, 200, { status: 'success', data: { items } });
  }

  // 4. POST /api/medications/schedule
  if (method === 'POST' && pathname === '/api/medications/schedule') {
    const body = await parseBody(req);
    if (!body || !body.medication_id || !Array.isArray(body.times_local)) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'medication_id and times_local array required' },
      });
    }

    db.prepare('DELETE FROM medication_schedules WHERE medication_id = ?;').run(body.medication_id);

    const now = new Date().toISOString();
    const daysStr = JSON.stringify(body.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
    const scheduleIds = [];

    for (const timeLocal of body.times_local) {
      const scheduleId = generateUUID();
      db.prepare(`
        INSERT INTO medication_schedules (id, medication_id, time_local, days_of_week, timezone, starts_on, ends_on, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
      `).run(scheduleId, body.medication_id, timeLocal, daysStr, body.timezone || 'Asia/Manila', body.starts_on || null, body.ends_on || null, now, now);
      scheduleIds.push(scheduleId);
    }

    return jsonResponse(res, 200, {
      status: 'success',
      data: { schedule_ids: scheduleIds, notifications_scheduled: scheduleIds.length },
    });
  }

  // 5. POST /api/medications/intake
  if (method === 'POST' && pathname === '/api/medications/intake') {
    const body = await parseBody(req);
    if (!body || !body.medication_id || !body.schedule_id || !body.scheduled_for || !body.status) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'Missing required intake fields' },
      });
    }

    const intakeId = generateUUID();
    const recordedAt = body.recorded_at || new Date().toISOString();

    db.prepare(`
      INSERT INTO medication_intakes (id, medication_id, schedule_id, scheduled_for, status, recorded_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(schedule_id, scheduled_for) DO UPDATE SET
        status = excluded.status,
        recorded_at = excluded.recorded_at,
        notes = excluded.notes;
    `).run(intakeId, body.medication_id, body.schedule_id, body.scheduled_for, body.status, recordedAt, body.notes || null);

    return jsonResponse(res, 200, {
      status: 'success',
      data: { intake_id: intakeId, status: body.status, recorded_at: recordedAt },
    });
  }

  // 6. GET /api/medications/history
  if (method === 'GET' && pathname === '/api/medications/history') {
    const medId = url.searchParams.get('medication_id');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const rows = medId
      ? db.prepare('SELECT * FROM medication_intakes WHERE medication_id = ? ORDER BY scheduled_for DESC LIMIT ?;').all(medId, limit)
      : db.prepare('SELECT * FROM medication_intakes ORDER BY scheduled_for DESC LIMIT ?;').all(limit);

    return jsonResponse(res, 200, {
      status: 'success',
      data: {
        events: rows.map((r) => ({
          intake_id: r.id,
          medication_id: r.medication_id,
          scheduled_for: r.scheduled_for,
          status: r.status,
        })),
      },
    });
  }

  // 7. POST /api/health-logs/blood-pressure
  if (method === 'POST' && pathname === '/api/health-logs/blood-pressure') {
    const body = await parseBody(req);
    if (!body || body.systolic == null || body.diastolic == null) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'systolic and diastolic are required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (id, log_type, systolic, diastolic, pulse_bpm, notes, recorded_at, created_at)
      VALUES (?, 'blood_pressure', ?, ?, ?, ?, ?, ?);
    `).run(id, body.systolic, body.diastolic, body.pulse_bpm || null, body.notes || null, recordedAt, now);

    return jsonResponse(res, 201, {
      status: 'success',
      data: { log_id: id, log_type: 'blood_pressure', recorded_at: recordedAt },
    });
  }

  // 8. POST /api/health-logs/blood-sugar
  if (method === 'POST' && pathname === '/api/health-logs/blood-sugar') {
    const body = await parseBody(req);
    if (!body || body.value == null || !body.unit) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'value and unit are required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (id, log_type, glucose_value, glucose_unit, glucose_context, notes, recorded_at, created_at)
      VALUES (?, 'blood_sugar', ?, ?, ?, ?, ?, ?);
    `).run(id, body.value, body.unit, body.context || null, body.notes || null, recordedAt, now);

    return jsonResponse(res, 201, {
      status: 'success',
      data: { log_id: id, log_type: 'blood_sugar', recorded_at: recordedAt },
    });
  }

  // 9. POST /api/health-logs/temperature
  if (method === 'POST' && pathname === '/api/health-logs/temperature') {
    const body = await parseBody(req);
    if (!body || body.value_c == null) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'value_c is required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (id, log_type, temperature_c, notes, recorded_at, created_at)
      VALUES (?, 'temperature', ?, ?, ?, ?);
    `).run(id, body.value_c, body.notes || null, recordedAt, now);

    return jsonResponse(res, 201, {
      status: 'success',
      data: { log_id: id, log_type: 'temperature', recorded_at: recordedAt },
    });
  }

  // 10. POST /api/health-logs/weight
  if (method === 'POST' && pathname === '/api/health-logs/weight') {
    const body = await parseBody(req);
    if (!body || body.value_kg == null) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'value_kg is required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (id, log_type, weight_kg, notes, recorded_at, created_at)
      VALUES (?, 'weight', ?, ?, ?, ?);
    `).run(id, body.value_kg, body.notes || null, recordedAt, now);

    return jsonResponse(res, 201, {
      status: 'success',
      data: { log_id: id, log_type: 'weight', recorded_at: recordedAt },
    });
  }

  // 11. POST /api/health-logs/symptom
  if (method === 'POST' && pathname === '/api/health-logs/symptom') {
    const body = await parseBody(req);
    if (!body || !body.symptom) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'symptom is required' },
      });
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (id, log_type, symptom_name, symptom_severity, notes, recorded_at, created_at)
      VALUES (?, 'symptom', ?, ?, ?, ?, ?);
    `).run(id, body.symptom, body.severity || null, body.notes || null, recordedAt, now);

    return jsonResponse(res, 201, {
      status: 'success',
      data: { log_id: id, log_type: 'symptom', recorded_at: recordedAt },
    });
  }

  // 12. GET /api/health-logs/history
  if (method === 'GET' && pathname === '/api/health-logs/history') {
    const logType = url.searchParams.get('log_type');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const rows = logType
      ? db.prepare('SELECT * FROM health_logs WHERE log_type = ? ORDER BY recorded_at DESC LIMIT ?;').all(logType, limit)
      : db.prepare('SELECT * FROM health_logs ORDER BY recorded_at DESC LIMIT ?;').all(limit);

    return jsonResponse(res, 200, {
      status: 'success',
      data: {
        logs: rows.map((r) => ({
          id: r.id,
          log_type: r.log_type,
          recorded_at: r.recorded_at,
          values: {
            systolic: r.systolic,
            diastolic: r.diastolic,
            pulse_bpm: r.pulse_bpm,
            value: r.glucose_value,
            unit: r.glucose_unit,
            context: r.glucose_context,
            value_c: r.temperature_c,
            value_kg: r.weight_kg,
            symptom: r.symptom_name,
            severity: r.symptom_severity,
            notes: r.notes,
          },
        })),
      },
    });
  }

  return jsonResponse(res, 404, {
    status: 'error',
    error: { code: 'NOT_FOUND', message: `Route ${method} ${pathname} not found` },
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Dev API Server running on http://localhost:${PORT}`);
});
