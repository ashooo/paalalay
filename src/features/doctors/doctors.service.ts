import type { SQLiteDatabase } from 'expo-sqlite';
import { SearchSpecialistsParams } from './types';
import { DoctorsRepository } from './doctors.repository';

export class DoctorsService {
  /**
   * Tool 14: search_specialists
   * Required: specialty (string)
   * Optional: city (string), limit (integer <= 30)
   * Returns: { status: 'success', data: { results: [...] } } or error envelope
   */
  static async searchSpecialists(
    db: SQLiteDatabase,
    params: SearchSpecialistsParams
  ) {
    if (!params || !params.specialty || typeof params.specialty !== 'string' || !params.specialty.trim()) {
      return {
        status: 'error' as const,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter "specialty" is required and must be a non-empty string.',
        },
      };
    }

    try {
      // Ensure seed data is populated
      await DoctorsRepository.seedCuratedDoctors(db);

      const cleanSpecialty = params.specialty.trim();
      const cleanCity = params.city ? params.city.trim() : undefined;
      const limit = params.limit ? Number(params.limit) : 10;

      const results = await DoctorsRepository.searchSpecialists(db, {
        specialty: cleanSpecialty,
        city: cleanCity,
        limit,
      });

      return {
        status: 'success' as const,
        data: {
          results,
        },
      };
    } catch (err: any) {
      return {
        status: 'error' as const,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Failed to query specialists directory.',
        },
      };
    }
  }

  /**
   * List all doctors or curated directory entries.
   */
  static async listAllDoctors(db: SQLiteDatabase, limit: number = 30) {
    try {
      await DoctorsRepository.seedCuratedDoctors(db);
      const results = await DoctorsRepository.listDoctors(db, limit);
      return {
        status: 'success' as const,
        data: {
          doctors: results,
        },
      };
    } catch (err: any) {
      return {
        status: 'error' as const,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Failed to list doctors.',
        },
      };
    }
  }
}
