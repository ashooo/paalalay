export async function GET(request: Request) {
  try {
    const sqliteModule = (await import('node:sqlite' as string)) as any;
    const path = (await import('path' as string)) as any;

    const dbPath = path.join(process.cwd(), 'paalalay.db');
    const db = new sqliteModule.DatabaseSync(dbPath);

    const rows = db.prepare('SELECT * FROM medications WHERE is_active = 1;').all();

    return Response.json({
      status: 'success',
      data: {
        medications: rows,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        message: error?.message || 'Database query failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !body.name || !body.strength_text) {
      return Response.json(
        {
          status: 'error',
          message: 'name and strength_text are required fields',
        },
        { status: 400 }
      );
    }

    const sqliteModule = (await import('node:sqlite' as string)) as any;
    const path = (await import('path' as string)) as any;

    const dbPath = path.join(process.cwd(), 'paalalay.db');
    const db = new sqliteModule.DatabaseSync(dbPath);

    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO medications (id, name, strength_text, dosage_form, instructions, source, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);
    `).run(
      id,
      body.name,
      body.strength_text,
      body.dosage_form || null,
      body.instructions || null,
      body.source || 'manual',
      now,
      now
    );

    return Response.json(
      {
        status: 'success',
        data: {
          medication_id: id,
          name: body.name,
          strength_text: body.strength_text,
          is_active: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        message: error?.message || 'Failed to insert medication',
      },
      { status: 500 }
    );
  }
}
