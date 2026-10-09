export interface ScheduleRow {
  id: string; medication_id: string; time_local: string; days_of_week: string;
  timezone: string; starts_on: string | null; ends_on: string | null; enabled: number;
}
export interface MedicineRow {
  id: string; name: string; strength_text: string; instructions: string | null; is_active: number;
  start_date?: string | null; end_date?: string | null;
}
export interface IntakeRow {
  id: string; medication_id: string; schedule_id: string | null; scheduled_for: string;
  status: string; recorded_at: string; notes?: string | null;
}

export function localDate(now: Date, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Convert an explicitly chosen wall-clock time, checking DST gaps instead of shifting the dose. */
export function scheduledInstant(date: string, time: string, timezone: string): Date | null {
  const wanted = Date.parse(`${date}T${time}:00Z`);
  let timestamp = wanted;
  const format = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const wall = (instant: number) => {
    const parts = format.formatToParts(new Date(instant));
    const get = (key: string) => parts.find(p => p.type === key)!.value;
    return Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
  };
  for (let i = 0; i < 3; i++) timestamp += wanted - wall(timestamp);
  return wall(timestamp) === wanted ? new Date(timestamp) : null;
}

export function scheduleApplies(schedule: ScheduleRow, medicine: MedicineRow, date: string) {
  const days: number[] = JSON.parse(schedule.days_of_week);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return Boolean(schedule.enabled && medicine.is_active && days.includes(weekday)
    && (!schedule.starts_on || schedule.starts_on <= date) && (!schedule.ends_on || schedule.ends_on >= date)
    && (!medicine.start_date || medicine.start_date <= date) && (!medicine.end_date || medicine.end_date >= date));
}

export function todayOccurrences(medicines: MedicineRow[], schedules: ScheduleRow[], intakes: IntakeRow[], now = new Date()) {
  return schedules.flatMap(schedule => {
    const medicine = medicines.find(row => row.id === schedule.medication_id);
    if (!medicine) return [];
    const date = localDate(now, schedule.timezone);
    if (!scheduleApplies(schedule, medicine, date)) return [];
    const instant = scheduledInstant(date, schedule.time_local, schedule.timezone);
    if (!instant) return [];
    const recorded = intakes.find(row => row.schedule_id === schedule.id && Date.parse(row.scheduled_for) === instant.getTime());
    return [{ medication_id: medicine.id, schedule_id: schedule.id, name: medicine.name, instructions: medicine.instructions,
      strength_text: medicine.strength_text, time_local: schedule.time_local, timezone: schedule.timezone,
      scheduled_for: instant.toISOString(), status: recorded?.status ?? (instant <= now ? 'not_recorded' : 'upcoming') }];
  }).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
}
