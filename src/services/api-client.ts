import { Platform } from 'react-native';
import { SearchSpecialistsParams } from '@/features/doctors/types';
import { HealthSummaryParams } from '@/features/insights/types';

const isWeb = Platform.OS === 'web';

// 1. Medications APIs
export async function fetchMedications(activeOnly = true) {
  if (isWeb) {
    try {
      const res = await fetch(`/api/medications?active_only=${activeOnly}`);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const query = activeOnly
      ? 'SELECT * FROM medications WHERE is_active = 1 ORDER BY created_at DESC;'
      : 'SELECT * FROM medications ORDER BY created_at DESC;';
    const rows = await db.getAllAsync(query);
    return { status: 'success', data: { medications: rows } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch medications' } };
  }
}

export async function createMedication(data: {
  name: string;
  strength_text: string;
  dosage_form?: string;
  instructions?: string;
  start_date?: string;
  end_date?: string;
  source?: string;
}) {
  if (isWeb) {
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to create' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO medications (
        id, name, strength_text, dosage_form, instructions, source, start_date, end_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        id,
        data.name.trim(),
        data.strength_text.trim(),
        data.dosage_form || null,
        data.instructions || null,
        data.source || 'manual',
        data.start_date || null,
        data.end_date || null,
        now,
        now,
      ]
    );

    return { status: 'success', data: { medication_id: id, name: data.name, is_active: true } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to create medication' } };
  }
}

export async function fetchTodayMedications(dateStr?: string) {
  if (isWeb) {
    try {
      const url = dateStr ? `/api/medications/today?date=${dateStr}` : '/api/medications/today';
      const res = await fetch(url);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch today medications' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();

    const schedules: any[] = await db.getAllAsync(`
      SELECT ms.*, m.name as medication_name, m.strength_text, m.dosage_form 
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE m.is_active = 1 AND ms.enabled = 1
      ORDER BY ms.time_local ASC;
    `);

    const startOfDayUtc = `${targetDate}T00:00:00.000Z`;
    const endOfDayUtc = `${targetDate}T23:59:59.999Z`;
    const intakes: any[] = await db.getAllAsync(
      'SELECT * FROM medication_intakes WHERE scheduled_for >= ? AND scheduled_for <= ?;',
      [startOfDayUtc, endOfDayUtc]
    );

    const intakeMap = new Map<string, string>();
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
      if (s.starts_on && s.starts_on > targetDate) continue;
      if (s.ends_on && s.ends_on < targetDate) continue;

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

    return { status: 'success', data: { items } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch today medications' } };
  }
}

export async function setMedicationSchedule(data: {
  medication_id: string;
  times_local: string[];
  days_of_week?: number[];
  starts_on?: string;
  ends_on?: string;
  timezone?: string;
}) {
  if (isWeb) {
    try {
      const res = await fetch('/api/medications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to set schedule' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    await db.runAsync('DELETE FROM medication_schedules WHERE medication_id = ?;', [data.medication_id]);

    const now = new Date().toISOString();
    const daysStr = JSON.stringify(data.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
    const timezone = data.timezone || 'Asia/Manila';
    const scheduleIds: string[] = [];

    for (const timeLocal of data.times_local) {
      const scheduleId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      await db.runAsync(
        `INSERT INTO medication_schedules (
          id, medication_id, time_local, days_of_week, timezone, starts_on, ends_on, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          scheduleId,
          data.medication_id,
          timeLocal,
          daysStr,
          timezone,
          data.starts_on || null,
          data.ends_on || null,
          now,
          now,
        ]
      );
      scheduleIds.push(scheduleId);
    }

    return { status: 'success', data: { schedule_ids: scheduleIds, notifications_scheduled: scheduleIds.length } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to set schedule' } };
  }
}

export async function recordMedicationIntake(data: {
  medication_id: string;
  schedule_id: string;
  scheduled_for: string;
  status: 'taken' | 'skipped';
  notes?: string;
}) {
  if (isWeb) {
    try {
      const res = await fetch('/api/medications/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to record intake' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const intakeId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO medication_intakes (
        id, medication_id, schedule_id, scheduled_for, status, recorded_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(schedule_id, scheduled_for) DO UPDATE SET
        status = excluded.status,
        recorded_at = excluded.recorded_at,
        notes = excluded.notes;`,
      [
        intakeId,
        data.medication_id,
        data.schedule_id,
        data.scheduled_for,
        data.status,
        now,
        data.notes || null,
      ]
    );

    return { status: 'success', data: { intake_id: intakeId, status: data.status, recorded_at: now } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to record intake' } };
  }
}

// 2. Health Logs APIs
export async function logHealthMeasurement(data: {
  log_type: 'blood_pressure' | 'blood_sugar' | 'temperature' | 'weight' | 'symptom';
  systolic?: number;
  diastolic?: number;
  pulse_bpm?: number;
  glucose_value?: number;
  glucose_unit?: string;
  glucose_context?: string;
  temperature_c?: number;
  weight_kg?: number;
  symptom_name?: string;
  symptom_severity?: number;
  notes?: string;
  recorded_at?: string;
}) {
  if (isWeb) {
    try {
      const endpoint = `/api/health-logs/${data.log_type.replace('_', '-')}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to log measurement' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const logId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const now = new Date().toISOString();
    const recordedAt = data.recorded_at || now;

    await db.runAsync(
      `INSERT INTO health_logs (
        id, log_type, systolic, diastolic, pulse_bpm, glucose_value, glucose_unit,
        glucose_context, temperature_c, weight_kg, symptom_name, symptom_severity,
        notes, recorded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        logId,
        data.log_type,
        data.systolic || null,
        data.diastolic || null,
        data.pulse_bpm || null,
        data.glucose_value || null,
        data.glucose_unit || null,
        data.glucose_context || null,
        data.temperature_c || null,
        data.weight_kg || null,
        data.symptom_name || null,
        data.symptom_severity || null,
        data.notes || null,
        recordedAt,
        now,
      ]
    );

    return { status: 'success', data: { log_id: logId, log_type: data.log_type, recorded_at: recordedAt } };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to log health measurement' } };
  }
}

export async function fetchHealthHistory(params?: {
  log_type?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  if (isWeb) {
    try {
      const queryParts: string[] = [];
      if (params?.log_type) queryParts.push(`log_type=${params.log_type}`);
      if (params?.from) queryParts.push(`from=${params.from}`);
      if (params?.to) queryParts.push(`to=${params.to}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      const res = await fetch(`/api/health-logs/history${qs}`);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch history' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (params?.log_type) {
      conditions.push('log_type = ?');
      queryParams.push(params.log_type);
    }
    if (params?.from) {
      conditions.push('recorded_at >= ?');
      queryParams.push(`${params.from}T00:00:00.000Z`);
    }
    if (params?.to) {
      conditions.push('recorded_at <= ?');
      queryParams.push(`${params.to}T23:59:59.999Z`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    queryParams.push(params?.limit || 50);

    const rows: any[] = await db.getAllAsync(
      `SELECT * FROM health_logs ${whereClause} ORDER BY recorded_at DESC LIMIT ?;`,
      queryParams
    );

    return {
      status: 'success',
      data: {
        logs: rows.map((r) => ({
          id: r.id,
          log_type: r.log_type,
          recorded_at: r.recorded_at,
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse_bpm: r.pulse_bpm,
          glucose_value: r.glucose_value,
          glucose_unit: r.glucose_unit,
          glucose_context: r.glucose_context,
          temperature_c: r.temperature_c,
          weight_kg: r.weight_kg,
          symptom_name: r.symptom_name,
          symptom_severity: r.symptom_severity,
          notes: r.notes,
        })),
      },
    };
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch health history' } };
  }
}

// 3. Dev 3 Insights & Directory APIs
export async function getHealthSummary(params: HealthSummaryParams) {
  if (isWeb) {
    try {
      const queryParts: string[] = [`from=${params.from}`, `to=${params.to}`];
      if (params.log_type) queryParts.push(`log_type=${params.log_type}`);
      const res = await fetch(`/api/insights/summary?${queryParts.join('&')}`);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch health summary' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const { InsightsService } = await import('@/features/insights/insights.service');
    return await InsightsService.getHealthSummary(db, params);
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to calculate health summary' } };
  }
}

export async function searchSpecialists(params: SearchSpecialistsParams) {
  if (isWeb) {
    try {
      const queryParts: string[] = [`specialty=${encodeURIComponent(params.specialty)}`];
      if (params.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      const res = await fetch(`/api/specialists?${queryParts.join('&')}`);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to search specialists' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const { DoctorsService } = await import('@/features/doctors/doctors.service');
    return await DoctorsService.searchSpecialists(db, params);
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to search specialists' } };
  }
}

export async function fetchDoctors(params?: { specialty?: string; city?: string; limit?: number }) {
  if (isWeb) {
    try {
      const queryParts: string[] = [];
      if (params?.specialty) queryParts.push(`specialty=${encodeURIComponent(params.specialty)}`);
      if (params?.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const res = await fetch(`/api/doctors${qs}`);
      return await res.json();
    } catch (err: any) {
      return { status: 'error', error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch doctors' } };
    }
  }

  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const { DoctorsService } = await import('@/features/doctors/doctors.service');
    return await DoctorsService.listAllDoctors(db, params?.limit || 30);
  } catch (err: any) {
    return { status: 'error', error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch doctors' } };
  }
}
