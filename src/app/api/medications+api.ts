import { getDb, generateUUID } from '@/db/server-db';

// 02. list_medications (Read)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active_only') !== 'false';

    const db = await getDb();
    const query = activeOnly
      ? 'SELECT * FROM medications WHERE is_active = 1 ORDER BY created_at DESC;'
      : 'SELECT * FROM medications ORDER BY created_at DESC;';

    const rows = db.prepare(query).all();

    return Response.json({
      status: 'success',
      data: {
        medications: rows.map((m: any) => ({
          id: m.id,
          name: m.name,
          strength_text: m.strength_text,
          dosage_form: m.dosage_form,
          instructions: m.instructions,
          source: m.source,
          start_date: m.start_date,
          end_date: m.end_date,
          is_active: m.is_active === 1,
          created_at: m.created_at,
          updated_at: m.updated_at,
        })),
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Database query failed' },
      },
      { status: 500 }
    );
  }
}

// 01. create_medication (Write • confirm)
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

    if (!body || !body.name || !body.strength_text) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Medication name and strength_text are required' },
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const id = generateUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO medications (
        id, name, strength_text, dosage_form, instructions, source, start_date, end_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
    `).run(
      id,
      body.name.trim(),
      body.strength_text.trim(),
      body.dosage_form || null,
      body.instructions || null,
      body.source || 'manual',
      body.start_date || null,
      body.end_date || null,
      now,
      now
    );

    return Response.json(
      {
        status: 'success',
        data: {
          medication_id: id,
          name: body.name.trim(),
          is_active: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to save medication' },
      },
      { status: 500 }
    );
  }
}
