import { VERIFIED_DOCTOR_SQL } from './provenance';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DoctorRecord, SearchSpecialistsParams } from './types';


export class DoctorsRepository {
  /**
   * Search specialists in SQLite database by specialty and optional city/limit.
   */
  static async searchSpecialists(
    db: SQLiteDatabase,
    params: SearchSpecialistsParams
  ): Promise<DoctorRecord[]> {
    const conditions: string[] = [VERIFIED_DOCTOR_SQL, 'specialty LIKE ?'];
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
      WHERE ${VERIFIED_DOCTOR_SQL}
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
      `SELECT * FROM doctors WHERE id = ? AND ${VERIFIED_DOCTOR_SQL};`,
      [id]
    );
    return row || null;
  }

  /**
   * Get distinct list of specialties available in the database.
   */
  static async getSpecialties(db: SQLiteDatabase): Promise<string[]> {
    const rows = await db.getAllAsync<{ specialty: string }>(
      `SELECT DISTINCT specialty FROM doctors WHERE ${VERIFIED_DOCTOR_SQL} ORDER BY specialty ASC;`
    );
    return rows.map((r) => r.specialty);
  }

}
