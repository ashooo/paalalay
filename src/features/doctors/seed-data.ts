import { PLACEHOLDER_DOCTORS } from './data/placeholder-doctors';
import type { DoctorRecord } from './types';

// Unverified synthetic data only. Never auto-seed, or present these as actual providers.
// Retain the API export name for compatibility with its explicit seed helper.
export const CURATED_SPECIALISTS: DoctorRecord[] = PLACEHOLDER_DOCTORS.map(record => ({ ...record }));
