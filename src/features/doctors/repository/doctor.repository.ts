import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/db';
import type {
  DoctorModel,
  SearchSpecialistsInput,
  SearchSpecialistsItem,
} from '../contracts.proposal';

export class DoctorRepository {
  /**
   * Retrieves the shared SQLite connection from src/db/index.ts,
   * never opening an ad-hoc database file.
   */
  private async getDb(db?: SQLiteDatabase): Promise<SQLiteDatabase> {
    return db ?? (await getDatabase());
  }

  /**
   * Search doctors returning the strict tool contract result item shape:
   * { id, specialty, doctor_name?, facility_name, address, city }
   *
   * Strict requirements:
   * - Parameterized SQL only.
   * - Case-insensitive match on specialty.
   * - Optional city filter.
   * - Hard-capped limit at 30.
   */
  async searchSpecialists(
    input: SearchSpecialistsInput,
    db?: SQLiteDatabase
  ): Promise<SearchSpecialistsItem[]> {
    const database = await this.getDb(db);

    const specialtyTerm = `%${input.specialty.trim()}%`;
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 30);

    const conditions: string[] = ['specialty LIKE ? COLLATE NOCASE'];
    const params: (string | number)[] = [specialtyTerm];

    if (input.city && input.city.trim().length > 0) {
      conditions.push('city LIKE ? COLLATE NOCASE');
      params.push(`%${input.city.trim()}%`);
    }

    params.push(limit);

    const query = `
      SELECT
        id,
        specialty,
        doctor_name,
        facility_name,
        address,
        city
      FROM doctors
      WHERE ${conditions.join(' AND ')}
      ORDER BY facility_name ASC, id ASC
      LIMIT ?;
    `;

    const rows = await database.getAllAsync<SearchSpecialistsItem>(query, params);
    return rows;
  }

  /**
   * Search doctors returning the full DoctorModel for the UI Screen
   * (needed to render verified_at, source_url, phone, and coordinates).
   */
  async searchDoctorsWithDetails(
    input: SearchSpecialistsInput,
    db?: SQLiteDatabase
  ): Promise<DoctorModel[]> {
    const database = await this.getDb(db);

    const specialtyTerm = `%${input.specialty.trim()}%`;
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 30);

    const conditions: string[] = ['specialty LIKE ? COLLATE NOCASE'];
    const params: (string | number)[] = [specialtyTerm];

    if (input.city && input.city.trim().length > 0) {
      conditions.push('city LIKE ? COLLATE NOCASE');
      params.push(`%${input.city.trim()}%`);
    }

    params.push(limit);

    const query = `
      SELECT
        id,
        doctor_name,
        specialty,
        facility_name,
        address,
        city,
        latitude,
        longitude,
        phone,
        source_url,
        verified_at
      FROM doctors
      WHERE ${conditions.join(' AND ')}
      ORDER BY facility_name ASC, id ASC
      LIMIT ?;
    `;

    const rows = await database.getAllAsync<DoctorModel>(query, params);
    return rows;
  }

  /**
   * Retrieve a doctor by ID (used for detail view and provenance verification).
   */
  async getDoctorById(id: string, db?: SQLiteDatabase): Promise<DoctorModel | null> {
    const database = await this.getDb(db);
    const row = await database.getFirstAsync<DoctorModel>(
      'SELECT * FROM doctors WHERE id = ? LIMIT 1;',
      [id]
    );
    return row ?? null;
  }
}

export const doctorRepository = new DoctorRepository();
