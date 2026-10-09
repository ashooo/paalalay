import { getDb } from '@/db/server-db';

function calculateSummary(db: any, fromDate: string, toDate: string, filterLogType?: string | null) {
  const fromUtc = `${fromDate}T00:00:00.000Z`;
  const toUtc = `${toDate}T23:59:59.999Z`;

  // 1. Health Log Counts
  const countClauses = ['recorded_at >= ?', 'recorded_at <= ?'];
  const countParams: any[] = [fromUtc, toUtc];

  if (filterLogType) {
    countClauses.push('log_type = ?');
    countParams.push(filterLogType);
  }

  const countRows = db.prepare(`
    SELECT log_type, COUNT(*) as count
    FROM health_logs
    WHERE ${countClauses.join(' AND ')}
    GROUP BY log_type;
  `).all(...countParams);

  const counts: Record<string, number> = {
    blood_pressure: 0,
    blood_sugar: 0,
    temperature: 0,
    weight: 0,
    symptom: 0,
    total: 0,
  };

  for (const r of countRows) {
    if (r.log_type in counts) {
      counts[r.log_type] = Number(r.count);
      counts.total += Number(r.count);
    }
  }

  // 2. Latest Readings
  const types = filterLogType
    ? [filterLogType]
    : ['blood_pressure', 'blood_sugar', 'temperature', 'weight', 'symptom'];

  const latest_readings: Record<string, any> = {
    blood_pressure: null,
    blood_sugar: null,
    temperature: null,
    weight: null,
    symptom: null,
  };

  for (const type of types) {
    const row = db.prepare(`
      SELECT * FROM health_logs
      WHERE log_type = ? AND recorded_at >= ? AND recorded_at <= ?
      ORDER BY recorded_at DESC LIMIT 1;
    `).get(type, fromUtc, toUtc);

    if (row) {
      if (type === 'blood_pressure') {
        latest_readings.blood_pressure = {
          systolic: row.systolic,
          diastolic: row.diastolic,
          pulse_bpm: row.pulse_bpm,
          recorded_at: row.recorded_at,
        };
      } else if (type === 'blood_sugar') {
        latest_readings.blood_sugar = {
          glucose_value: row.glucose_value,
          glucose_unit: row.glucose_unit || 'mg_dL',
          glucose_context: row.glucose_context,
          recorded_at: row.recorded_at,
        };
      } else if (type === 'temperature') {
        latest_readings.temperature = {
          temperature_c: row.temperature_c,
          recorded_at: row.recorded_at,
        };
      } else if (type === 'weight') {
        latest_readings.weight = {
          weight_kg: row.weight_kg,
          recorded_at: row.recorded_at,
        };
      } else if (type === 'symptom') {
        latest_readings.symptom = {
          symptom_name: row.symptom_name,
          symptom_severity: row.symptom_severity,
          recorded_at: row.recorded_at,
        };
      }
    }
  }

  // 3. Medication Adherence
  const intakes = db.prepare(`
    SELECT status FROM medication_intakes
    WHERE scheduled_for >= ? AND scheduled_for <= ?;
  `).all(fromUtc, toUtc);

  let takenCount = 0;
  let skippedCount = 0;

  for (const intake of intakes) {
    if (intake.status === 'taken') takenCount++;
    if (intake.status === 'skipped') skippedCount++;
  }

  const scheduledCount = intakes.length;
  const adherenceRate = scheduledCount > 0 ? Number((takenCount / scheduledCount).toFixed(3)) : 1.0;

  return {
    counts,
    latest_readings,
    medication_adherence: {
      scheduled_count: scheduledCount,
      taken_count: takenCount,
      skipped_count: skippedCount,
      adherence_rate: adherenceRate,
    },
  };
}

// 13. get_health_summary (Read)
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const logType = url.searchParams.get('log_type');

    if (!from || !to) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both "from" and "to" parameters (YYYY-MM-DD) are required.',
          },
        },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameters "from" and "to" must match format YYYY-MM-DD.',
          },
        },
        { status: 400 }
      );
    }

    const summary = calculateSummary(db, from, to, logType);

    return Response.json({
      status: 'success',
      data: summary,
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to calculate health summary',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json().catch(() => ({}));
    const from = body.from;
    const to = body.to;
    const logType = body.log_type;

    if (!from || !to) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Fields "from" and "to" (YYYY-MM-DD) are required.',
          },
        },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Fields "from" and "to" must match format YYYY-MM-DD.',
          },
        },
        { status: 400 }
      );
    }

    const summary = calculateSummary(db, from, to, logType);

    return Response.json({
      status: 'success',
      data: summary,
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to calculate health summary',
        },
      },
      { status: 500 }
    );
  }
}
