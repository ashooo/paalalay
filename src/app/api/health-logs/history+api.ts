import { getDb } from '@/db/server-db';

// 12. get_health_history (Read)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const logType = url.searchParams.get('log_type');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const conditions: string[] = [];
    const params: any[] = [];

    if (logType) {
      conditions.push('log_type = ?');
      params.push(logType);
    }
    if (from) {
      conditions.push('recorded_at >= ?');
      params.push(`${from}T00:00:00.000Z`);
    }
    if (to) {
      conditions.push('recorded_at <= ?');
      params.push(`${to}T23:59:59.999Z`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const db = await getDb();
    const rows = db.prepare(`
      SELECT * FROM health_logs 
      ${whereClause} 
      ORDER BY recorded_at DESC 
      LIMIT ?;
    `).all(...params);

    return Response.json({
      status: 'success',
      data: {
        logs: rows.map((r: any) => {
          const values: Record<string, any> = {};
          if (r.log_type === 'blood_pressure') {
            values.systolic = r.systolic;
            values.diastolic = r.diastolic;
            if (r.pulse_bpm != null) values.pulse_bpm = r.pulse_bpm;
          } else if (r.log_type === 'blood_sugar') {
            values.value = r.glucose_value;
            values.unit = r.glucose_unit;
            if (r.glucose_context) values.context = r.glucose_context;
          } else if (r.log_type === 'temperature') {
            values.value_c = r.temperature_c;
          } else if (r.log_type === 'weight') {
            values.value_kg = r.weight_kg;
          } else if (r.log_type === 'symptom') {
            values.symptom = r.symptom_name;
            if (r.symptom_severity != null) values.severity = r.symptom_severity;
          }

          if (r.notes) values.notes = r.notes;

          return {
            id: r.id,
            log_type: r.log_type,
            recorded_at: r.recorded_at,
            values,
          };
        }),
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to get health history' },
      },
      { status: 500 }
    );
  }
}
