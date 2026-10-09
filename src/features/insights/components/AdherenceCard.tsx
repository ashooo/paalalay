import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { linawTheme } from '../theme.tokens';
import type { MedicationAdherenceSummary } from '../contracts.proposal';
import { EmptyStateCard } from './EmptyStateCard';

interface AdherenceCardProps {
  adherence?: MedicationAdherenceSummary | null;
}

export const AdherenceCard: React.FC<AdherenceCardProps> = ({ adherence }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  if (!adherence || adherence.scheduled_count === 0) {
    return (
      <EmptyStateCard
        icon="💊"
        title="No Medication Adherence Data"
        description="Your scheduled doses, taken records, and adherence percentage will appear here."
      />
    );
  }

  const percentage = Math.round(adherence.adherence_rate * 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.badgeText, { color: colors.secondary }]}>
            Medication Adherence
          </Text>
        </View>
        <Text style={[styles.periodText, { color: colors.textMuted }]}>
          Last 7 days
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.rateBlock}>
          <Text style={[styles.rateValue, { color: colors.text }]}>
            {percentage}%
          </Text>
          <Text style={[styles.rateLabel, { color: colors.textMuted }]}>
            Doses Taken
          </Text>
        </View>

        <View style={styles.countsBlock}>
          <View style={styles.countItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors.status_taken },
              ]}
            />
            <Text style={[styles.countLabel, { color: colors.textMuted }]}>
              Taken:
            </Text>
            <Text style={[styles.countValue, { color: colors.text }]}>
              {adherence.taken_count}
            </Text>
          </View>

          <View style={styles.countItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors.status_skipped },
              ]}
            />
            <Text style={[styles.countLabel, { color: colors.textMuted }]}>
              Skipped:
            </Text>
            <Text style={[styles.countValue, { color: colors.text }]}>
              {adherence.skipped_count}
            </Text>
          </View>

          <View style={styles.countItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors.surfaceVariant },
              ]}
            />
            <Text style={[styles.countLabel, { color: colors.textMuted }]}>
              Total scheduled:
            </Text>
            <Text style={[styles.countValue, { color: colors.text }]}>
              {adherence.scheduled_count}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBarBackground,
          { backgroundColor: colors.surfaceVariant },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: linawTheme.radius.md,
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: linawTheme.radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodText: {
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rateBlock: {
    alignItems: 'flex-start',
  },
  rateValue: {
    fontSize: linawTheme.typography.scale.reading.fontSize,
    fontWeight: '700',
    letterSpacing: -1,
  },
  rateLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  countsBlock: {
    gap: 6,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countLabel: {
    fontSize: 12,
  },
  countValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
