import { getDb } from '@/db/server-db';
import { CURATED_SPECIALISTS } from '@/features/doctors/seed-data';

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

// 14. search_specialists (Read)
export async function GET(request: Request) {
  try {
    const db = await getDb();
    ensureSeedData(db);

    const url = new URL(request.url);
    const specialty = url.searchParams.get('specialty');
    const city = url.searchParams.get('city');
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10), 1), 30);

    if (!specialty || !specialty.trim()) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "specialty" is required.',
          },
        },
        { status: 400 }
      );
    }

    const conditions: string[] = ['specialty LIKE ?'];
    const params: any[] = [`%${specialty.trim()}%`];

    if (city && city.trim()) {
      conditions.push('city LIKE ?');
      params.push(`%${city.trim()}%`);
    }

    params.push(limit);

    const rows = db.prepare(`
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      WHERE ${conditions.join(' AND ')}
      ORDER BY city ASC, facility_name ASC
      LIMIT ?;
    `).all(...params);

    return Response.json({
      status: 'success',
      data: {
        results: rows,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to search specialists directory',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    ensureSeedData(db);

    const body = await request.json().catch(() => ({}));
    const specialty = body.specialty;
    const city = body.city;
    const limit = Math.min(Math.max(parseInt(body.limit || '10', 10), 1), 30);

    if (!specialty || typeof specialty !== 'string' || !specialty.trim()) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field "specialty" is required.',
          },
        },
        { status: 400 }
      );
    }

    const conditions: string[] = ['specialty LIKE ?'];
    const params: any[] = [`%${specialty.trim()}%`];

    if (city && typeof city === 'string' && city.trim()) {
      conditions.push('city LIKE ?');
      params.push(`%${city.trim()}%`);
    }

    params.push(limit);

    const rows = db.prepare(`
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      WHERE ${conditions.join(' AND ')}
      ORDER BY city ASC, facility_name ASC
      LIMIT ?;
    `).all(...params);

    return Response.json({
      status: 'success',
      data: {
        results: rows,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to search specialists',
        },
      },
      { status: 500 }
    );
  }
}
