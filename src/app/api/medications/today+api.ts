import { getDb } from '../db';

// 03. get_today_medications (Read)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();

    const db = await getDb();

    // Query active schedules joined with active medications
    const schedules = db.prepare(`
      SELECT ms.*, m.name as medication_name 
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE m.is_active = 1 AND ms.enabled = 1
      ORDER BY ms.time_local ASC;
    `).all();

    // Query intakes for that day
    const startOfDayUtc = `${targetDate}T00:00:00.000Z`;
    const endOfDayUtc = `${targetDate}T23:59:59.999Z`;
    const intakes = db.prepare(`
      SELECT * FROM medication_intakes
      WHERE scheduled_for >= ? AND scheduled_for <= ?;
    `).all(startOfDayUtc, endOfDayUtc);

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
        schedule_id: s.id,
        time_local: s.time_local,
        status,
      });
    }

    return Response.json({
      status: 'success',
      data: {
        items,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to get today medications' },
      },
      { status: 500 }
    );
  }
}
