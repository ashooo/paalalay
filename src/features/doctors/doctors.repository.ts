import type { SQLiteDatabase } from 'expo-sqlite';
import { DoctorRecord, SearchSpecialistsParams } from './types';
import { CURATED_SPECIALISTS } from './seed-data';

export class DoctorsRepository {
  /**
   * Search specialists in SQLite database by specialty and optional city/limit.
   */
  static async searchSpecialists(
    db: SQLiteDatabase,
    params: SearchSpecialistsParams
  ): Promise<DoctorRecord[]> {
    const conditions: string[] = ['specialty LIKE ?'];
    const sqlParams: any[] = [`%${params.specialty}%`];

    if (params.city && params.city.trim()) {
      conditions.push('city LIKE ?');
      sqlParams.push(`%${params.city.trim()}%`);
    }

    const limit = Math.min(Math.max(params.limit || 10, 1), 30);
    sqlParams.push(limit);

    const query = `
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      WHERE ${conditions.join(' AND ')}
      ORDER BY city ASC, facility_name ASC
      LIMIT ?;
    `;

    const rows = await db.getAllAsync<DoctorRecord>(query, sqlParams);
    return rows;
  }

  /**
   * List all doctors or filter by query.
   */
  static async listDoctors(
    db: SQLiteDatabase,
    limit: number = 30
  ): Promise<DoctorRecord[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const query = `
      SELECT id, doctor_name, specialty, facility_name, address, city, latitude, longitude, phone, source_url, verified_at
      FROM doctors
      ORDER BY city ASC, specialty ASC
      LIMIT ?;
    `;
    const rows = await db.getAllAsync<DoctorRecord>(query, [safeLimit]);
    return rows;
  }

  /**
   * Get doctor by ID.
   */
  static async getDoctorById(
    db: SQLiteDatabase,
    id: string
  ): Promise<DoctorRecord | null> {
    const row = await db.getFirstAsync<DoctorRecord>(
      'SELECT * FROM doctors WHERE id = ?;',
      [id]
    );
    return row || null;
  }

  /**
   * Get distinct list of specialties available in the database.
   */
  static async getSpecialties(db: SQLiteDatabase): Promise<string[]> {
    const rows = await db.getAllAsync<{ specialty: string }>(
      'SELECT DISTINCT specialty FROM doctors ORDER BY specialty ASC;'
    );
    return rows.map((r) => r.specialty);
  }

  /**
   * Seeds the curated list of specialists into SQLite if table is empty.
   */
  static async seedCuratedDoctors(db: SQLiteDatabase): Promise<void> {
    const countRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM doctors;'
    );
    if (countRow && countRow.count > 0) {
      return;
    }

    for (const doc of CURATED_SPECIALISTS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO doctors (
          id, doctor_name, specialty, facility_name, address, city,
          latitude, longitude, phone, source_url, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
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
          doc.verified_at || null,
        ]
      );
    }
  }
}
