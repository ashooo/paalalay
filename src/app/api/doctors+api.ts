import { getDb } from '@/db/server-db';
import { CURATED_SPECIALISTS } from '@/features/doctors/seed-data';

// Helper to ensure seed data is inserted into SQLite
function ensureSeedData(db: any) {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM doctors;').get();
  if (!countRow || countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO doctors (
        id, doctor_name, specialty, facility_name, address, city,
        latitude, longitude, phone, source_url, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const doc of CURATED_SPECIALISTS) {
      insertStmt.run(
        doc.id,
        doc.doctor_name || null,
        doc.specialty,
        doc.facility_name,
        doc.address,
        doc.city,
        doc.latitude || null,
        doc.longitude || null,
        doc.phone || null,
        doc.source_url || null,
        doc.verified_at || null
      );
    }
  }
}

// GET /api/doctors (List or search doctors)
export async function GET(request: Request) {
  try {
    const db = await getDb();
    ensureSeedData(db);

    const url = new URL(request.url);
    const specialty = url.searchParams.get('specialty');
    const city = url.searchParams.get('city');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 50);

    const conditions: string[] = [];
    const params: any[] = [];

    if (specialty && specialty.trim()) {
      conditions.push('specialty LIKE ?');
      params.push(`%${specialty.trim()}%`);
    }

    if (city && city.trim()) {
      conditions.push('city LIKE ?');
      params.push(`%${city.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const rows = db.prepare(`
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      ${whereClause}
      ORDER BY city ASC, facility_name ASC
      LIMIT ?;
    `).all(...params);

    return Response.json({
      status: 'success',
      data: {
        doctors: rows,
        results: rows,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to fetch doctor directory',
        },
      },
      { status: 500 }
    );
  }
}
