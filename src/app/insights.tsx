import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}
      <View style={[styles.ownerBadge, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="code-slash" size={14} color={theme.primary} />
        <Text style={[styles.ownerBadgeText, { color: theme.primary }]}>
          Dev 3 Module • Dashboard & Summaries
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>Health Insights</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Aggregated health analytics and medication adherence trends.
      </Text>

      {/* Contract Notice */}
      <View style={[styles.contractNotice, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.secondary} />
        <Text style={[styles.contractNoticeText, { color: theme.text }]}>
          Architecture Rule: Aggregates records via Dev 2’s read-only service without querying Dev 2 tables directly.
        </Text>
      </View>

      {/* 7-Day Medication Adherence Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="pie-chart-outline" size={20} color={theme.success} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Medication Adherence (7 Days)
          </Text>
        </View>
        <Text style={[styles.cardMetric, { color: theme.primary }]}>-- %</Text>
        <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
          Pending Dev 3 integration with get_health_summary contract.
        </Text>
      </View>

      {/* Vitals Summary Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="pulse-outline" size={20} color={theme.chart_blood_pressure} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Recent Readings Summary
          </Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Latest Blood Pressure:</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>Awaiting logs</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Latest Blood Sugar:</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>Awaiting logs</Text>
        </View>
      </View>

      {/* Frozen Tool Contracts Checklist */}
      <View style={[styles.contractsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.contractsTitle, { color: theme.text }]}>
          Dev 3 Frozen Tool Contract:
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>get_health_summary</Text> (Read)
        </Text>
        <Text style={[styles.contractDetails, { color: theme.textMuted }]}>
          Inputs: from (date), to (date), log_type? (enum)
        </Text>
        <Text style={[styles.contractDetails, { color: theme.textMuted }]}>
          Returns: counts, latest_readings, medication_adherence
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
  contractNotice: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  contractNoticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardMetric: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowLabel: {
    fontSize: 13,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  contractsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },
  contractsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  contractItem: {
    fontSize: 13,
    marginBottom: 2,
  },
  contractDetails: {
    fontSize: 12,
    marginLeft: 10,
  },
  boldText: {
    fontWeight: '700',
  },
});
