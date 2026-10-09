import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, ChartNoAxesCombined } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { logHealthMeasurement } from '@/services/api-client';
import HealthHistory from '@/features/health/HealthHistory';
import { CareButton, CareField, EntrySheet } from '@/components/care-ui';
import { ActivityFeedback } from '@/components/activity-feedback';

type LogType = 'blood_pressure' | 'blood_sugar' | 'temperature' | 'weight' | 'symptom';
const types: { type: LogType; label: string; unit: string }[] = [{ type: 'blood_pressure', label: 'Blood pressure', unit: 'mmHg' }, { type: 'blood_sugar', label: 'Blood glucose', unit: '' }, { type: 'temperature', label: 'Temperature', unit: '°C' }, { type: 'weight', label: 'Weight', unit: 'kg' }, { type: 'symptom', label: 'Symptom', unit: '' }];
export default function HealthLogsScreen() {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const params = useLocalSearchParams<{ add?: string }>();
  const [open, setOpen] = useState(false);
  const visible = open || params.add === '1';
  const [type, setType] = useState<LogType>('blood_pressure');
  const [value, setValue] = useState(''), [diastolic, setDiastolic] = useState(''), [notes, setNotes] = useState('');
  const [unit, setUnit] = useState<'mg_dL' | 'mmol_L'>('mg_dL');
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [revision, setRevision] = useState(0);
  const lock = useRef(false);
  function close() { setOpen(false); router.setParams({ add: undefined }); setMessage(''); }
  function add() { setMessage(''); setValue(''); setDiastolic(''); setNotes(''); setOpen(true); }
  async function save() {
    if (lock.current) return;
    if (!value.trim() || (type === 'blood_pressure' && !diastolic.trim())) { setMessage('Enter the reading you measured before saving.'); return; }
    lock.current = true; setSaving(true); setMessage('');
    try {
      const result = await logHealthMeasurement({ log_type: type,
        ...(type === 'blood_pressure' ? { systolic: Number(value), diastolic: Number(diastolic) } : {}),
        ...(type === 'blood_sugar' ? { glucose_value: Number(value), glucose_unit: unit } : {}),
        ...(type === 'temperature' ? { temperature_c: Number(value) } : {}),
        ...(type === 'weight' ? { weight_kg: Number(value) } : {}),
        ...(type === 'symptom' ? { symptom_name: value.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (result.status !== 'success') throw new Error(result.error.message);
      setRevision(n => n + 1); close(); setMessage('Reading saved. Your history is up to date.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this reading. Try again.'); }
    finally { lock.current = false; setSaving(false); }
  }
  const selected = types.find(item => item.type === type)!;
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.text }]}>Your health, one entry at a time.</Text><Text style={[styles.body, { color: c.textMuted }]}>Keep a timeline of your readings and symptoms. Add an entry when you have something to record.</Text>
      <View style={styles.actions}><CareButton label="Add a reading" onPress={add} icon={<Plus size={20} color={c.onPrimary}/>}/><CareButton label="See insights" secondary onPress={() => router.push('/insights')} icon={<ChartNoAxesCombined size={20} color={c.primary}/>}/></View>
      {!visible && !!message && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.primary }]}>{message}</Text>}
      <HealthHistory revision={revision} onAdd={add} onChat={() => router.push('/assistant')}/>
    </ScrollView>
    <EntrySheet title="Add a reading" visible={visible} busy={saving} onClose={close}>
      <Text style={[styles.body, { color: c.textMuted }]}>Choose what you measured. The app records your values without diagnosing them.</Text>
      <View style={styles.actions}>{types.map(item => <Pressable key={item.type} accessibilityRole="radio" accessibilityState={{ checked: type === item.type, disabled: saving }} disabled={saving} onPress={() => { setType(item.type); setValue(''); setDiastolic(''); setMessage(''); }} style={[styles.chip, { backgroundColor: type === item.type ? c.primary : c.surfaceVariant }]}><Text style={[styles.chipText, { color: type === item.type ? c.onPrimary : c.primary }]}>{item.label}</Text></Pressable>)}</View>
      {type === 'blood_sugar' && <View style={styles.actions}>{(['mg_dL', 'mmol_L'] as const).map(option => <Pressable accessibilityRole="radio" accessibilityLabel={option === 'mg_dL' ? 'mg/dL' : 'mmol/L'} accessibilityState={{ checked: unit === option }} key={option} disabled={saving} onPress={() => setUnit(option)} style={[styles.chip, { backgroundColor: unit === option ? c.primary : c.surfaceVariant }]}><Text style={[styles.chipText, { color: unit === option ? c.onPrimary : c.primary }]}>{option === 'mg_dL' ? 'mg/dL' : 'mmol/L'}</Text></Pressable>)}</View>}
      <CareField label={type === 'blood_pressure' ? 'Systolic (mmHg)' : type === 'symptom' ? 'Symptom in your words' : `${selected.label} ${type === 'blood_sugar' ? (unit === 'mg_dL' ? '(mg/dL)' : '(mmol/L)') : `(${selected.unit})`}`} value={value} onChange={setValue} numeric={type !== 'symptom'} multiline={type === 'symptom'} disabled={saving}/>
      {type === 'blood_pressure' && <CareField label="Diastolic (mmHg)" value={diastolic} onChange={setDiastolic} numeric disabled={saving}/>}
      <CareField label="Notes (optional)" value={notes} onChange={setNotes} multiline disabled={saving}/>
      {!!message && <Text accessibilityRole="alert" style={[styles.body, { color: c.error }]}>{message}</Text>}
      {saving && <ActivityFeedback label="Saving your reading…"/>}
      <CareButton label={saving ? 'Saving…' : 'Save reading'} onPress={() => void save()} disabled={saving}/><CareButton label="Cancel" secondary onPress={close} disabled={saving}/>
    </EntrySheet>
  </>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 900, width: '100%', alignSelf: 'center' }, title: { fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 36 }, body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 }, chipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 } });
