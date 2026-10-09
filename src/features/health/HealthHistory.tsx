import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { fetchHealthHistory } from '@/services/api-client';
import { Colors } from '@/constants/theme';

export interface HealthHistoryRow { id: string; log_type: string; recorded_at: string; values?: Record<string, unknown>; [key: string]: unknown }
export function readingLabel(row: HealthHistoryRow) {
  const v = row.values ?? row;
  switch (row.log_type) {
    case 'blood_pressure': return `Blood pressure: ${v.systolic}/${v.diastolic} mmHg${v.pulse_bpm != null ? ` · Pulse: ${v.pulse_bpm} bpm` : ''}`;
    case 'blood_sugar': return `Blood glucose: ${v.value ?? v.glucose_value} ${(v.unit ?? v.glucose_unit) === 'mmol_L' ? 'mmol/L' : 'mg/dL'}`;
    case 'temperature': return `Temperature: ${v.value_c ?? v.temperature_c} °C`;
    case 'weight': return `Weight: ${v.value_kg ?? v.weight_kg} kg`;
    case 'symptom': return `Symptom: ${v.symptom ?? v.symptom_name}${(v.severity ?? v.symptom_severity) != null ? ` · Severity: ${v.severity ?? v.symptom_severity}/10` : ''}`;
    default: return 'Saved reading';
  }
}
export default function HealthHistory({ revision }: { revision: number }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [rows, setRows] = useState<HealthHistoryRow[]>([]);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(20);
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);
  useFocusEffect(useCallback(() => {
    const id = ++request.current;
    setMessage('Loading saved readings…');
    void fetchHealthHistory({ limit }).then(result => {
      if (request.current !== id) return;
      if (result.status === 'success') { setRows(result.data.logs); setMessage(result.data.logs.length ? '' : 'No readings saved yet.'); }
      else { setRows([]); setMessage(result.error.message); }
    }).catch(() => { if (request.current === id) { setRows([]); setMessage('Could not load saved readings.'); } });
    return () => { request.current++; };
    // Write completion and manual refresh intentionally rerun the focused query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, limit, refresh]));
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
    <Text style={[styles.title, { color: c.text }]}>Saved reading history</Text>
    <Pressable accessibilityRole="button" onPress={() => setRefresh(v => v + 1)} style={styles.button}><Text style={[styles.body, { color: c.primary }]}>Refresh history</Text></Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.textMuted }]}>{message}</Text>}
    {rows.map(row => <View key={row.id} style={[styles.record, { borderColor: c.border }]}>
      <Text style={[styles.body, { color: c.text }]}>{readingLabel(row)}</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>{new Date(row.recorded_at).toLocaleString()}</Text>
      {!!(row.values?.notes ?? row.notes) && <Text style={[styles.body, { color: c.textMuted }]}>{String(row.values?.notes ?? row.notes)}</Text>}
    </View>)}
    {rows.length === limit && limit < 100 && <Pressable accessibilityRole="button" onPress={() => setLimit(n => Math.min(n + 20, 100))} style={styles.button}><Text style={[styles.body, { color: c.primary }]}>Show more readings</Text></Pressable>}
    {rows.length === 100 && <Text style={[styles.body, { color: c.textMuted }]}>Showing the most recent 100 readings.</Text>}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 16, borderWidth: 1, borderRadius: 16, gap: 12, marginTop: 20 }, title: { fontFamily: 'Manrope_700Bold', fontSize: 20 }, body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 }, record: { gap: 4, paddingVertical: 12, borderTopWidth: 1 }, button: { minHeight: 48, justifyContent: 'center' } });
