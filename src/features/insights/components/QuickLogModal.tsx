import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { linawTheme } from '../theme.tokens';
import { insightsService } from '../service/insights.service';
import type { GlucoseContext, GlucoseUnit } from '../contracts.proposal';

interface QuickLogModalProps {
  initialType?: 'blood_pressure' | 'blood_sugar';
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  initialType = 'blood_pressure',
  visible,
  onClose,
  onSuccess,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  const [activeTab, setActiveTab] = useState<'blood_pressure' | 'blood_sugar'>(initialType);

  // Blood Pressure fields
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');

  // Blood Sugar fields
  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>('mg_dL');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('unknown');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveLock = useRef(false);

  const resetForm = () => {
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setGlucoseValue('');
    setGlucoseContext('unknown');
    setError(null);
  };

  const handleSave = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const nowUtc = new Date().toISOString();

      if (activeTab === 'blood_pressure') {
        const sysNum = Number(systolic.trim());
        const diaNum = Number(diastolic.trim());
        const pulseNum = pulse.trim() ? Number(pulse.trim()) : null;

        if (isNaN(sysNum) || sysNum < 50 || sysNum > 260) {
          setError('Systolic must be a valid number between 50 and 260');
          setIsSubmitting(false);
          return;
        }

        if (isNaN(diaNum) || diaNum < 30 || diaNum > 160) {
          setError('Diastolic must be a valid number between 30 and 160');
          setIsSubmitting(false);
          return;
        }

        await insightsService.recordHealthLog({
          log_type: 'blood_pressure',
          systolic: sysNum,
          diastolic: diaNum,
          pulse_bpm: pulseNum,
          glucose_value: null,
          glucose_unit: null,
          glucose_context: null,
          temperature_c: null,
          weight_kg: null,
          symptom_name: null,
          symptom_severity: null,
          notes: null,
          recorded_at: nowUtc,
        });
      } else {
        const valNum = Number(glucoseValue.trim());

        if (isNaN(valNum) || valNum <= 0 || valNum > 600) {
          setError('Blood sugar must be a positive number');
          setIsSubmitting(false);
          return;
        }

        await insightsService.recordHealthLog({
          log_type: 'blood_sugar',
          systolic: null,
          diastolic: null,
          pulse_bpm: null,
          glucose_value: valNum,
          glucose_unit: glucoseUnit,
          glucose_context: glucoseContext,
          temperature_c: null,
          weight_kg: null,
          symptom_name: null,
          symptom_severity: null,
          notes: null,
          recorded_at: nowUtc,
        });
      }

      resetForm();
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record health reading';
      setError(msg);
      setIsSubmitting(false);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Record Health Reading</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Type Selector Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'blood_pressure' && {
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => {
                setActiveTab('blood_pressure');
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'blood_pressure' ? colors.primary : colors.textMuted,
                  },
                ]}
              >
                Blood Pressure
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'blood_sugar' && {
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => {
                setActiveTab('blood_sugar');
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'blood_sugar' ? colors.primary : colors.textMuted,
                  },
                ]}
              >
                Blood Sugar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {activeTab === 'blood_pressure' ? (
              <View style={styles.inputGroup}>
                <View style={styles.row}>
                  <View style={styles.halfCol}>
                    <Text style={[styles.label, { color: colors.text }]}>Systolic (mmHg)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="e.g. 120"
                      placeholderTextColor={colors.textMuted}
                      value={systolic}
                      onChangeText={setSystolic}
                    />
                  </View>

                  <View style={styles.halfCol}>
                    <Text style={[styles.label, { color: colors.text }]}>Diastolic (mmHg)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="e.g. 80"
                      placeholderTextColor={colors.textMuted}
                      value={diastolic}
                      onChangeText={setDiastolic}
                    />
                  </View>
                </View>

                <View style={styles.fullCol}>
                  <Text style={[styles.label, { color: colors.text }]}>Pulse BPM (Optional)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="e.g. 72"
                    placeholderTextColor={colors.textMuted}
                    value={pulse}
                    onChangeText={setPulse}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <View style={styles.fullCol}>
                  <Text style={[styles.label, { color: colors.text }]}>Glucose Value</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="e.g. 100"
                    placeholderTextColor={colors.textMuted}
                    value={glucoseValue}
                    onChangeText={setGlucoseValue}
                  />
                </View>

                {/* Unit Selector */}
                <View style={styles.fullCol}>
                  <Text style={[styles.label, { color: colors.text }]}>Unit</Text>
                  <View style={styles.unitRow}>
                    {(['mg_dL', 'mmol_L'] as GlucoseUnit[]).map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              glucoseUnit === u ? colors.primary : colors.surfaceVariant,
                          },
                        ]}
                        onPress={() => setGlucoseUnit(u)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: glucoseUnit === u ? colors.onPrimary : colors.text,
                            },
                          ]}
                        >
                          {u === 'mg_dL' ? 'mg/dL' : 'mmol/L'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Context Selector */}
                <View style={styles.fullCol}>
                  <Text style={[styles.label, { color: colors.text }]}>Context</Text>
                  <View style={styles.contextGrid}>
                    {(['fasting', 'before_meal', 'after_meal', 'random'] as GlucoseContext[]).map(
                      (c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.chip,
                            {
                              backgroundColor:
                                glucoseContext === c ? colors.primary : colors.surfaceVariant,
                            },
                          ]}
                          onPress={() => setGlucoseContext(c)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: glucoseContext === c ? colors.onPrimary : colors.text,
                              },
                            ]}
                          >
                            {c.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.privacyNote}>
              <Text style={[styles.privacyNoteText, { color: colors.textMuted }]}>
                🔒 Data stays on this device • Purely descriptive, never a medical diagnosis
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                {isSubmitting ? 'Saving...' : 'Save Reading'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 16,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
  },
  inputGroup: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  fullCol: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  privacyNote: {
    marginTop: 16,
    padding: 10,
    alignItems: 'center',
  },
  privacyNoteText: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
