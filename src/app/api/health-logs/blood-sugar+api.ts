import { toolInputSchemas, toolError } from '@/contracts/tools';
import { getDb, generateUUID } from '@/db/server-db';

// 08. log_blood_sugar (Write • confirm)
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

    const parsed = toolInputSchemas.log_blood_sugar.safeParse(body);
    if (!parsed.success) return Response.json(toolError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.'), { status: 400 });
    body = parsed.data;

    if (body.value == null || !body.unit) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'value and unit (mg_dL|mmol_L) are required' },
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
        id, log_type, glucose_value, glucose_unit, glucose_context, notes, recorded_at, created_at
      ) VALUES (?, 'blood_sugar', ?, ?, ?, ?, ?, ?);
    `).run(
      logId,
      body.value,
      body.unit,
      body.context || null,
      body.notes || null,
      recordedAt,
      now
    );

    return Response.json(
      {
        status: 'success',
        data: {
          log_id: logId,
          log_type: 'blood_sugar',
          recorded_at: recordedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to log blood sugar' },
      },
      { status: 500 }
    );
  }
}
