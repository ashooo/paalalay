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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}
      <View style={[styles.ownerBadge, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="code-slash" size={14} color={theme.primary} />
        <Text style={[styles.ownerBadgeText, { color: theme.primary }]}>
          Dev 2 Module • Health Logs & Vitals
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>Health Logs & Vitals</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Record daily vitals locally in SQLite (health_logs table).
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
        >
          <Ionicons name="checkmark-done" size={20} color={theme.onPrimary} />
          <Text style={[styles.saveButtonText, { color: theme.onPrimary }]}>
            Save Vital Reading
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frozen Tool Contracts Checklist */}
      <View style={[styles.contractsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.contractsTitle, { color: theme.text }]}>
          Dev 2 Vital Tools Protocol:
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>log_blood_pressure</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>log_blood_sugar</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>log_temperature</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>log_weight</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>log_symptom</Text> (Write • Confirm)
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>get_health_history</Text> (Read)
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
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
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
