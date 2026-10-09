import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, ScanLine } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { createMedication } from '@/services/api-client';
import MedicineManagement from '@/features/medications/MedicineManagement';
import MedicineSuggestions from '@/features/medicines/MedicineSuggestions';
import { CareButton, CareField, EntrySheet } from '@/components/care-ui';
import { ActivityFeedback } from '@/components/activity-feedback';

export default function MedicationsScreen() {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const params = useLocalSearchParams<{ ocr_name?: string; ocr_strength?: string; ocr_instructions?: string; source?: string; add?: string }>();
  const ocr = params.source === 'ocr_verified';
  const [open, setOpen] = useState(false);
  const handoff = ocr ? JSON.stringify(params) : params.add === '1' ? 'manual' : undefined;
  const visible = open || Boolean(handoff);
  const [edits, setEdits] = useState<{ handoff?: string; name?: string; strength?: string; instructions?: string }>({});
  const currentEdits = edits.handoff === handoff ? edits : {};
  const name = currentEdits.name ?? params.ocr_name ?? '';
  const strength = currentEdits.strength ?? params.ocr_strength ?? '';
  const instructions = currentEdits.instructions ?? params.ocr_instructions ?? '';
  const edit = (field: 'name' | 'strength' | 'instructions', value: string) => setEdits({ ...currentEdits, handoff, [field]: value });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  function close() { setOpen(false); router.setParams({ add: undefined, source: undefined, ocr_name: undefined, ocr_strength: undefined, ocr_instructions: undefined }); setMessage(''); }
  async function save() {
    if (lock.current) return;
    if (!name.trim() || !strength.trim()) { setMessage('Enter the medicine name and strength from your prescription.'); return; }
    lock.current = true; setSaving(true); setMessage('');
    try {
      const result = await createMedication({ name: name.trim(), strength_text: strength.trim(), instructions: instructions.trim() || undefined, source: ocr ? 'ocr_verified' : 'manual' });
      if (result.status !== 'success') throw new Error(result.error.message);
      setRevision(value => value + 1); close(); setMessage('Medicine saved. Tap Manage to choose your prescribed reminder times.');
      setEdits({});
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this medicine. Try again.'); }
    finally { lock.current = false; setSaving(false); }
  }
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.text }]}>A little care, on time.</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>Your medicines and reminders, with a clear record of what you’ve logged.</Text>
      <View style={styles.actions}><CareButton label="Add medicine" onPress={() => { setMessage(''); setOpen(true); }} icon={<Plus size={20} color={c.onPrimary}/>}/><CareButton label="Scan prescription" onPress={() => router.push('/scan')} secondary icon={<ScanLine size={20} color={c.primary}/>}/></View>
      {!visible && !!message && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.primary }]}>{message}</Text>}
      <MedicineManagement revision={revision} onAdd={() => setOpen(true)} onChat={() => router.push('/assistant')}/>
    </ScrollView>
    <EntrySheet visible={visible} title={ocr ? 'Review scanned medicine' : 'Add medicine'} busy={saving} onClose={close}>
      <Text style={[styles.body, { color: c.textMuted }]}>{ocr ? 'Check every scanned field against your prescription before saving.' : 'Copy the name, strength and instructions from your prescription or packaging.'}</Text>
      <CareField label="Medicine name" value={name} onChange={value => edit('name', value)} disabled={saving}/>
      <MedicineSuggestions value={name} onSelect={value => edit('name', value)} disabled={saving}/>
      <CareField label="Strength" value={strength} onChange={value => edit('strength', value)} disabled={saving} placeholder="As printed on your prescription"/>
      <CareField label="Prescription instructions (optional)" value={instructions} onChange={value => edit('instructions', value)} disabled={saving} multiline/>
      {!!message && <Text accessibilityRole="alert" style={[styles.body, { color: c.error }]}>{message}</Text>}
      {saving && <ActivityFeedback label="Saving your medicine…"/>}
      <CareButton label={saving ? 'Saving…' : 'Save medicine'} onPress={() => void save()} disabled={saving}/>
      <CareButton label="Cancel" secondary onPress={close} disabled={saving}/>
    </EntrySheet>
  </>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 900, width: '100%', alignSelf: 'center' }, title: { fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 36 }, body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
