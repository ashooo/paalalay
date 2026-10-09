import { toolInputSchemas, toolError } from '@/contracts/tools';
import { getDb, generateUUID } from '@/db/server-db';

// 05. record_medication_intake (Write • confirm)
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

    const parsed = toolInputSchemas.record_medication_intake.safeParse(body);
    if (!parsed.success) return Response.json(toolError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.'), { status: 400 });
    body = parsed.data;

    if (!body || !body.medication_id || !body.schedule_id || !body.scheduled_for || !body.status) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'medication_id, schedule_id, scheduled_for, and status (taken|skipped) are required',
          },
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const schedule = db.prepare('SELECT medication_id FROM medication_schedules WHERE id = ?').get(body.schedule_id);
    if (!schedule || schedule.medication_id !== body.medication_id) return Response.json(toolError('VALIDATION_ERROR', 'The reminder does not belong to this medicine.'), { status: 400 });
    const existing = db.prepare('SELECT scheduled_for FROM medication_intakes WHERE schedule_id = ? AND julianday(scheduled_for) = julianday(?) ORDER BY recorded_at DESC LIMIT 1').get(body.schedule_id, body.scheduled_for);
    body.scheduled_for = existing?.scheduled_for ?? new Date(body.scheduled_for).toISOString();
    const intakeId = generateUUID();
    const recordedAt = body.recorded_at || new Date().toISOString();

    db.prepare(`
      INSERT INTO medication_intakes (
        id, medication_id, schedule_id, scheduled_for, status, recorded_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(schedule_id, scheduled_for) DO UPDATE SET
        status = excluded.status,
        recorded_at = excluded.recorded_at,
        notes = excluded.notes;
    `).run(
      intakeId,
      body.medication_id,
      body.schedule_id,
      body.scheduled_for,
      body.status,
      recordedAt,
      body.notes || null
    );

    const saved = db.prepare('SELECT id FROM medication_intakes WHERE schedule_id = ? AND scheduled_for = ?').get(body.schedule_id, body.scheduled_for);
    return Response.json(
      {
        status: 'success',
        data: {
          intake_id: saved?.id ?? intakeId,
          status: body.status,
          recorded_at: recordedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to record medication intake' },
      },
      { status: 500 }
    );
  }
}
