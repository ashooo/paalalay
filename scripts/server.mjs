import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3000;
const DB_FILE = process.env.PAALALAY_DB_PATH || join(process.cwd(), 'paalalay.db');
if (!existsSync(DB_FILE)) throw new Error('Database missing. Explicit setup is required; server startup never initializes or seeds data.');

const db = new DatabaseSync(DB_FILE);
if (!db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get()) throw new Error('Database schema is out of sync; explicit setup required.');

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
      SELECT ms.*, m.name as medication_name, m.strength_text, m.dosage_form
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE m.is_active = 1 AND ms.enabled = 1;
    `).all();

    const startOfDayUtc = `${targetDate}T00:00:00.000Z`;
    const endOfDayUtc = `${targetDate}T23:59:59.999Z`;
    const intakes = db.prepare(
      'SELECT * FROM medication_intakes WHERE scheduled_for >= ? AND scheduled_for <= ?;'
    ).all(startOfDayUtc, endOfDayUtc);

    const intakeMap = new Map();
    for (const intake of intakes) {
      if (intake.schedule_id) {
        intakeMap.set(intake.schedule_id, intake.status);
      }
    }

    const items = [];
    for (const s of schedules) {
      let days = [0, 1, 2, 3, 4, 5, 6];
      try {
        days = JSON.parse(s.days_of_week);
      } catch {}
      if (!days.includes(dayOfWeek)) continue;
      const status = intakeMap.get(s.id) || 'pending';
      items.push({
        medication_id: s.medication_id,
        medication_name: s.medication_name,
        strength_text: s.strength_text,
        dosage_form: s.dosage_form,
        schedule_id: s.id,
        time_local: s.time_local,
        status,
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

    const scheduleIds = [];
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE medication_schedules SET enabled = 0 WHERE medication_id = ?;').run(body.medication_id);

      const now = new Date().toISOString();
      const daysStr = JSON.stringify(body.days_of_week || [0, 1, 2, 3, 4, 5, 6]);

      for (const timeLocal of body.times_local) {
        const scheduleId = generateUUID();
        db.prepare(`
          INSERT INTO medication_schedules (id, medication_id, time_local, days_of_week, timezone, starts_on, ends_on, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
        `).run(scheduleId, body.medication_id, timeLocal, daysStr, body.timezone || 'Asia/Manila', body.starts_on || null, body.ends_on || null, now, now);
        scheduleIds.push(scheduleId);
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return jsonResponse(res, 200, {
      status: 'success',
      data: { schedule_ids: scheduleIds, notifications_scheduled: 0 },
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
      data: { intake_id: db.prepare('SELECT id FROM medication_intakes WHERE schedule_id = ? AND scheduled_for = ?').get(body.schedule_id, body.scheduled_for).id, status: body.status, recorded_at: recordedAt },
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

  // 13. GET /api/insights/summary or /api/health-summary
  if (method === 'GET' && (pathname === '/api/insights/summary' || pathname === '/api/health-summary')) {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const logType = url.searchParams.get('log_type');

    if (!from || !to) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'from and to date parameters (YYYY-MM-DD) are required' },
      });
    }

    const fromUtc = `${from}T00:00:00.000Z`;
    const toUtc = `${to}T23:59:59.999Z`;

    const countClauses = ['recorded_at >= ?', 'recorded_at <= ?'];
    const countParams = [fromUtc, toUtc];
    if (logType) {
      countClauses.push('log_type = ?');
      countParams.push(logType);
    }

    const countRows = db.prepare(`
      SELECT log_type, COUNT(*) as count
      FROM health_logs
      WHERE ${countClauses.join(' AND ')}
      GROUP BY log_type;
    `).all(...countParams);

    const counts = { blood_pressure: 0, blood_sugar: 0, temperature: 0, weight: 0, symptom: 0, total: 0 };
    for (const r of countRows) {
      if (r.log_type in counts) {
        counts[r.log_type] = Number(r.count);
        counts.total += Number(r.count);
      }
    }

    const types = logType ? [logType] : ['blood_pressure', 'blood_sugar', 'temperature', 'weight', 'symptom'];
    const latest_readings = { blood_pressure: null, blood_sugar: null, temperature: null, weight: null, symptom: null };

    for (const type of types) {
      const row = db.prepare(`
        SELECT * FROM health_logs
        WHERE log_type = ? AND recorded_at >= ? AND recorded_at <= ?
        ORDER BY recorded_at DESC LIMIT 1;
      `).get(type, fromUtc, toUtc);

      if (row) {
        if (type === 'blood_pressure') {
          latest_readings.blood_pressure = { systolic: row.systolic, diastolic: row.diastolic, pulse_bpm: row.pulse_bpm, recorded_at: row.recorded_at };
        } else if (type === 'blood_sugar') {
          latest_readings.blood_sugar = { glucose_value: row.glucose_value, glucose_unit: row.glucose_unit || 'mg_dL', glucose_context: row.glucose_context, recorded_at: row.recorded_at };
        } else if (type === 'temperature') {
          latest_readings.temperature = { temperature_c: row.temperature_c, recorded_at: row.recorded_at };
        } else if (type === 'weight') {
          latest_readings.weight = { weight_kg: row.weight_kg, recorded_at: row.recorded_at };
        } else if (type === 'symptom') {
          latest_readings.symptom = { symptom_name: row.symptom_name, symptom_severity: row.symptom_severity, recorded_at: row.recorded_at };
        }
      }
    }

    const intakes = db.prepare(`SELECT status FROM medication_intakes WHERE scheduled_for >= ? AND scheduled_for <= ?;`).all(fromUtc, toUtc);
    let takenCount = 0;
    let skippedCount = 0;
    for (const intake of intakes) {
      if (intake.status === 'taken') takenCount++;
      if (intake.status === 'skipped') skippedCount++;
    }
    const scheduledCount = intakes.length;
    const adherenceRate = scheduledCount > 0 ? Number((takenCount / scheduledCount).toFixed(3)) : 1.0;

    return jsonResponse(res, 200, {
      status: 'success',
      data: {
        counts,
        latest_readings,
        medication_adherence: {
          scheduled_count: scheduledCount,
          taken_count: takenCount,
          skipped_count: skippedCount,
          adherence_rate: adherenceRate,
        },
      },
    });
  }

  // 14. GET /api/specialists or /api/doctors
  if (method === 'GET' && (pathname === '/api/specialists' || pathname === '/api/doctors')) {
    const specialty = url.searchParams.get('specialty');
    const city = url.searchParams.get('city');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 50);

    if (pathname === '/api/specialists' && (!specialty || !specialty.trim())) {
      return jsonResponse(res, 400, {
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'specialty parameter is required' },
      });
    }

    const conditions = [];
    const params = [];
    if (specialty && specialty.trim()) {
      conditions.push('specialty LIKE ?');
      params.push(`%${specialty.trim()}%`);
    }
    if (city && city.trim()) {
      conditions.push('city LIKE ?');
      params.push(`%${city.trim()}%`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const rows = db.prepare(`
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      ${whereClause}
      ORDER BY city ASC, facility_name ASC
      LIMIT ?;
    `).all(...params);

    return jsonResponse(res, 200, {
      status: 'success',
      data: {
        results: rows,
        doctors: rows,
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
