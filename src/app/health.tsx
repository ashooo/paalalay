import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { logHealthMeasurement } from '@/services/api-client';

type LogTab = 'blood_pressure' | 'blood_sugar' | 'temperature' | 'weight' | 'symptom';

export default function HealthLogsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [activeTab, setActiveTab] = useState<LogTab>('blood_pressure');

  // Input states
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [symptom, setSymptom] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  async function saveReading() {
    if (saving) return;
    const required = activeTab === 'blood_pressure' ? [systolic, diastolic]
      : [activeTab === 'blood_sugar' ? glucose : activeTab === 'temperature' ? temperature : activeTab === 'weight' ? weight : symptom];
    if (required.some(value => !value.trim())) { setSaveMessage('Enter the required reading before saving.'); return; }
    setSaving(true);
    try {
      const result = await logHealthMeasurement({
        log_type: activeTab,
        ...(activeTab === 'blood_pressure' ? { systolic: Number(systolic), diastolic: Number(diastolic) } : {}),
        ...(activeTab === 'blood_sugar' ? { glucose_value: Number(glucose), glucose_unit: 'mg_dL' } : {}),
        ...(activeTab === 'temperature' ? { temperature_c: Number(temperature) } : {}),
        ...(activeTab === 'weight' ? { weight_kg: Number(weight) } : {}),
        ...(activeTab === 'symptom' ? { symptom_name: symptom.trim() } : {}),
      });
      setSaveMessage(result.status === 'success' ? 'Reading saved on this device.' : result.error.message);
    } catch { setSaveMessage('Could not save this reading.'); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}


      <Text style={[styles.heading, { color: theme.text }]}>Health Logs & Vitals</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Record the readings you measured.
      </Text>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'blood_pressure' ? theme.primary : theme.surfaceVariant,
            },
          ]}
          onPress={() => setActiveTab('blood_pressure')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'blood_pressure' ? theme.onPrimary : theme.text },
            ]}
          >
            Blood Pressure
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'blood_sugar' ? theme.primary : theme.surfaceVariant,
            },
          ]}
          onPress={() => setActiveTab('blood_sugar')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'blood_sugar' ? theme.onPrimary : theme.text },
            ]}
          >
            Blood Glucose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'temperature' ? theme.primary : theme.surfaceVariant,
            },
          ]}
          onPress={() => setActiveTab('temperature')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'temperature' ? theme.onPrimary : theme.text },
            ]}
          >
            Temperature
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'weight' ? theme.primary : theme.surfaceVariant,
            },
          ]}
          onPress={() => setActiveTab('weight')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'weight' ? theme.onPrimary : theme.text },
            ]}
          >
            Weight
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'symptom' ? theme.primary : theme.surfaceVariant,
            },
          ]}
          onPress={() => setActiveTab('symptom')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'symptom' ? theme.onPrimary : theme.text },
            ]}
          >
            Symptoms
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dynamic Entry Form */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {!!saveMessage && <Text accessibilityLiveRegion="polite" style={{ color: theme.text }}>{saveMessage}</Text>}
        {activeTab === 'blood_pressure' && (
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Blood Pressure</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Systolic (mmHg) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="e.g. 120"
              placeholderTextColor={theme.textMuted}
              value={systolic}
              onChangeText={setSystolic}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Diastolic (mmHg) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="e.g. 80"
              placeholderTextColor={theme.textMuted}
              value={diastolic}
              onChangeText={setDiastolic}
            />
          </View>
        )}

        {activeTab === 'blood_sugar' && (
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Blood Glucose</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Glucose Value (mg/dL) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="e.g. 95"
              placeholderTextColor={theme.textMuted}
              value={glucose}
              onChangeText={setGlucose}
            />
          </View>
        )}

        {activeTab === 'temperature' && (
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Body Temperature</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Temperature (°C) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="e.g. 36.8"
              placeholderTextColor={theme.textMuted}
              value={temperature}
              onChangeText={setTemperature}
            />
          </View>
        )}

        {activeTab === 'weight' && (
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Body Weight</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Weight (kg) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="e.g. 68.5"
              placeholderTextColor={theme.textMuted}
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        )}

        {activeTab === 'symptom' && (
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Symptom</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Symptom Description *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. Mild headache, dizziness"
              placeholderTextColor={theme.textMuted}
              value={symptom}
              onChangeText={setSymptom}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
          onPress={() => void saveReading()}
          disabled={saving}
        >
          <Ionicons name="checkmark-done" size={20} color={theme.onPrimary} />
          <Text style={[styles.saveButtonText, { color: theme.onPrimary }]}>
            {saving ? 'Saving…' : 'Save reading'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frozen Tool Contracts Checklist */}

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
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabButtonText: { fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    fontWeight: '700',
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
