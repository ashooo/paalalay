import type { SQLiteDatabase } from 'expo-sqlite';
import { HealthCounts, LatestReadings, MedicationAdherenceSummary } from './types';
import { HealthLogType } from '@/db/types';

export class InsightsRepository {
  /**
   * Calculate log counts by type between fromDate and toDate (inclusive).
   */
  static async getHealthCounts(
    db: SQLiteDatabase,
    fromDate: string,
    toDate: string,
    filterLogType?: HealthLogType
  ): Promise<HealthCounts> {
    const fromUtc = `${fromDate}T00:00:00.000Z`;
    const toUtc = `${toDate}T23:59:59.999Z`;

    const whereClauses = ['recorded_at >= ?', 'recorded_at <= ?'];
    const params: any[] = [fromUtc, toUtc];

    if (filterLogType) {
      whereClauses.push('log_type = ?');
      params.push(filterLogType);
    }

    const query = `
      SELECT log_type, COUNT(*) as count
      FROM health_logs
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY log_type;
    `;

    const rows = await db.getAllAsync<{ log_type: string; count: number }>(query, params);

    const counts: HealthCounts = {
      blood_pressure: 0,
      blood_sugar: 0,
      temperature: 0,
      weight: 0,
      symptom: 0,
      total: 0,
    };

    for (const r of rows) {
      if (r.log_type in counts) {
        (counts as any)[r.log_type] = Number(r.count);
        counts.total += Number(r.count);
      }
    }

    return counts;
  }

  /**
   * Get latest reading for each log type in date range.
   */
  static async getLatestReadings(
    db: SQLiteDatabase,
    fromDate: string,
    toDate: string,
    filterLogType?: HealthLogType
  ): Promise<LatestReadings> {
    const fromUtc = `${fromDate}T00:00:00.000Z`;
    const toUtc = `${toDate}T23:59:59.999Z`;

    const types: HealthLogType[] = filterLogType
      ? [filterLogType]
      : ['blood_pressure', 'blood_sugar', 'temperature', 'weight', 'symptom'];

    const latest: LatestReadings = {
      blood_pressure: null,
      blood_sugar: null,
      temperature: null,
      weight: null,
      symptom: null,
    };

    for (const type of types) {
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM health_logs 
         WHERE log_type = ? AND recorded_at >= ? AND recorded_at <= ? 
         ORDER BY recorded_at DESC LIMIT 1;`,
        [type, fromUtc, toUtc]
      );

      if (row) {
        if (type === 'blood_pressure') {
          latest.blood_pressure = {
            systolic: row.systolic,
            diastolic: row.diastolic,
            pulse_bpm: row.pulse_bpm,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'blood_sugar') {
          latest.blood_sugar = {
            glucose_value: row.glucose_value,
            glucose_unit: row.glucose_unit || 'mg_dL',
            glucose_context: row.glucose_context,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'temperature') {
          latest.temperature = {
            temperature_c: row.temperature_c,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'weight') {
          latest.weight = {
            weight_kg: row.weight_kg,
            recorded_at: row.recorded_at,
          };
        } else if (type === 'symptom') {
          latest.symptom = {
            symptom_name: row.symptom_name,
            symptom_severity: row.symptom_severity,
            recorded_at: row.recorded_at,
          };
        }
      }
    }

    return latest;
  }

  /**
   * Aggregate medication adherence across scheduled days in date range.
   */
  static async getMedicationAdherence(
    db: SQLiteDatabase,
    fromDate: string,
    toDate: string
  ): Promise<MedicationAdherenceSummary> {
    const fromUtc = `${fromDate}T00:00:00.000Z`;
    const toUtc = `${toDate}T23:59:59.999Z`;

    // 1. Fetch recorded intakes in range
    const intakes = await db.getAllAsync<{ status: string }>(
      'SELECT status FROM medication_intakes WHERE scheduled_for >= ? AND scheduled_for <= ?;',
      [fromUtc, toUtc]
    );

    let takenCount = 0;
    let skippedCount = 0;

    for (const intake of intakes) {
      if (intake.status === 'taken') takenCount++;
      if (intake.status === 'skipped') skippedCount++;
    }

    const scheduledCount = intakes.length;
    const adherenceRate = scheduledCount > 0 ? Number((takenCount / scheduledCount).toFixed(3)) : 1.0;

    return {
      scheduled_count: scheduledCount,
      taken_count: takenCount,
      skipped_count: skippedCount,
      adherence_rate: adherenceRate,
    };
  }
}
