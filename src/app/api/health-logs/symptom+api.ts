import { getDb, generateUUID } from '../db';

// 11. log_symptom (Write • confirm)
export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON request body' },
        },
        { status: 400 }
      );
    }

    if (!body || !body.symptom) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'symptom text is required' },
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const logId = generateUUID();
    const now = new Date().toISOString();
    const recordedAt = body.recorded_at || now;

    db.prepare(`
      INSERT INTO health_logs (
        id, log_type, symptom_name, symptom_severity, notes, recorded_at, created_at
      ) VALUES (?, 'symptom', ?, ?, ?, ?, ?);
    `).run(
      logId,
      body.symptom.trim(),
      body.severity || null,
      body.notes || null,
      recordedAt,
      now
    );

    return Response.json(
      {
        status: 'success',
        data: {
          log_id: logId,
          log_type: 'symptom',
          recorded_at: recordedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to log symptom' },
      },
      { status: 500 }
    );
  }
}
