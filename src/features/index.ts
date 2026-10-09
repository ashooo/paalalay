export * as doctorsFeature from './doctors';
export * as insightsFeature from './insights';

export { DoctorService, doctorService } from './doctors/service/doctor.service';
export { InsightsService, insightsService } from './insights/service/insights.service';
export { DoctorSearchScreen } from './doctors';
export { HealthDashboardScreen } from './insights';

/**
 * Dev 3 Tool Registry Handlers
 * Ready for Dev 1 to wire directly into the Qwen3 agent tool dispatcher:
 * - search_specialists
 * - get_health_summary
 */
export const dev3ToolHandlers = {
  search_specialists: async (args: unknown) => {
    const { doctorService } = await import('./doctors/service/doctor.service');
    return doctorService.searchSpecialists(args);
  },
  get_health_summary: async (args: unknown) => {
    const { insightsService } = await import('./insights/service/insights.service');
    return insightsService.getHealthSummary(args);
  },
};
