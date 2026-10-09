import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { linawTheme } from '../theme.tokens';
import {
  insightsService,
  BloodPressureTrendPoint,
  BloodSugarTrendPoint,
} from '../service/insights.service';
import type { GetHealthSummaryOutputData } from '../contracts.proposal';
import {
  BloodPressureRecentCard,
  BloodSugarRecentCard,
} from '../components/RecentReadingCard';
import { TrendChart } from '../components/TrendChart';
import { AdherenceCard } from '../components/AdherenceCard';
import { QuickLogModal } from '../components/QuickLogModal';

export default function HealthDashboardScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<GetHealthSummaryOutputData | null>(null);
  const [bpTrends, setBpTrends] = useState<BloodPressureTrendPoint[]>([]);
  const [sugarTrends, setSugarTrends] = useState<BloodSugarTrendPoint[]>([]);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [overview, bpHistory, sugarHistory] = await Promise.all([
        insightsService.getDashboardOverview(),
        insightsService.getBloodPressureTrends(7),
        insightsService.getBloodSugarTrends(7),
      ]);

      setSummaryData(overview);
      setBpTrends(bpHistory);
      setSugarTrends(sugarHistory);
    } catch (err) {
      console.error('Failed to load health insights:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const totalLogsCount = summaryData
    ? Object.values(summaryData.counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Linaw Trust Cue */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <View style={styles.wordmarkRow}>
              <Text style={[styles.brandText, { color: colors.text }]}>PA</Text>
              <Text style={[styles.brandHighlight, { color: colors.primary }]}>ALALA</Text>
              <Text style={[styles.brandText, { color: colors.text }]}>Y</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Health Insights & Trends
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsLogModalVisible(true)}
            activeOpacity={0.8}
            style={[styles.addReadingButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addReadingText, { color: colors.onPrimary }]}>+ Log Reading</Text>
          </TouchableOpacity>
        </View>

        {/* Offline & Privacy Trust Badge */}
        <View style={[styles.trustBadge, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.trustBadgeText, { color: colors.primary }]}>
            🛡️ Works offline • Data stays on this device
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your health overview...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Section: Latest Readings */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Latest Readings
              </Text>
              {totalLogsCount > 0 ? (
                <Text style={[styles.countBadge, { color: colors.textMuted }]}>
                  {totalLogsCount} total this week
                </Text>
              ) : null}
            </View>

            <BloodPressureRecentCard
              reading={summaryData?.latest_readings?.blood_pressure}
              onRecordPress={() => setIsLogModalVisible(true)}
            />

            <BloodSugarRecentCard
              reading={summaryData?.latest_readings?.blood_sugar}
              onRecordPress={() => setIsLogModalVisible(true)}
            />
          </View>

          {/* Section: 7-Day Trend Patterns */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7-Day Trend Patterns
            </Text>

            <TrendChart
              title="Blood Pressure Trend"
              type="blood_pressure"
              bpData={bpTrends}
            />

            <TrendChart
              title="Blood Sugar Trend"
              type="blood_sugar"
              sugarData={sugarTrends}
            />
          </View>

          {/* Section: Medication Adherence */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Medication Adherence
            </Text>

            <AdherenceCard adherence={summaryData?.medication_adherence} />
          </View>

          {/* Clinical Safety & Privacy Note */}
          <View style={styles.safetyFooter}>
            <Text style={[styles.safetyText, { color: colors.textMuted }]}>
              Paalalay records and summarizes your daily health readings for personal reference.
              It does not diagnose, interpret, or prescribe medical treatments.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Manual Quick Log Modal */}
      <QuickLogModal
        visible={isLogModalVisible}
        onClose={() => setIsLogModalVisible(false)}
        onSuccess={() => {
          loadDashboardData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandHighlight: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addReadingButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: linawTheme.radius.pill,
  },
  addReadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trustBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: linawTheme.radius.sm,
    alignSelf: 'flex-start',
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  countBadge: {
    fontSize: 12,
  },
  safetyFooter: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  safetyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
