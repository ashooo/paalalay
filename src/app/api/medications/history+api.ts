import { getDb } from '@/db/server-db';

// 06. get_medication_history (Read)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const medicationId = url.searchParams.get('medication_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const conditions: string[] = [];
    const params: any[] = [];

    if (medicationId) {
      conditions.push('medication_id = ?');
      params.push(medicationId);
    }
    if (from) {
      conditions.push('scheduled_for >= ?');
      params.push(`${from}T00:00:00.000Z`);
    }
    if (to) {
      conditions.push('scheduled_for <= ?');
      params.push(`${to}T23:59:59.999Z`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const db = await getDb();
    const rows = db.prepare(`
      SELECT * FROM medication_intakes 
      ${whereClause} 
      ORDER BY scheduled_for DESC 
      LIMIT ?;
    `).all(...params);

    return Response.json({
      status: 'success',
      data: {
        events: rows.map((r: any) => ({
          intake_id: r.id,
          medication_id: r.medication_id,
          scheduled_for: r.scheduled_for,
          status: r.status,
        })),
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to get medication history' },
      },
      { status: 500 }
    );
  }
}
