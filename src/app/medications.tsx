import React, { useState } from 'react';
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
import * as Crypto from 'expo-crypto';

import { Colors } from '@/constants/theme';
import { getDatabase } from '@/db';

export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Captures handoff data from Dev 4 OCR Scanner (/scan)
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

  const handleSaveMedication = async () => {
    if (!medName.trim() || !strength.trim()) {
      Alert.alert('Validation Error', 'Medication name and strength are required.');
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDatabase();
      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const source = isFromOcr ? 'ocr_verified' : 'manual';

      await db.runAsync(
        `INSERT INTO medications (id, name, strength_text, instructions, source, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?);`,
        [id, medName.trim(), strength.trim(), instructions.trim() || null, source, now, now]
      );

      setSavedMedId(id);
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
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}
      <View style={[styles.ownerBadge, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="code-slash" size={14} color={theme.primary} />
        <Text style={[styles.ownerBadgeText, { color: theme.primary }]}>
          Dev 2 Module • Medications & Schedules
        </Text>
      </View>

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
              Prescription Data Received from Dev 4 OCR
            </Text>
            <Text style={[styles.ocrBannerText, { color: theme.textMuted }]}>
              Pre-filled from verified document. Review and confirm to save.
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

        <Text style={[styles.label, { color: theme.textMuted }]}>Strength / Dosage *</Text>
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
              ? 'Saving to SQLite...'
              : 'Save Medication (Dev 2 Tool: create_medication)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frozen Tool Contracts Checklist */}
      <View style={[styles.contractsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.contractsTitle, { color: theme.text }]}>
          Dev 2 Frozen Tool Contracts:
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>create_medication</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>list_medications</Text> (Read)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>get_today_medications</Text> (Read)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>set_medication_schedule</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>record_medication_intake</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>get_medication_history</Text> (Read)
        </Text>
      </View>
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
  ownerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
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
  ocrBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ocrBannerText: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
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
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contractsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  contractsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contractItem: {
    fontSize: 13,
  },
  boldText: {
    fontWeight: '700',
  },
});
