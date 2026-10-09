import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

export default function AssistantScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [inputText, setInputText] = useState('');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Module Owner Header */}
        <View style={[styles.ownerBadge, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="code-slash" size={14} color={theme.primary} />
          <Text style={[styles.ownerBadgeText, { color: theme.primary }]}>
            Dev 1 Module • Qwen3 Local Agent & Tool Dispatcher
          </Text>
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Alalay Assistant</Text>
        <Text style={[styles.subheading, { color: theme.textMuted }]}>
          Private, on-device Qwen3 1.7B GGUF running via llama.rn.
        </Text>

        {/* Clinical Guardrail Banner */}
        <View style={[styles.guardrailNotice, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
          <Text style={[styles.guardrailText, { color: theme.text }]}>
            Safety Constraint: AI proposes tool parameters but CANNOT write directly to the database. All actions require explicit user confirmation.
          </Text>
        </View>

        {/* Sample Mock Message (Dev 1 Loop Preview) */}
        <View style={[styles.messageBubble, { backgroundColor: theme.surfaceVariant, alignSelf: 'flex-start' }]}>
          <Text style={[styles.messageSender, { color: theme.primary }]}>Alalay</Text>
          <Text style={[styles.messageText, { color: theme.text }]}>
            Kumusta! I am your offline health companion. I can help log your blood pressure or look up your medication reminders.
          </Text>
        </View>

        {/* Confirmation Card Preview (Dev 1 Workflow Contract) */}
        <View style={[styles.confirmationCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <View style={styles.confirmHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.accent} />
            <Text style={[styles.confirmTitle, { color: theme.text }]}>
              Proposed Action: log_blood_pressure
            </Text>
          </View>
          <Text style={[styles.confirmDetail, { color: theme.textMuted }]}>
            Systolic: 120 mmHg | Diastolic: 80 mmHg
          </Text>

          <View style={styles.confirmButtonsRow}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: theme.onPrimary }]}>Confirm & Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Chat Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="Ask Alalay (e.g. 'I took 120/80 BP today')..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.primary }]}>
          <Ionicons name="arrow-up" size={20} color={theme.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
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
  guardrailNotice: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  guardrailText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
    marginBottom: 16,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  confirmationCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmDetail: {
    fontSize: 13,
    marginBottom: 12,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
