import { fetchHealthHistory } from '../../services/api-client';
import { getMedicineManagement } from '../medications/management-service';
import type { HealthHistoryRow } from '../health/HealthHistory';
export async function loadHomeData() {
  const [medicines, health] = await Promise.allSettled([getMedicineManagement(), fetchHealthHistory({ limit: 5 })]);
  return {
    management: medicines.status === 'fulfilled' ? medicines.value : undefined,
    readings: health.status === 'fulfilled' && health.value.status === 'success' ? health.value.data.logs as HealthHistoryRow[] : [],
    medicineError: medicines.status === 'rejected',
    readingError: health.status === 'rejected' || health.value.status !== 'success',
  };
}
