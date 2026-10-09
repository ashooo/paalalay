import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { createMedication } from '@/services/api-client';
import MedicineManagement from '@/features/medications/MedicineManagement';

export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Captures handoff data from Scan Scanner (/scan)
  const params = useLocalSearchParams<{
    ocr_raw_text?: string;
    ocr_name?: string;
    ocr_strength?: string;
    ocr_instructions?: string;
    source?: string;
  }>();

  const isFromOcr = params.source === 'ocr_verified';
  const [userEditedName, setUserEditedName] = useState<string | null>(null);
  const [userEditedStrength, setUserEditedStrength] = useState<string | null>(null);
  const [userEditedInstructions, setUserEditedInstructions] = useState<string | null>(null);

  const medName = userEditedName ?? params.ocr_name ?? '';
  const strength = userEditedStrength ?? params.ocr_strength ?? '';
  const instructions = userEditedInstructions ?? params.ocr_instructions ?? '';

  const [isSaving, setIsSaving] = useState(false);
  const [savedMedId, setSavedMedId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const saveLock = useRef(false);

  const handleSaveMedication = async () => {
    if (saveLock.current) return;
    if (!medName.trim() || !strength.trim()) {
      Alert.alert('Validation Error', 'Medication name and strength are required.');
      return;
    }

    saveLock.current = true;
    setIsSaving(true);
    try {
      const source = isFromOcr ? 'ocr_verified' : 'manual';
      const result = await createMedication({ name: medName.trim(), strength_text: strength.trim(), instructions: instructions.trim() || undefined, source });
      if (result.status !== 'success') throw new Error(result.error.message);
      const id = result.data.medication_id;

      setSavedMedId(id);
      setRevision(value => value + 1);
      Alert.alert(
        'Medication Saved',
        `Successfully saved "${medName.trim()}" (Source: ${source}). ID: ${id.slice(0, 8)}...`
      );
      setUserEditedName('');
      setUserEditedStrength('');
      setUserEditedInstructions('');
    } catch (err) {
      console.error('[Save Medication Error]:', err);
      Alert.alert('Error', 'Failed to save medication to database.');
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}


      <Text style={[styles.heading, { color: theme.text }]}>Medication Manager</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Manage master medication list, dose reminders, and intake compliance records.
      </Text>

      {/* OCR Handoff Reception Banner */}
      {isFromOcr && (
        <View style={[styles.ocrBanner, { backgroundColor: theme.surfaceVariant, borderColor: theme.accent }]}>
          <Ionicons name="document-text" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ocrBannerTitle, { color: theme.text }]}>
              Scanned prescription text
            </Text>
            <Text style={[styles.ocrBannerText, { color: theme.textMuted }]}>
              Pre-filled from OCR. Check every field against your prescription before saving.
            </Text>
          </View>
        </View>
      )}

      {/* Medication Entry / Verification Form */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Add New Medication</Text>

        <Text style={[styles.label, { color: theme.textMuted }]}>Medication Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Amoxicillin, Losartan"
          placeholderTextColor={theme.textMuted}
          value={medName}
          onChangeText={setUserEditedName}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Strength *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. 500 mg, 10 mg"
          placeholderTextColor={theme.textMuted}
          value={strength}
          onChangeText={setUserEditedStrength}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Instructions</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Take 1 tablet once daily with food"
          placeholderTextColor={theme.textMuted}
          value={instructions}
          onChangeText={setUserEditedInstructions}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: isSaving ? theme.border : theme.primary },
          ]}
          onPress={handleSaveMedication}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons
            name={savedMedId ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={20}
            color={theme.onPrimary}
          />
          <Text style={[styles.saveButtonText, { color: theme.onPrimary }]}>
            {isSaving
              ? 'Saving…'
              : 'Save medicine'}
          </Text>
        </TouchableOpacity>
      </View>

      <MedicineManagement revision={revision} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  ownerBadgeText: { fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    fontWeight: '700',
  },
  heading: { fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  ocrBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  ocrBannerTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    fontWeight: '700',
  },
  ocrBannerText: { fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: { fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: { fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  contractsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  contractsTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contractItem: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  boldText: {
    fontWeight: '700',
  },
});
