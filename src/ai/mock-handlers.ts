import type { ToolHandlers } from '../contracts/tools';

/** Synthetic responses for development only. Does not open or write a database. */
export function createMockToolHandlers(): ToolHandlers {
  return {
    list_medications: async () => ({ status: 'success', data: { medications: [] } }),
    log_blood_pressure: async (args) => ({
      status: 'success',
      data: {
        log_id: '00000000-0000-4000-8000-000000000001',
        log_type: 'blood_pressure',
        recorded_at: args.recorded_at ?? new Date().toISOString(),
      },
    }),
  };
}
