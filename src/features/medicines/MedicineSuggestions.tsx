import { Pressable, Text, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { suggestMedicines } from './reference/catalog';

export default function MedicineSuggestions({ value, onSelect, disabled = false }: { value: string; onSelect: (name: string) => void; disabled?: boolean }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const matches = suggestMedicines(value);
  if (!matches.length || matches.some(row => row.name.toLowerCase() === value.trim().toLowerCase())) return null;
  return <View style={{ gap: 4, marginBottom: 12 }}>
    <Text style={{ color: c.textMuted }}>PNF EML 2022 name reference · Check your label before choosing.</Text>
    {matches.map(row => <Pressable key={row.name} accessibilityRole="button" accessibilityLabel={`Use medicine name ${row.name}`} disabled={disabled} onPress={() => onSelect(row.name)} style={{ padding: 12, borderRadius: 8, backgroundColor: c.surfaceVariant }}>
      <Text style={{ color: c.text }}>{row.name}</Text>
    </Pressable>)}
  </View>;
}
