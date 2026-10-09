import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import * as Location from 'expo-location';
import { Hospital, MapPin } from '@/components/icons';
import { Colors } from '@/constants/theme';
import { careSearchUrl, type CareKind } from './maps-search';

export default function NearbyCareScreen() {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [kind, setKind] = useState<CareKind>('hospitals');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function search(useLocation: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      let url: string;
      if (useLocation) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error('Location permission was not granted. You can search by city or area below.');
        if (!mounted.current) return;
        if (!await Location.hasServicesEnabledAsync()) throw new Error('Location services are off. Turn them on or enter a city below.');
        const position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Location took too long. Try again or search by city.')), 20000); }),
        ]);
        url = careSearchUrl(kind, position.coords);
      } else url = careSearchUrl(kind, area);
      if (!mounted.current) return;
      await Linking.openURL(url);
      if (mounted.current) setMessage('Opened Google Maps. Check the listing or contact the facility for current details.');
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Could not open Maps. Try searching by city.');
    } finally {
      if (timer) clearTimeout(timer);
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Hospital color={c.primary} size={36} />
    <Text style={[styles.title, { color: c.text }]}>Find nearby care</Text>
    <Text style={[styles.body, { color: c.textMuted }]}>Search hospitals or clinics in Google Maps. Internet is needed for search results.</Text>
    <View style={styles.row}>
      {(['hospitals', 'clinics'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: kind === value, disabled: busy }} disabled={busy} onPress={() => setKind(value)} style={[styles.choice, { borderColor: c.primary, backgroundColor: kind === value ? c.surfaceVariant : c.surface }]}>
        <Text style={[styles.label, { color: c.primary }]}>{value === 'hospitals' ? 'Hospitals' : 'Clinics'}</Text>
      </Pressable>)}
    </View>
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <MapPin color={c.primary} size={24} />
      <Text style={[styles.subtitle, { color: c.text }]}>Use my location</Text>
      <Text style={[styles.body, { color: c.textMuted }]}>Location is used only when you search. This shares an approximate location with Google Maps. Paalalay does not save or track your location.</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void search(true)} style={[styles.button, { backgroundColor: c.primary, opacity: busy ? 0.5 : 1 }]}>
        <Text style={[styles.label, { color: c.onPrimary }]}>{busy ? 'Opening search…' : 'Use location and open Maps'}</Text>
      </Pressable>
    </View>
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.subtitle, { color: c.text }]}>Or search by city or area</Text>
      <TextInput accessibilityLabel="City or area" editable={!busy} value={area} onChangeText={setArea} placeholder="City or area" placeholderTextColor={c.textMuted} maxLength={160} style={[styles.input, { color: c.text, borderColor: c.border }]} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void search(false)} style={[styles.button, { backgroundColor: c.surfaceVariant, opacity: busy ? 0.5 : 1 }]}>
        <Text style={[styles.label, { color: c.primary }]}>Search area in Maps</Text>
      </Pressable>
    </View>
    {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.body, { color: c.text }]}>{message}</Text>}
    <Text style={[styles.body, { color: c.textMuted }]}>Listings are provided by Google Maps. Paalalay has not independently verified providers, hours or availability.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Manrope_700Bold', fontSize: 18 },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  choice: { minHeight: 48, padding: 14, borderWidth: 1, borderRadius: 999, flex: 1 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: 'Manrope_400Regular', fontSize: 16 },
  button: { minHeight: 48, borderRadius: 999, padding: 14, justifyContent: 'center' },
});
