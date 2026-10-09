import { toolInputSchemas, toolError } from '@/contracts/tools';
import { getDb, generateUUID } from '@/db/server-db';

// 04. set_medication_schedule (Write • confirm)
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

    const parsed = toolInputSchemas.set_medication_schedule.safeParse(body);
    if (!parsed.success) return Response.json(toolError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.'), { status: 400 });
    body = parsed.data;

    if (!body || !body.medication_id || !Array.isArray(body.times_local) || body.times_local.length === 0) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'medication_id and non-empty times_local array are required' },
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify medication exists
    const med = db.prepare('SELECT id, name FROM medications WHERE id = ?;').get(body.medication_id);
    if (!med) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'NOT_FOUND', message: `Medication with ID ${body.medication_id} not found` },
        },
        { status: 404 }
      );
    }

    // Replace previous schedules for this medication
    const scheduleIds: string[] = [];
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE medication_schedules SET enabled = 0 WHERE medication_id = ?;').run(body.medication_id);

      const now = new Date().toISOString();
      const daysStr = JSON.stringify(body.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
      const timezone = body.timezone || 'Asia/Manila';

      for (const timeLocal of body.times_local) {
        const scheduleId = generateUUID();
        db.prepare(`
          INSERT INTO medication_schedules (
            id, medication_id, time_local, days_of_week, timezone, starts_on, ends_on, enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
        `).run(
          scheduleId,
          body.medication_id,
          timeLocal,
          daysStr,
          timezone,
          body.starts_on || null,
          body.ends_on || null,
          now,
          now
        );
        scheduleIds.push(scheduleId);
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return Response.json(
      {
        status: 'success',
        data: {
          schedule_ids: scheduleIds,
          notifications_scheduled: 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to set medication schedule' },
      },
      { status: 500 }
    );
  }
}
