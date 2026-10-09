import type { SQLiteDatabase } from 'expo-sqlite';
import {
  GetHealthSummaryInputSchema,
  GetHealthSummaryOutputData,
  HealthLogType,
  ServiceEnvelope,
} from '../contracts.proposal';
import {
  healthDataProvider,
  HealthDataProvider,
} from './health-data.provider';
import type { HealthLog } from '@/db/types';

export interface BloodPressureTrendPoint {
  recorded_at: string;
  systolic: number;
  diastolic: number;
  pulse_bpm: number | null;
}

export interface BloodSugarTrendPoint {
  recorded_at: string;
  glucose_value: number;
  glucose_unit: string;
  glucose_context: string | null;
}

export class InsightsService {
  private readonly provider: HealthDataProvider;

  constructor(provider: HealthDataProvider = healthDataProvider) {
    this.provider = provider;
  }

  /**
   * Tool handler & business service for get_health_summary.
   * 
   * Strict contract rules (DEV3_CONTEXT.md Section 9 & 10):
   * 1. Validates inputs against GetHealthSummaryInputSchema (YYYY-MM-DD format, from <= to).
   * 2. Returns VALIDATION_ERROR envelope on invalid input.
   * 3. Aggregates records strictly without direct mutation of Dev 2 tables.
   * 4. Returns standard envelope: { status: 'success', data: ... }.
   * 5. Returns INTERNAL_ERROR on system/database failures.
   */
  async getHealthSummary(
    rawInput: unknown,
    db?: SQLiteDatabase
  ): Promise<ServiceEnvelope<GetHealthSummaryOutputData>> {
    const parsed = GetHealthSummaryInputSchema.safeParse(rawInput);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}`
        : 'Invalid health summary input';

      return {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      };
    }

    const { from, to, log_type } = parsed.data;

    try {
      const logs = await this.provider.getHealthLogs(from, to, log_type, db);

      const counts: Record<HealthLogType, number> = {
        blood_pressure: 0,
        blood_sugar: 0,
        temperature: 0,
        weight: 0,
        symptom: 0,
      };

      for (const log of logs) {
        if (log.log_type in counts) {
          counts[log.log_type as HealthLogType]++;
        }
      }

      const latest_readings = await this.provider.getLatestReadings(db);
      const medication_adherence = await this.provider.getMedicationAdherence(from, to, db);

      return {
        status: 'success',
        data: {
          from,
          to,
          counts,
          latest_readings,
          medication_adherence,
        },
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while generating the health summary';

      return {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      };
    }
  }

  /**
   * Returns recent readings and 7-day adherence for the dashboard screen.
   */
  async getDashboardOverview(db?: SQLiteDatabase): Promise<GetHealthSummaryOutputData> {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);

    const from = sevenDaysAgo.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    const result = await this.getHealthSummary({ from, to }, db);

    if (result.status === 'success') {
      return result.data;
    }

    throw new Error(result.error.message);
  }

  /**
   * Fetches trend data points for Blood Pressure.
   */
  async getBloodPressureTrends(
    days: number = 7,
    db?: SQLiteDatabase
  ): Promise<BloodPressureTrendPoint[]> {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);

    const from = past.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    const logs = await this.provider.getHealthLogs(from, to, 'blood_pressure', db);

    // Return in chronological order for charting
    return logs
      .filter((l) => l.systolic != null && l.diastolic != null)
      .map((l) => ({
        recorded_at: l.recorded_at,
        systolic: l.systolic!,
        diastolic: l.diastolic!,
        pulse_bpm: l.pulse_bpm,
      }))
      .reverse();
  }

  /**
   * Fetches trend data points for Blood Sugar.
   */
  async getBloodSugarTrends(
    days: number = 7,
    db?: SQLiteDatabase
  ): Promise<BloodSugarTrendPoint[]> {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);

    const from = past.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    const logs = await this.provider.getHealthLogs(from, to, 'blood_sugar', db);

    return logs
      .filter((l) => l.glucose_value != null && l.glucose_unit != null)
      .map((l) => ({
        recorded_at: l.recorded_at,
        glucose_value: l.glucose_value!,
        glucose_unit: l.glucose_unit!,
        glucose_context: l.glucose_context,
      }))
      .reverse();
  }

  /**
   * Records a manual log entry.
   */
  async recordHealthLog(
    log: Omit<HealthLog, 'id' | 'created_at'>,
    db?: SQLiteDatabase
  ): Promise<string> {
    return this.provider.recordHealthLog(log, db);
  }
}

export const insightsService = new InsightsService();
