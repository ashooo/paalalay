import type { SQLiteDatabase } from 'expo-sqlite';
import { CURATED_SPECIALISTS } from '@/features/doctors/seed-data';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_initial_baseline_schema',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        -- 8. Schema Migrations (Dev 4)
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );

        -- 1. Medications (Dev 2)
        CREATE TABLE IF NOT EXISTS medications (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          strength_text TEXT NOT NULL,
          dosage_form TEXT,
          instructions TEXT,
          source TEXT NOT NULL,
          start_date TEXT,
          end_date TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- 2. Medication Schedules (Dev 2)
        CREATE TABLE IF NOT EXISTS medication_schedules (
          id TEXT PRIMARY KEY,
          medication_id TEXT NOT NULL REFERENCES medications(id),
          time_local TEXT NOT NULL,
          days_of_week TEXT NOT NULL,
          timezone TEXT NOT NULL,
          starts_on TEXT,
          ends_on TEXT,
          enabled INTEGER NOT NULL DEFAULT 1,
          native_notification_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- 3. Medication Intakes (Dev 2)
        CREATE TABLE IF NOT EXISTS medication_intakes (
          id TEXT PRIMARY KEY,
          medication_id TEXT NOT NULL REFERENCES medications(id),
          schedule_id TEXT REFERENCES medication_schedules(id),
          scheduled_for TEXT NOT NULL,
          status TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          notes TEXT,
          CONSTRAINT uq_schedule_scheduled_for UNIQUE (schedule_id, scheduled_for)
        );

        -- 4. Health Logs (Dev 2)
        CREATE TABLE IF NOT EXISTS health_logs (
          id TEXT PRIMARY KEY,
          log_type TEXT NOT NULL,
          systolic INTEGER,
          diastolic INTEGER,
          pulse_bpm INTEGER,
          glucose_value REAL,
          glucose_unit TEXT,
          glucose_context TEXT,
          temperature_c REAL,
          weight_kg REAL,
          symptom_name TEXT,
          symptom_severity INTEGER,
          notes TEXT,
          recorded_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        -- 5. Doctors (Dev 3)
        CREATE TABLE IF NOT EXISTS doctors (
          id TEXT PRIMARY KEY,
          doctor_name TEXT,
          specialty TEXT NOT NULL,
          facility_name TEXT NOT NULL,
          address TEXT NOT NULL,
          city TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          phone TEXT,
          source_url TEXT,
          verified_at TEXT
        );

        -- 6. Chat Sessions (Dev 1)
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- 7. Chat Messages (Dev 1)
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES chat_sessions(id),
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          tool_name TEXT,
          created_at TEXT NOT NULL
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_medication_schedules_medication_id ON medication_schedules(medication_id);
        CREATE INDEX IF NOT EXISTS idx_medication_intakes_med_scheduled ON medication_intakes(medication_id, scheduled_for);
        CREATE INDEX IF NOT EXISTS idx_health_logs_type_recorded ON health_logs(log_type, recorded_at);
        CREATE INDEX IF NOT EXISTS idx_doctors_specialty_city ON doctors(specialty, city);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
      `);
    },
  },
  {
    version: 2,
    name: '002_seed_curated_doctors',
    up: async (db: SQLiteDatabase) => {
      for (const doc of CURATED_SPECIALISTS) {
        await db.runAsync(
          `INSERT OR IGNORE INTO doctors (
            id, doctor_name, specialty, facility_name, address, city,
            latitude, longitude, phone, source_url, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            doc.id,
            doc.doctor_name || null,
            doc.specialty,
            doc.facility_name,
            doc.address,
            doc.city,
            doc.latitude || null,
            doc.longitude || null,
            doc.phone || null,
            doc.source_url || null,
            doc.verified_at || null,
          ]
        );
      }
    },
  },
];
