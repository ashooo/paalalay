import { z } from 'zod';

/**
 * CONTRACT PROPOSAL: Doctor Directory & search_specialists Tool
 * 
 * [TEAM NOTE]: Per DEV3_CONTEXT.md Section 3 & 4, this file is a local PROPOSAL
 * inside src/features/doctors/. It must not be placed directly into src/contracts/
 * until all four developers review and formally approve it at the contract sync.
 */

// ============================================================================
// 1. Data Models
// ============================================================================

export interface DoctorModel {
  id: string; // UUID or stable ID
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

export const DoctorModelSchema = z.object({
  id: z.string().min(1, 'Doctor ID is required'),
  doctor_name: z.string().nullable().optional(),
  specialty: z.string().min(1, 'Specialty is required'),
  facility_name: z.string().min(1, 'Facility name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
});

// ============================================================================
// 2. search_specialists Tool Contract
// ============================================================================

/**
 * Input Schema for search_specialists tool and search service.
 * - specialty: required string, min length 1.
 * - city: optional string.
 * - limit: optional integer, minimum 1, maximum 30.
 */
export const SearchSpecialistsInputSchema = z.object({
  specialty: z.string({
    error: 'Specialty is required',
  }).trim().min(1, 'Specialty cannot be empty'),
  city: z.string().trim().min(1, 'City cannot be empty').optional(),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(30, 'Limit cannot exceed 30')
    .optional()
    .default(20),
});

export type SearchSpecialistsInput = z.infer<typeof SearchSpecialistsInputSchema>;

/**
 * Tool Result Item shape (DEV3_CONTEXT.md Section 8 & 9).
 * Note: Provenance fields (source_url, verified_at, coordinates, phone)
 * are omitted from the agent tool envelope per specification, but accessible
 * via the full DoctorModel on the details view.
 */
export const SearchSpecialistsItemSchema = z.object({
  id: z.string(),
  specialty: z.string(),
  doctor_name: z.string().nullable().optional(),
  facility_name: z.string(),
  address: z.string(),
  city: z.string(),
});

export type SearchSpecialistsItem = z.infer<typeof SearchSpecialistsItemSchema>;

export const SearchSpecialistsOutputDataSchema = z.object({
  results: z.array(SearchSpecialistsItemSchema),
});

export type SearchSpecialistsOutputData = z.infer<typeof SearchSpecialistsOutputDataSchema>;

// ============================================================================
// 3. Standard Service Envelope
// ============================================================================

export type ServiceErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR' | string;

export interface ServiceErrorDetail {
  code: ServiceErrorCode;
  message: string;
}

export interface ServiceSuccessEnvelope<T> {
  status: 'success';
  data: T;
  error?: never;
}

export interface ServiceErrorEnvelope {
  status: 'error';
  data?: never;
  error: ServiceErrorDetail;
}

export type ServiceEnvelope<T> = ServiceSuccessEnvelope<T> | ServiceErrorEnvelope;
