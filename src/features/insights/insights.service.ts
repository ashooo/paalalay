import type { SQLiteDatabase } from 'expo-sqlite';
import { HealthSummaryParams } from './types';
import { InsightsRepository } from './insights.repository';

export class InsightsService {
  /**
   * Tool 13: get_health_summary
   * Required: from (date YYYY-MM-DD), to (date YYYY-MM-DD)
   * Optional: log_type (health log enum)
   * Returns: { counts, latest_readings, medication_adherence }
   */
  static async getHealthSummary(
    db: SQLiteDatabase,
    params: HealthSummaryParams
  ) {
    if (!params || !params.from || !params.to) {
      return {
        status: 'error' as const,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both "from" and "to" date parameters (YYYY-MM-DD) are required.',
        },
      };
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.from) || !dateRegex.test(params.to)) {
      return {
        status: 'error' as const,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameters "from" and "to" must be in YYYY-MM-DD format.',
        },
      };
    }

    try {
      const counts = await InsightsRepository.getHealthCounts(
        db,
        params.from,
        params.to,
        params.log_type
      );

      const latestReadings = await InsightsRepository.getLatestReadings(
        db,
        params.from,
        params.to,
        params.log_type
      );

      const medicationAdherence = await InsightsRepository.getMedicationAdherence(
        db,
        params.from,
        params.to
      );

      return {
        status: 'success' as const,
        data: {
          counts,
          latest_readings: latestReadings,
          medication_adherence: medicationAdherence,
        },
      };
    } catch (err: any) {
      return {
        status: 'error' as const,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Failed to generate health summary.',
        },
      };
    }
  }
}
