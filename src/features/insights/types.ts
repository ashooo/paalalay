import { HealthLogType } from '@/db/types';

export interface HealthSummaryParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  log_type?: HealthLogType;
}

export interface HealthCounts {
  blood_pressure: number;
  blood_sugar: number;
  temperature: number;
  weight: number;
  symptom: number;
  total: number;
}

export interface LatestReadings {
  blood_pressure?: {
    systolic: number;
    diastolic: number;
    pulse_bpm?: number | null;
    recorded_at: string;
  } | null;
  blood_sugar?: {
    glucose_value: number;
    glucose_unit: string;
    glucose_context?: string | null;
    recorded_at: string;
  } | null;
  temperature?: {
    temperature_c: number;
    recorded_at: string;
  } | null;
  weight?: {
    weight_kg: number;
    recorded_at: string;
  } | null;
  symptom?: {
    symptom_name: string;
    symptom_severity?: number | null;
    recorded_at: string;
  } | null;
}

export interface MedicationAdherenceSummary {
  scheduled_count: number;
  taken_count: number;
  skipped_count: number;
  adherence_rate: number; // 0.0 to 1.0
}

export interface HealthSummaryData {
  counts: HealthCounts;
  latest_readings: LatestReadings;
  medication_adherence?: MedicationAdherenceSummary;
}

export interface HealthSummaryResponse {
  status: 'success' | 'error';
  data?: HealthSummaryData;
  error?: {
    code: string;
    message: string;
  };
}
