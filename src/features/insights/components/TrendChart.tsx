import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { linawTheme } from '../theme.tokens';

export interface BloodPressureTrendItem {
  recorded_at: string;
  systolic: number;
  diastolic: number;
}

export interface BloodSugarTrendItem {
  recorded_at: string;
  glucose_value: number;
  glucose_unit: string;
}

interface TrendChartProps {
  title: string;
  type: 'blood_pressure' | 'blood_sugar';
  bpData?: BloodPressureTrendItem[];
  sugarData?: BloodSugarTrendItem[];
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  type,
  bpData = [],
  sugarData = [],
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;
  const units = [...new Set(sugarData.map(reading => reading.glucose_unit))];
  if (type === 'blood_sugar' && units.length > 1) return <View>{units.map(unit => <TrendChart key={unit} title={`${title} · ${unit === 'mmol_L' ? 'mmol/L' : 'mg/dL'}`} type="blood_sugar" sugarData={sugarData.filter(reading => reading.glucose_unit === unit)} />)}</View>;

  const count = type === 'blood_pressure' ? bpData.length : sugarData.length;

  if (count === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>📈</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Trend Available
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Log at least 2 readings over time to view your 7-day trend chart.
          </Text>
        </View>
      </View>
    );
  }

  if (count === 1) {
    const singleReading =
      type === 'blood_pressure'
        ? `${bpData[0].systolic}/${bpData[0].diastolic} mmHg`
        : `${sugarData[0].glucose_value} ${sugarData[0].glucose_unit === 'mmol_L' ? 'mmol/L' : 'mg/dL'}`;

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.singleContainer}>
          <Text style={[styles.singleValue, { color: colors.text }]}>
            {singleReading}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            1 reading recorded. Add more readings to see a pattern over time.
          </Text>
        </View>
      </View>
    );
  }

  // Calculate range bounds
  let valuesToScale: number[] = [];
  if (type === 'blood_pressure') {
    valuesToScale = bpData.flatMap((d) => [d.systolic, d.diastolic]);
  } else {
    valuesToScale = sugarData.map((d) => d.glucose_value);
  }

  const rawMin = Math.min(...valuesToScale);
  const rawMax = Math.max(...valuesToScale);
  const padding = Math.max((rawMax - rawMin) * 0.15, 10);
  const minVal = Math.floor(rawMin - padding);
  const maxVal = Math.ceil(rawMax + padding);
  const range = Math.max(maxVal - minVal, 1);

  const chartHeight = 140;

  const getY = (val: number) => {
    const ratio = (val - minVal) / range;
    return chartHeight - ratio * chartHeight;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {type === 'blood_pressure' ? (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.chart_blood_pressure },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                Systolic
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.secondary },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                Diastolic
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.chart_blood_sugar },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                Blood Sugar
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Grid Reference Lines */}
      <View style={[styles.plotArea, { height: chartHeight }]}>
        <View style={[styles.gridLine, { top: 0, borderColor: colors.border }]} />
        <View
          style={[
            styles.gridLine,
            { top: chartHeight / 2, borderColor: colors.border },
          ]}
        />
        <View
          style={[
            styles.gridLine,
            { top: chartHeight - 1, borderColor: colors.border },
          ]}
        />

        {/* Data Bars / Points Representation */}
        <View style={styles.pointsRow}>
          {type === 'blood_pressure'
            ? bpData.map((d, index) => {
                const sysY = getY(d.systolic);
                const diaY = getY(d.diastolic);
                const dateLabel = new Date(d.recorded_at).toLocaleDateString(
                  undefined,
                  { weekday: 'narrow' }
                );

                return (
                  <View key={index} style={styles.columnWrapper}>
                    <View style={styles.columnArea}>
                      {/* Bar range connection between Diastolic and Systolic */}
                      <View
                        style={[
                          styles.rangeConnector,
                          {
                            top: sysY,
                            height: Math.max(diaY - sysY, 4),
                            backgroundColor: colors.surfaceVariant,
                          },
                        ]}
                      />
                      {/* Systolic Point */}
                      <View
                        style={[
                          styles.pointDot,
                          {
                            top: sysY - 4,
                            backgroundColor: colors.chart_blood_pressure,
                          },
                        ]}
                      />
                      {/* Diastolic Point */}
                      <View
                        style={[
                          styles.pointDot,
                          {
                            top: diaY - 4,
                            backgroundColor: colors.secondary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {dateLabel}
                    </Text>
                  </View>
                );
              })
            : sugarData.map((d, index) => {
                const y = getY(d.glucose_value);
                const dateLabel = new Date(d.recorded_at).toLocaleDateString(
                  undefined,
                  { weekday: 'narrow' }
                );

                return (
                  <View key={index} style={styles.columnWrapper}>
                    <View style={styles.columnArea}>
                      <View
                        style={[
                          styles.sugarBar,
                          {
                            top: y,
                            height: chartHeight - y,
                            backgroundColor: colors.surfaceVariant,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.pointDot,
                          {
                            top: y - 4,
                            backgroundColor: colors.chart_blood_sugar,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {dateLabel}
                    </Text>
                  </View>
                );
              })}
        </View>
      </View>

      <View style={styles.footerNote}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          7-day reading pattern • Min: {rawMin} / Max: {rawMax}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: linawTheme.radius.md,
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: linawTheme.typography.scale.subtitle.fontSize,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  singleContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  plotArea: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: '100%',
    alignItems: 'flex-end',
  },
  columnWrapper: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  columnArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  rangeConnector: {
    position: 'absolute',
    width: 8,
    borderRadius: 4,
  },
  sugarBar: {
    position: 'absolute',
    width: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  pointDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  footerNote: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerText: {
    fontSize: 12,
  },
});
