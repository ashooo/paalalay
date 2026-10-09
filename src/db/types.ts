export type MedicationSource = 'manual' | 'ocr_verified';
export type DosageForm = 'tablet' | 'capsule' | 'liquid' | 'other';
export type IntakeStatus = 'taken' | 'skipped';
export type HealthLogType = 'blood_pressure' | 'blood_sugar' | 'temperature' | 'weight' | 'symptom';
export type GlucoseUnit = 'mg_dL' | 'mmol_L';
export type GlucoseContext = 'fasting' | 'before_meal' | 'after_meal' | 'random' | 'unknown';
export type ChatRole = 'user' | 'assistant' | 'tool';

export interface SchemaMigration {
  version: number;
  name: string;
  applied_at: string;
}

export interface Medication {
  id: string; // UUID
  name: string;
  strength_text: string;
  dosage_form: DosageForm | null;
  instructions: string | null;
  source: MedicationSource;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  is_active: number; // 0 or 1
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface MedicationSchedule {
  id: string; // UUID
  medication_id: string; // FK -> medications.id
  time_local: string; // HH:mm
  days_of_week: string; // JSON array of integers 0-6 e.g. "[0,1,2,3,4,5,6]"
  timezone: string; // IANA e.g. "Asia/Manila"
  starts_on: string | null; // YYYY-MM-DD
  ends_on: string | null; // YYYY-MM-DD
  enabled: number; // 0 or 1
  native_notification_id: string | null;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface MedicationIntake {
  id: string; // UUID
  medication_id: string; // FK -> medications.id
  schedule_id: string | null; // FK -> medication_schedules.id
  scheduled_for: string; // ISO 8601 UTC
  status: IntakeStatus;
  recorded_at: string; // ISO 8601 UTC
  notes: string | null;
}

export interface HealthLog {
  id: string; // UUID
  log_type: HealthLogType;
  systolic: number | null;
  diastolic: number | null;
  pulse_bpm: number | null;
  glucose_value: number | null;
  glucose_unit: GlucoseUnit | null;
  glucose_context: GlucoseContext | null;
  temperature_c: number | null;
  weight_kg: number | null;
  symptom_name: string | null;
  symptom_severity: number | null; // 1-10
  notes: string | null;
  recorded_at: string; // ISO 8601 UTC
  created_at: string; // ISO 8601 UTC
}

export interface Doctor {
  id: string;
  doctor_name: string | null;
  specialty: string;
  facility_name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  source_url: string | null;
  verified_at: string | null; // ISO 8601 UTC
}

export interface ChatSession {
  id: string; // UUID
  title: string | null;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface ChatMessage {
  id: string; // UUID
  session_id: string; // FK -> chat_sessions.id
  role: ChatRole;
  content: string;
  tool_name: string | null;
  created_at: string; // ISO 8601 UTC
}
