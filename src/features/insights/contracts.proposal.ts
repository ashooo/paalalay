import { z } from 'zod';

/**
 * CONTRACT PROPOSAL: Insights & get_health_summary Tool
 * 
 * [TEAM NOTE]: Per DEV3_CONTEXT.md Section 3, 4 & 9, this file is a local PROPOSAL
 * inside src/features/insights/. It must not be placed directly into src/contracts/
 * until all four developers review and formally approve it at the contract sync.
 */

// ============================================================================
// 1. Domain Enums and Primitives
// ============================================================================

export const HealthLogTypeSchema = z.enum([
  'blood_pressure',
  'blood_sugar',
  'temperature',
  'weight',
  'symptom',
]);

export type HealthLogType = z.infer<typeof HealthLogTypeSchema>;

export const GlucoseUnitSchema = z.enum(['mg_dL', 'mmol_L']);
export type GlucoseUnit = z.infer<typeof GlucoseUnitSchema>;

export const GlucoseContextSchema = z.enum([
  'fasting',
  'before_meal',
  'after_meal',
  'random',
  'unknown',
]);
export type GlucoseContext = z.infer<typeof GlucoseContextSchema>;

// ============================================================================
// 2. Health Log Item Shapes
// ============================================================================

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  pulse_bpm: number | null;
  recorded_at: string; // ISO 8601 UTC
}

export interface BloodSugarReading {
  glucose_value: number;
  glucose_unit: GlucoseUnit;
  glucose_context: GlucoseContext | null;
  recorded_at: string; // ISO 8601 UTC
}

export interface TemperatureReading {
  temperature_c: number;
  recorded_at: string;
}

export interface WeightReading {
  weight_kg: number;
  recorded_at: string;
}

export interface SymptomReading {
  symptom_name: string;
  symptom_severity: number | null; // 1-10
  recorded_at: string;
}

export interface LatestReadingsSummary {
  blood_pressure?: BloodPressureReading | null;
  blood_sugar?: BloodSugarReading | null;
  temperature?: TemperatureReading | null;
  weight?: WeightReading | null;
  symptom?: SymptomReading | null;
}

export interface MedicationAdherenceSummary {
  scheduled_count: number;
  taken_count: number;
  skipped_count: number;
  adherence_rate: number; // 0.0 to 1.0 (or percentage 0-100)
}

// ============================================================================
// 3. get_health_summary Tool Contract
// ============================================================================

/**
 * Input Schema for get_health_summary tool and business service.
 * - from: YYYY-MM-DD
 * - to: YYYY-MM-DD
 * - log_type: optional health log enum filter
 */
export const GetHealthSummaryInputSchema = z
  .object({
    from: z
      .string({
        error: "'from' date is required",
      })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "'from' date must be in YYYY-MM-DD format"),
    to: z
      .string({
        error: "'to' date is required",
      })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "'to' date must be in YYYY-MM-DD format"),
    log_type: HealthLogTypeSchema.optional(),
  })
  .refine((data) => data.from <= data.to, {
    message: "'from' date cannot be later than 'to' date",
    path: ['from'],
  });

export type GetHealthSummaryInput = z.infer<typeof GetHealthSummaryInputSchema>;

export const GetHealthSummaryOutputDataSchema = z.object({
  from: z.string(),
  to: z.string(),
  counts: z.record(HealthLogTypeSchema, z.number()),
  latest_readings: z.object({
    blood_pressure: z.any().nullable().optional(),
    blood_sugar: z.any().nullable().optional(),
    temperature: z.any().nullable().optional(),
    weight: z.any().nullable().optional(),
    symptom: z.any().nullable().optional(),
  }),
  medication_adherence: z
    .object({
      scheduled_count: z.number(),
      taken_count: z.number(),
      skipped_count: z.number(),
      adherence_rate: z.number(),
    })
    .optional(),
});

export type GetHealthSummaryOutputData = {
  from: string;
  to: string;
  counts: Record<HealthLogType, number>;
  latest_readings: LatestReadingsSummary;
  medication_adherence?: MedicationAdherenceSummary;
};

// ============================================================================
// 4. Standard Service Envelope
// ============================================================================

export type ServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CANCELLED'
  | 'INTERNAL_ERROR'
  | string;

export interface ServiceErrorDetail {
  code: ServiceErrorCode;
  message: string;
}

export type ServiceEnvelope<T> =
  | {
      status: 'success';
      data: T;
      error?: never;
    }
  | {
      status: 'error';
      error: ServiceErrorDetail;
      data?: never;
    };
