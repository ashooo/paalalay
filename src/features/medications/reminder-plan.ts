import { localDate, scheduleApplies, scheduledInstant, type MedicineRow, type ScheduleRow } from './occurrences';

export interface ReminderPlan {
  identifier: string; scheduleId: string;
  trigger: { type: 'daily'; hour: number; minute: number } | { type: 'weekly'; weekday: number; hour: number; minute: number } | { type: 'date'; date: Date };
}
export function reminderPlan(medicines: MedicineRow[], schedules: ScheduleRow[], timezone: string, now = new Date()) {
  const plans: ReminderPlan[] = [];
  let limited = false;
  for (const schedule of schedules) {
    const medicine = medicines.find(m => m.id === schedule.medication_id);
    if (!medicine?.is_active || !schedule.enabled) continue;
    const [hour, minute] = schedule.time_local.split(':').map(Number);
    const days: number[] = JSON.parse(schedule.days_of_week);
    const today = localDate(now, schedule.timezone);
    const ongoing = schedule.timezone === timezone && !schedule.ends_on && !medicine.end_date
      && (!schedule.starts_on || schedule.starts_on <= today) && (!medicine.start_date || medicine.start_date <= today);
    if (ongoing) {
      if (days.length === 7) plans.push({ identifier: `paalalay:${schedule.id}:daily`, scheduleId: schedule.id, trigger: { type: 'daily', hour, minute } });
      else for (const day of days) plans.push({ identifier: `paalalay:${schedule.id}:week:${day}`, scheduleId: schedule.id, trigger: { type: 'weekly', hour, minute, weekday: day + 1 } });
    } else {
      limited = true;
      for (let offset = 0; offset < 28; offset++) {
        const date = new Date(`${today}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + offset);
        const key = date.toISOString().slice(0, 10);
        if (!scheduleApplies(schedule, medicine, key)) continue;
        const instant = scheduledInstant(key, schedule.time_local, schedule.timezone);
        if (instant && instant > now) plans.push({ identifier: `paalalay:${schedule.id}:${key}`, scheduleId: schedule.id, trigger: { type: 'date', date: instant } });
      }
    }
  }
  if (plans.length > 60) throw new Error('This schedule needs more than 60 notification requests. Reduce reminder times or date-limited schedules before enabling them.');
  return { plans, limited };
}

export interface NotificationPort {
  list(): Promise<string[]>; cancel(id: string): Promise<void>; schedule(plan: ReminderPlan): Promise<string>;
}
/** Replace only this app's reminders; failed creates are cleaned up, never silently retried. */
export async function replaceReminders(port: NotificationPort, plans: ReminderPlan[]) {
  for (const id of await port.list()) if (id.startsWith('paalalay:')) await port.cancel(id);
  const created: string[] = [];
  try {
    for (const plan of plans) created.push(await port.schedule(plan));
    return created.length;
  } catch (error) {
    const cleanup = await Promise.allSettled(created.map(id => port.cancel(id)));
    if (cleanup.some(r => r.status === 'rejected')) throw new Error('Reminder setup failed and cleanup was incomplete. Check system notifications before retrying.');
    throw error;
  }
}
