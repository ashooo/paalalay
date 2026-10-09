import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { getHealthSummary } from '@/services/api-client';
import type { HealthSummaryData } from '@/features/insights/types';

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [summary, setSummary] = useState<HealthSummaryData>();
  const [message, setMessage] = useState('Loading saved readings…');
  useEffect(() => {
    let mounted = true;
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    void getHealthSummary({ from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }).then(result => {
      if (!mounted) return;
      if (result.status === 'success') { setSummary(result.data); setMessage('Last seven calendar days (UTC).'); }
      else setMessage(result.error.message);
    }).catch(() => { if (mounted) setMessage('Could not load saved readings.'); });
    return () => { mounted = false; };
  }, []);
  const bp = summary?.latest_readings.blood_pressure;
  const sugar = summary?.latest_readings.blood_sugar;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}


      <Text style={[styles.heading, { color: theme.text }]}>Health Insights</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Review your saved readings without labels or diagnoses.
      </Text>

      {/* Contract Notice */}


      {/* 7-Day Medication Adherence Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="pie-chart-outline" size={20} color={theme.success} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Saved readings (7 days)
          </Text>
        </View>
        <Text style={[styles.cardMetric, { color: theme.primary }]}>{summary?.counts.total ?? '—'}</Text>
        <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
          {message}
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
          <Text style={[styles.rowValue, { color: theme.text }]}>{bp ? `${bp.systolic}/${bp.diastolic} mmHg` : 'No saved reading'}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Latest Blood Sugar:</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>{sugar ? `${sugar.glucose_value} ${sugar.glucose_unit === 'mmol_L' ? 'mmol/L' : 'mg/dL'}` : 'No saved reading'}</Text>
        </View>
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
  contractNotice: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  contractNoticeText: { fontFamily: 'Manrope_400Regular',
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
  cardTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  cardMetric: { fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDescription: { fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowLabel: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  rowValue: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  contractsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },
  contractsTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  contractItem: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginBottom: 2,
  },
  contractDetails: { fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginLeft: 10,
  },
  boldText: {
    fontWeight: '700',
  },
});
