import { fetchHealthHistory, getHealthSummary } from '../../services/api-client';
import type { GetHealthSummaryOutputData } from './contracts.proposal';
import type { BloodPressureTrendPoint, BloodSugarTrendPoint } from './service/insights.service';
export async function loadDashboardData(now = new Date()) {
  const start = new Date(now); start.setUTCDate(start.getUTCDate() - 6);
  const from = start.toISOString().slice(0, 10), to = now.toISOString().slice(0, 10);
  const [summary, history] = await Promise.all([getHealthSummary({ from, to }), fetchHealthHistory({ from, to, limit: 100 })]);
  if (summary.status !== 'success' || history.status !== 'success') throw new Error('Your saved readings could not be loaded. No records have been changed.');
  const logs = history.data.logs as { log_type: string; recorded_at: string; values?: Record<string, unknown>; [key: string]: unknown }[];
  const bp: BloodPressureTrendPoint[] = [], sugar: BloodSugarTrendPoint[] = [];
  for (const row of [...logs].reverse()) {
    const values = row.values ?? row;
    if (row.log_type === 'blood_pressure' && typeof values.systolic === 'number' && typeof values.diastolic === 'number') bp.push({ recorded_at: row.recorded_at, systolic: values.systolic, diastolic: values.diastolic, pulse_bpm: typeof values.pulse_bpm === 'number' ? values.pulse_bpm : null });
    if (row.log_type === 'blood_sugar') {
      const value = values.value ?? values.glucose_value, unit = values.unit ?? values.glucose_unit;
      if (typeof value === 'number' && (unit === 'mg_dL' || unit === 'mmol_L')) sugar.push({ recorded_at: row.recorded_at, glucose_value: value, glucose_unit: unit, glucose_context: null });
    }
  }
  return { overview: { ...summary.data, from, to } as GetHealthSummaryOutputData, bp, sugar, truncated: logs.length === 100 };
}
