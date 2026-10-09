import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase } from '@/db';
import type { HealthLog, MedicationIntake } from '@/db/types';
import type {
  HealthLogType,
  BloodPressureReading,
  BloodSugarReading,
  LatestReadingsSummary,
  MedicationAdherenceSummary,
} from '../contracts.proposal';

/**
 * HealthDataProvider
 * 
 * Provides read-only access to health logs and medication adherence data.
 * Per DEV3_CONTEXT.md: Dev 3 aggregates through a service layer without mutating
 * Dev 2's medication tables.
 * 
 * IMPORTANT: No hardcoded or mock data is injected. All queries read from real
 * SQLite storage, returning empty collections when no records exist.
 */
export class HealthDataProvider {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  private async getDb(db?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;
    if (!this.dbPromise) {
      this.dbPromise = initializeDatabase();
    }
    return this.dbPromise;
  }

  /**
   * Queries health logs in a date range (UTC).
   */
  async getHealthLogs(
    from: string, // YYYY-MM-DD
    to: string,   // YYYY-MM-DD
    logType?: HealthLogType,
    db?: SQLite.SQLiteDatabase
  ): Promise<HealthLog[]> {
    const database = await this.getDb(db);
    const fromUtc = `${from}T00:00:00.000Z`;
    const toUtc = `${to}T23:59:59.999Z`;

    if (logType) {
      return database.getAllAsync<HealthLog>(
        `SELECT * FROM health_logs 
         WHERE log_type = ? AND recorded_at >= ? AND recorded_at <= ? 
         ORDER BY recorded_at DESC;`,
        [logType, fromUtc, toUtc]
      );
    }

    return database.getAllAsync<HealthLog>(
      `SELECT * FROM health_logs 
       WHERE recorded_at >= ? AND recorded_at <= ? 
       ORDER BY recorded_at DESC;`,
      [fromUtc, toUtc]
    );
  }

  /**
   * Fetches the latest reading for each log type.
   */
  async getLatestReadings(db?: SQLite.SQLiteDatabase): Promise<LatestReadingsSummary> {
    const database = await this.getDb(db);

    const logTypes: HealthLogType[] = [
      'blood_pressure',
      'blood_sugar',
      'temperature',
      'weight',
      'symptom',
    ];

    const result: LatestReadingsSummary = {
      blood_pressure: null,
      blood_sugar: null,
      temperature: null,
      weight: null,
      symptom: null,
    };

    for (const type of logTypes) {
      const rows = await database.getAllAsync<HealthLog>(
        `SELECT * FROM health_logs 
         WHERE log_type = ? 
         ORDER BY recorded_at DESC 
         LIMIT 1;`,
        [type]
      );

      if (rows.length > 0) {
        const row = rows[0];
        if (type === 'blood_pressure' && row.systolic != null && row.diastolic != null) {
          result.blood_pressure = {
            systolic: row.systolic,
            diastolic: row.diastolic,
            pulse_bpm: row.pulse_bpm,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'blood_sugar' && row.glucose_value != null && row.glucose_unit != null) {
          result.blood_sugar = {
            glucose_value: row.glucose_value,
            glucose_unit: row.glucose_unit,
            glucose_context: row.glucose_context,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'temperature' && row.temperature_c != null) {
          result.temperature = {
            temperature_c: row.temperature_c,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'weight' && row.weight_kg != null) {
          result.weight = {
            weight_kg: row.weight_kg,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'symptom' && row.symptom_name != null) {
          result.symptom = {
            symptom_name: row.symptom_name,
            symptom_severity: row.symptom_severity,
            recorded_at: row.recorded_at,
          };
        }
      }
    }

    return result;
  }

  /**
   * Calculates medication adherence in a date range.
   * If no medication intakes are found, returns null/empty.
   */
  async getMedicationAdherence(
    from: string,
    to: string,
    db?: SQLite.SQLiteDatabase
  ): Promise<MedicationAdherenceSummary | undefined> {
    const database = await this.getDb(db);
    const fromUtc = `${from}T00:00:00.000Z`;
    const toUtc = `${to}T23:59:59.999Z`;

    const rows = await database.getAllAsync<MedicationIntake>(
      `SELECT status FROM medication_intakes 
       WHERE scheduled_for >= ? AND scheduled_for <= ?;`,
      [fromUtc, toUtc]
    );

    if (rows.length === 0) {
      return undefined;
    }

    let takenCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      if (row.status === 'taken') takenCount++;
      else if (row.status === 'skipped') skippedCount++;
    }

    const scheduledCount = rows.length;
    const adherenceRate = scheduledCount > 0 ? takenCount / scheduledCount : 0;

    return {
      scheduled_count: scheduledCount,
      taken_count: takenCount,
      skipped_count: skippedCount,
      adherence_rate: adherenceRate,
    };
  }

  /**
   * Helper for user manual recording (acceptance tests & fallback input).
   */
  async recordHealthLog(
    log: Omit<HealthLog, 'id' | 'created_at'>,
    db?: SQLite.SQLiteDatabase
  ): Promise<string> {
    const database = await this.getDb(db);
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowUtc = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO health_logs (
        id, log_type, systolic, diastolic, pulse_bpm,
        glucose_value, glucose_unit, glucose_context,
        temperature_c, weight_kg, symptom_name, symptom_severity,
        notes, recorded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        log.log_type,
        log.systolic ?? null,
        log.diastolic ?? null,
        log.pulse_bpm ?? null,
        log.glucose_value ?? null,
        log.glucose_unit ?? null,
        log.glucose_context ?? null,
        log.temperature_c ?? null,
        log.weight_kg ?? null,
        log.symptom_name ?? null,
        log.symptom_severity ?? null,
        log.notes ?? null,
        log.recorded_at,
        nowUtc,
      ]
    );

    return id;
  }
}

export const healthDataProvider = new HealthDataProvider();
