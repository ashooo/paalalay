import { fetchHealthHistory, getHealthSummary } from '../../services/api-client';
import { getMedicineManagement } from '../medications/management-service';
import type { HealthHistoryRow } from '../health/HealthHistory';
export async function loadHomeData() {
  const today = new Date(); const start = new Date(today); start.setUTCDate(start.getUTCDate() - 6);
  const [medicines, health, summary] = await Promise.allSettled([getMedicineManagement(), fetchHealthHistory({ limit: 5 }), getHealthSummary({ from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) })]);
  return {
    management: medicines.status === 'fulfilled' ? medicines.value : undefined,
    readings: health.status === 'fulfilled' && health.value.status === 'success' ? health.value.data.logs as HealthHistoryRow[] : [],
    medicineError: medicines.status === 'rejected',
    readingError: health.status === 'rejected' || health.value.status !== 'success',
    summary: summary.status === 'fulfilled' && summary.value.status === 'success' ? summary.value.data : undefined,
  };
}
