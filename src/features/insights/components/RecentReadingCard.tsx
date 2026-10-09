import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { linawTheme } from '../theme.tokens';
import type { BloodPressureReading, BloodSugarReading } from '../contracts.proposal';
import { EmptyStateCard } from './EmptyStateCard';

interface BloodPressureCardProps {
  reading: BloodPressureReading | null | undefined;
  onRecordPress?: () => void;
}

export const BloodPressureRecentCard: React.FC<BloodPressureCardProps> = ({
  reading,
  onRecordPress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  if (!reading) {
    return (
      <EmptyStateCard
        icon="❤️"
        title="No Blood Pressure Recorded"
        description="Your latest blood pressure and pulse readings will appear here once logged."
        actionLabel={onRecordPress ? 'Log Blood Pressure' : undefined}
        onActionPress={onRecordPress}
      />
    );
  }

  const formattedDate = new Date(reading.recorded_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

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
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              Blood Pressure
            </Text>
          </View>
        </View>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {formattedDate}
        </Text>
      </View>

      <View style={styles.readingRow}>
        <Text style={[styles.primaryValue, { color: colors.text }]}>
          {reading.systolic}
          <Text style={[styles.slash, { color: colors.textMuted }]}>/</Text>
          {reading.diastolic}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>mmHg</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.subLabel, { color: colors.textMuted }]}>
          Latest reading
        </Text>
        {reading.pulse_bpm != null ? (
          <View style={styles.pulseContainer}>
            <Text style={[styles.pulseIcon, { color: colors.chart_blood_pressure }]}>
              💓
            </Text>
            <Text style={[styles.pulseText, { color: colors.text }]}>
              {reading.pulse_bpm} bpm
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

interface BloodSugarCardProps {
  reading: BloodSugarReading | null | undefined;
  onRecordPress?: () => void;
}

export const BloodSugarRecentCard: React.FC<BloodSugarCardProps> = ({
  reading,
  onRecordPress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  if (!reading) {
    return (
      <EmptyStateCard
        icon="🩸"
        title="No Blood Sugar Recorded"
        description="Your latest blood glucose readings and context will appear here once logged."
        actionLabel={onRecordPress ? 'Log Blood Sugar' : undefined}
        onActionPress={onRecordPress}
      />
    );
  }

  const formattedDate = new Date(reading.recorded_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const contextLabel = reading.glucose_context
    ? reading.glucose_context.replace('_', ' ')
    : 'general';

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
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.chart_blood_sugar }]}>
              Blood Sugar
            </Text>
          </View>
        </View>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {formattedDate}
        </Text>
      </View>

      <View style={styles.readingRow}>
        <Text style={[styles.primaryValue, { color: colors.text }]}>
          {reading.glucose_value}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>
          {reading.glucose_unit === 'mg_dL' ? 'mg/dL' : 'mmol/L'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.subLabel, { color: colors.textMuted }]}>
          Latest reading
        </Text>
        <View
          style={[
            styles.contextTag,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Text style={[styles.contextText, { color: colors.text }]}>
            {contextLabel}
          </Text>
        </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  timestamp: {
    fontSize: 12,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: 4,
  },
  primaryValue: {
    fontSize: linawTheme.typography.scale.reading.fontSize,
    fontWeight: '700',
    letterSpacing: -1,
  },
  slash: {
    fontSize: 32,
    fontWeight: '300',
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  subLabel: {
    fontSize: 13,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseIcon: {
    fontSize: 14,
  },
  pulseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contextTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: linawTheme.radius.sm,
  },
  contextText: {
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
});
