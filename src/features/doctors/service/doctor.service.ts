import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DoctorModel,
  SearchSpecialistsInput,
  SearchSpecialistsInputSchema,
  SearchSpecialistsOutputData,
  ServiceEnvelope,
} from '../contracts.proposal';
import { doctorRepository, DoctorRepository } from '../repository/doctor.repository';

export class DoctorService {
  private readonly repo: DoctorRepository;

  constructor(repo: DoctorRepository = doctorRepository) {
    this.repo = repo;
  }

  /**
   * Tool implementation & business service for search_specialists.
   * 
   * Strict contract rules:
   * 1. Validates inputs against SearchSpecialistsInputSchema.
   * 2. Returns VALIDATION_ERROR envelope on invalid input (missing specialty, limit > 30, etc.).
   * 3. Parameterized query executed via repository.
   * 4. An empty result list is a valid SUCCESS ({ status: 'success', data: { results: [] } }).
   * 5. Returns INTERNAL_ERROR envelope on database or runtime failure.
   */
  async searchSpecialists(
    rawInput: unknown,
    db?: SQLiteDatabase
  ): Promise<ServiceEnvelope<SearchSpecialistsOutputData>> {
    const parsed = SearchSpecialistsInputSchema.safeParse(rawInput);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}` : 'Invalid search input';
      return {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      };
    }

    try {
      const results = await this.repo.searchSpecialists(parsed.data, db);
      return {
        status: 'success',
        data: {
          results,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while searching specialists';
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
   * Screen-oriented query returning the full DoctorModel (including verified_at and source_url),
   * also wrapped in the standard envelope.
   */
  async searchDoctorsWithDetails(
    rawInput: unknown,
    db?: SQLiteDatabase
  ): Promise<ServiceEnvelope<{ doctors: DoctorModel[] }>> {
    const parsed = SearchSpecialistsInputSchema.safeParse(rawInput);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}` : 'Invalid search input';
      return {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      };
    }

    try {
      const doctors = await this.repo.searchDoctorsWithDetails(parsed.data, db);
      return {
        status: 'success',
        data: {
          doctors,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while loading doctors';
      return {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      };
    }
  }
}

export const doctorService = new DoctorService();

/**
 * Direct handler for Dev 1's Qwen3 / tool dispatcher.
 * Matches standard signature: (input: unknown) => Promise<ServiceEnvelope<T>>
 */
export async function searchSpecialistsHandler(
  rawInput: unknown,
  db?: SQLiteDatabase
): Promise<ServiceEnvelope<SearchSpecialistsOutputData>> {
  return doctorService.searchSpecialists(rawInput, db);
}
