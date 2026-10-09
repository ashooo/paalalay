import MedicineSuggestions from '../medicines/MedicineSuggestions';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { recordMedicationIntake, setMedicationSchedule } from '@/services/api-client';
import { getMedicineManagement, updateMedicine } from './management-service';
import { enableReminders, cancelMedicineReminders } from './native-reminders';
import { todayOccurrences, type MedicineRow } from './occurrences';
import { EmptyCollection, EntrySheet } from '@/components/care-ui';
import { ActivityFeedback } from '@/components/activity-feedback';

type Data = Awaited<ReturnType<typeof getMedicineManagement>>;
function ManagementButton({ label, onPress, secondary, busy, colors: c }: { label: string; onPress: () => void; secondary: boolean; busy: boolean; colors: (typeof Colors)['light' | 'dark'] }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onPress} style={[styles.button, { backgroundColor: secondary ? c.surfaceVariant : c.primary, opacity: busy ? 0.5 : 1 }]}><Text style={[styles.label, { color: secondary ? c.primary : c.onPrimary }]}>{label}</Text></Pressable>;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export default function MedicineManagement({ revision, onAdd, onChat }: { revision: number; onAdd: () => void; onChat: () => void }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [data, setData] = useState<Data>({ medicines: [], schedules: [], intakes: [] });
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<MedicineRow>();
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState('');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [now, setNow] = useState(new Date());
  const request = useRef(0);
  useFocusEffect(useCallback(() => {
    const id = ++request.current;
    setNow(new Date());
    setLoadError(false);
    void getMedicineManagement().then(result => { if (id === request.current) { setData(result); setMessage(''); setLoaded(true); } }).catch(() => { if (id === request.current) { setLoadError(true); setLoaded(true); setMessage('Your medicines could not be loaded. Your saved records have not been changed.'); } });
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { request.current++; clearInterval(timer); };
    // Write completion and manual refresh intentionally rerun the focused query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, reload]));


  const input = (label: string, value: string, change: (text: string) => void) => <View style={styles.field}><Text style={[styles.body, { color: c.textMuted }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} editable={!busy} onChangeText={change} style={[styles.input, { color: c.text, borderColor: c.border }]} /></View>;
  async function run(action: () => Promise<string>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { setMessage(await action()); const result = await getMedicineManagement(); setData(result); setNow(new Date()); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not complete this action.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function select(medicine: MedicineRow) {
    setSelected(medicine); setName(medicine.name); setStrength(medicine.strength_text); setInstructions(medicine.instructions ?? '');
    const schedules = data.schedules.filter(row => row.medication_id === medicine.id);
    setTimes(schedules.map(row => row.time_local).join(', '));
    setDays(schedules.length ? JSON.parse(schedules[0].days_of_week) : [0, 1, 2, 3, 4, 5, 6]);
    setStart(schedules[0]?.starts_on ?? ''); setEnd(schedules[0]?.ends_on ?? '');
  }
  async function saveDetails() {
    if (!selected) return '';
    await updateMedicine({ id: selected.id, name, strength_text: strength, instructions: instructions.trim() || null, is_active: Boolean(selected.is_active) });
    setSelected(undefined);
    return 'Medicine details saved. The reminder schedule was not changed.';
  }
  async function saveSchedule() {
    if (!selected) return '';
    const result = await setMedicationSchedule({ medication_id: selected.id, times_local: times.split(',').map(value => value.trim()), days_of_week: days,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(start.trim() ? { starts_on: start.trim() } : {}), ...(end.trim() ? { ends_on: end.trim() } : {}) });
    if (result.status !== 'success') throw new Error(result.error.message);
    const updated = await getMedicineManagement(); setData(updated);
    setSelected(undefined);
    try {
      await cancelMedicineReminders(data.schedules.filter(s => s.medication_id === selected.id).map(s => s.id));
      return `Schedule saved. ${await enableReminders(updated.medicines, updated.schedules)}`;
    }
    catch (error) { return `Schedule saved, but reminders could not be enabled: ${error instanceof Error ? error.message : 'Check phone notification settings.'}`; }
  }
  async function toggle(medicine: MedicineRow) {
    // Cancel first when pausing, so a successful pause never leaves known alerts queued.
    if (medicine.is_active) await cancelMedicineReminders(data.schedules.filter(s => s.medication_id === medicine.id).map(s => s.id));
    await updateMedicine({ id: medicine.id, name: medicine.name, strength_text: medicine.strength_text, instructions: medicine.instructions, is_active: !medicine.is_active });
    if (selected?.id === medicine.id) setSelected(undefined);
    return medicine.is_active ? 'Tracking paused. History is retained. This does not mean your prescribed treatment should stop.' : 'Tracking resumed. Use Refresh phone reminders to enable alerts.';
  }
  const occurrences = todayOccurrences(data.medicines, data.schedules, data.intakes, now);
  return <View style={styles.section}>
    <Text style={[styles.title, { color: c.text }]}>Your medicines</Text>
    {!loaded && <ActivityFeedback label="Gathering your medicines…"/>}
    {(loadError || data.medicines.length > 0) && <View style={styles.days}><ManagementButton label="Refresh" onPress={() => { setMessage(''); setReload(v => v + 1); }} secondary busy={busy} colors={c}/>{data.medicines.length > 0 && <ManagementButton label="Enable phone reminders" onPress={() => void run(async () => { const latest = await getMedicineManagement(); return enableReminders(latest.medicines, latest.schedules); })} secondary busy={busy} colors={c}/>}</View>}
    {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.body, { color: c.text }]}>{message}</Text>}
    {loaded && !loadError && !data.medicines.length && <EmptyCollection title="Nothing here yet. Start with one medicine?" description="Add from your prescription, scan it, or ask Alalay to help. You choose the reminder times." noun="a medicine" onAdd={onAdd} onChat={onChat}/>}
    {data.medicines.length > 0 && <Text style={[styles.body, { color: c.textMuted }]}>{data.medicines.filter(m => m.is_active).length} active medicines · {occurrences.length} reminders today</Text>}
    {data.medicines.map(medicine => <View key={medicine.id} style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Text style={[styles.subtitle, { color: c.text }]}>{medicine.name} · {medicine.strength_text}</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>{medicine.is_active ? 'Tracking active' : 'Tracking paused'}</Text>
      <Text style={[styles.body, { color: c.text }]}>{medicine.instructions || 'No instructions saved. Check your prescription or ask your pharmacist.'}</Text>
      {data.schedules.filter(s => s.medication_id === medicine.id).map(s => <Text key={s.id} style={[styles.body, { color: c.textMuted }]}>{s.time_local} · {JSON.parse(s.days_of_week).map((d: number) => DAYS[d]).join(', ')} · {s.timezone}{s.starts_on ? ` · From ${s.starts_on}` : ''}{s.ends_on ? ` · Until ${s.ends_on}` : ''}</Text>)}
      {<ManagementButton label={`Manage ${medicine.name}`} onPress={() => select(medicine)} secondary={true} busy={busy} colors={c}/>}
      {<ManagementButton label={medicine.is_active ? `Pause tracking for ${medicine.name}` : `Resume tracking for ${medicine.name}`} onPress={() => void run(() => toggle(medicine))} secondary={true} busy={busy} colors={c}/>}
    </View>)}
    <EntrySheet visible={Boolean(selected)} title={selected ? `Manage ${selected.name}` : 'Manage medicine'} onClose={() => setSelected(undefined)} busy={busy}>{selected && <View style={{ gap: 12 }}>
      <Text style={[styles.subtitle, { color: c.text }]}>Manage {selected.name}</Text>
      {input('Medicine name', name, setName)}<MedicineSuggestions value={name} onSelect={setName} disabled={busy} />{input('Strength', strength, setStrength)}
      {input('Prescription instructions (including food instructions)', instructions, setInstructions)}
      <Text style={[styles.body, { color: c.textMuted }]}>Copy the prescribed instructions. The app does not determine doses or food requirements.</Text>
      {<ManagementButton label={'Save medicine details'} onPress={() => void run(saveDetails)} secondary={false} busy={busy} colors={c}/>}
      {!!selected.is_active && <>
        {input('Reminder times (HH:mm, separated by commas)', times, setTimes)}
        <Text style={[styles.body, { color: c.textMuted }]}>Choose the times from your prescribed schedule. Saving replaces previous reminder times.</Text>
        <View style={styles.days}>{DAYS.map((day, index) => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={day} accessibilityState={{ checked: days.includes(index), disabled: busy }} disabled={busy} onPress={() => setDays(values => values.includes(index) ? values.filter(v => v !== index) : [...values, index].sort())} style={[styles.day, { borderColor: c.border, backgroundColor: days.includes(index) ? c.surfaceVariant : c.surface }]}><Text style={[styles.body, { color: c.text }]}>{day}</Text></Pressable>)}</View>
        {input('Start date (optional YYYY-MM-DD)', start, setStart)}{input('End date (optional YYYY-MM-DD)', end, setEnd)}
        <Text style={[styles.body, { color: c.textMuted }]}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Date-limited alerts cover up to 28 days ahead; refresh reminders to extend them.</Text>
        {<ManagementButton label={'Save schedule and enable reminders'} onPress={() => void run(saveSchedule)} secondary={false} busy={busy} colors={c}/>}
      </>}
      {<ManagementButton label={'Close without saving'} onPress={() => setSelected(undefined)} secondary={true} busy={busy} colors={c}/>}
    </View>}</EntrySheet>
    {data.medicines.length > 0 && <>
    <Text style={[styles.title, { color: c.text }]}>Today’s reminders</Text>
    {!occurrences.length && <Text style={[styles.body, { color: c.textMuted }]}>No reminders scheduled for today.</Text>}
    {occurrences.map(item => <View key={`${item.schedule_id}:${item.scheduled_for}`} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.subtitle, { color: c.text }]}>{item.name} · {item.time_local}</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>{item.status === 'not_recorded' ? 'Due time passed · Not recorded' : item.status === 'upcoming' ? 'Upcoming' : item.status === 'taken' ? 'Taken' : 'Skipped'}</Text>
      {!!item.instructions && <Text style={[styles.body, { color: c.text }]}>{item.instructions}</Text>}
      {(['taken', 'skipped'] as const).map(status => <View key={status}>{<ManagementButton label={`${status === 'taken' ? 'Record taken' : 'Record skipped'} · ${item.name} ${item.time_local}`} onPress={() => void run(async () => {
    const result = await recordMedicationIntake({ medication_id: item.medication_id, schedule_id: item.schedule_id, scheduled_for: item.scheduled_for, status });
    if (result.status !== 'success')
        throw new Error(result.error.message);
    return `Recorded ${status}. Future reminder times remain unchanged.`;
})} secondary={true} busy={busy} colors={c}/>}</View>)}
    </View>)}
    <Text style={[styles.body, { color: c.textMuted }]}>Not recorded means no intake was logged, not proof of a missed dose. For a missed dose, follow the medicine leaflet or ask your pharmacist. The app never doubles doses or shifts future doses.</Text>
    <Text style={[styles.title, { color: c.text }]}>Intake history</Text>
    {!data.intakes.length ? <Text style={[styles.body, { color: c.textMuted }]}>Taken and skipped entries will appear here when you record them.</Text> : <ManagementButton label={showHistory ? 'Hide intake history' : `View ${data.intakes.length} intake records`} onPress={() => setShowHistory(value => !value)} secondary busy={busy} colors={c}/>}
    {showHistory && data.intakes.slice(0, 30).map(event => <View key={event.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.body, { color: c.text }]}>{data.medicines.find(m => m.id === event.medication_id)?.name || 'Saved medicine'} · {event.status}</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>Scheduled: {new Date(event.scheduled_for).toLocaleString()}{'\n'}Recorded: {new Date(event.recorded_at).toLocaleString()}</Text>
    </View>)}
    {showHistory && data.intakes.length > 30 && <Text style={[styles.body, { color: c.textMuted }]}>Showing the 30 most recent intake records.</Text>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 12 }, title: { fontFamily: 'Manrope_700Bold', fontSize: 22 }, subtitle: { fontFamily: 'Manrope_700Bold', fontSize: 18 },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 }, label: { fontFamily: 'Manrope_700Bold', fontSize: 15, textAlign: 'center' },
  card: { padding: 16, borderWidth: 1, borderRadius: 16, gap: 12 }, field: { gap: 6 },
  input: { fontFamily: 'Manrope_400Regular', fontSize: 16, padding: 12, borderWidth: 1, borderRadius: 12, minHeight: 48 },
  button: { padding: 14, minHeight: 48, borderRadius: 999, justifyContent: 'center' }, days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, day: { minHeight: 48, padding: 10, borderWidth: 1, borderRadius: 12, justifyContent: 'center' },
});
