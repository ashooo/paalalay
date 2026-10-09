import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, MessageCircleHeart } from '@/components/icons';
import { Colors } from '@/constants/theme';
import { useReducedMotion } from './activity-feedback';

export function CareButton({ label, onPress, secondary, disabled, icon }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: ReactNode }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? c.surfaceVariant : c.primary, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}>{icon}<Text style={[styles.buttonText, { color: secondary ? c.primary : c.onPrimary }]}>{label}</Text></Pressable>;
}
export function EmptyCollection({ title, description, onAdd, onChat, noun }: { title: string; description: string; noun: string; onAdd: () => void; onChat: () => void }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}><View style={[styles.symbol, { backgroundColor: c.surfaceVariant }]}><Plus size={28} color={c.primary}/></View><Text style={[styles.title, { color: c.text }]}>{title}</Text><Text style={[styles.body, { color: c.textMuted }]}>{description}</Text><CareButton label={`Add ${noun}`} onPress={onAdd}/><CareButton label="Ask Alalay to help" onPress={onChat} secondary icon={<MessageCircleHeart size={18} color={c.primary}/>}/></View>;
}
export function EntrySheet({ visible, title, onClose, busy, children }: { visible: boolean; title: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const reduced = useReducedMotion();
  return <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: c.surface }]} edges={['top', 'bottom']}>
        <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} disabled={busy} onPress={onClose} style={styles.close}><X size={24} color={c.text}/></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export function CareField({ label, value, onChange, disabled, numeric, multiline, placeholder }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; numeric?: boolean; multiline?: boolean; placeholder?: string }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text><TextInput accessibilityLabel={label} editable={!disabled} autoCorrect={false} value={value} onChangeText={onChange} multiline={multiline} keyboardType={numeric ? 'decimal-pad' : 'default'} placeholder={placeholder} placeholderTextColor={c.textMuted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }, multiline && { minHeight: 88, textAlignVertical: 'top' }]}/></View>;
}
const styles = StyleSheet.create({ button: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 }, empty: { padding: 24, borderWidth: 1, borderRadius: 24, gap: 16 }, symbol: { borderRadius: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }, title: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 30, flexShrink: 1 }, body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9,35,39,0.45)' }, sheet: { maxHeight: '92%', width: '100%', maxWidth: 760, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28 }, sheetHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, sheetContent: { padding: 24, paddingTop: 12, gap: 16 }, field: { gap: 8 }, fieldLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 }, input: { fontFamily: 'Manrope_400Regular', borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 } });
