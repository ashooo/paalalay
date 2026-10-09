/**
 * ============================================================================
 * PLACEHOLDER / SYNTHETIC DOCTORS & SPECIALISTS SEED DATA
 * ============================================================================
 * 
 * CRITICAL COMPLIANCE NOTICE:
 * Per DEV3_CONTEXT.md Section 8 and Section 14 (Privacy and Safety Rules):
 * 1. The records below are intentionally synthetic PLACEHOLDER data for
 *    development, unit testing, and UI layout verification only.
 * 2. NO real doctors, private practices, phone numbers, or coordinates have
 *    been invented or guessed here.
 * 3. BEFORE THE DEMO / RELEASE: These placeholder records MUST be replaced
 *    by verified directory records from official and authentic Philippine
 *    healthcare sources (e.g. verified hospital registries, DOH directories).
 *    Each replacement record must contain a verifiable `source_url` and
 *    an authentic `verified_at` UTC timestamp.
 * ============================================================================
 */

import type { DoctorModel } from '../contracts.proposal';

export const PLACEHOLDER_DOCTORS: readonly DoctorModel[] = [
  {
    id: 'placeholder-doc-001',
    doctor_name: 'Dr. Sample Cardiologist (Placeholder)',
    specialty: 'Cardiology',
    facility_name: 'Sample Metro Heart Clinic (Placeholder)',
    address: '123 Prototype Way, Barangay San Antonio',
    city: 'Pasig',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-002',
    doctor_name: 'Dr. Example Endocrinologist (Placeholder)',
    specialty: 'Endocrinology',
    facility_name: 'Sample Diabetes & Endocrine Center (Placeholder)',
    address: '456 Mockingbird Blvd, Ermita',
    city: 'Manila',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-003',
    doctor_name: null,
    specialty: 'General Medicine',
    facility_name: 'Sample Community Health Center (Placeholder)',
    address: '789 Test Avenue, Diliman',
    city: 'Quezon City',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-004',
    doctor_name: 'Dr. Demo Pulmonologist (Placeholder)',
    specialty: 'Pulmonology',
    facility_name: 'Sample Respiratory Care Unit (Placeholder)',
    address: '101 Synthetic Drive, Ortigas Center',
    city: 'Pasig',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-005',
    doctor_name: 'Dr. Mock Pediatrician (Placeholder)',
    specialty: 'Pediatrics',
    facility_name: 'Sample Children Wellness Clinic (Placeholder)',
    address: '202 Placeholder Road, Malate',
    city: 'Manila',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-006',
    doctor_name: null,
    specialty: 'Cardiology',
    facility_name: 'Sample Provincial General Hospital (Placeholder)',
    address: '303 Dummy Boulevard, Fuente Osmeña',
    city: 'Cebu City',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
] as const;
