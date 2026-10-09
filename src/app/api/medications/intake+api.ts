import { getDb, generateUUID } from '../db';

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

    return Response.json(
      {
        status: 'success',
        data: {
          intake_id: intakeId,
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
