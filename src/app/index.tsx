import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { initializeDatabase } from '@/db';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((err) => console.error('[DB Init Error]:', err));
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Brand & Greeting Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: theme.text }]}>
            PA<Text style={{ color: theme.primary }}>ALALA</Text>Y
          </Text>
          <View style={[styles.dbBadge, { backgroundColor: dbReady ? theme.surfaceVariant : theme.backgroundElement }]}>
            <Ionicons
              name={dbReady ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={dbReady ? theme.success : theme.warning}
            />
            <Text style={[styles.dbBadgeText, { color: dbReady ? theme.success : theme.warning }]}>
              {dbReady ? 'Offline DB Ready' : 'Initializing DB...'}
            </Text>
          </View>
        </View>

        <Text style={[styles.tagline, { color: theme.textMuted }]}>
          Clear care, kept safely on your phone.
        </Text>

        {/* Offline & Trust Banner */}
        <View style={[styles.trustCard, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
          <Text style={[styles.trustText, { color: theme.primary }]}>
            Works offline • Data stays on this device
          </Text>
        </View>
      </View>

      {/* Quick Launch Cards */}
      <Text style={[styles.sectionHeading, { color: theme.text }]}>Quick Navigation</Text>

      <View style={styles.cardGrid}>
        {/* Dev 2: Medications */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/medications')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="medkit-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>My Medications</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Track doses, schedules & adherence (Dev 2)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Dev 2: Health Logs */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/health')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="heart-outline" size={24} color={theme.chart_blood_pressure} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Log Health Vitals</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              BP, blood sugar, temp, weight & symptoms (Dev 2)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Dev 4: OCR Scanner */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.primary, borderWidth: 1.5 }]}
          onPress={() => router.push('/scan')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="scan-circle-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Scan Prescription</Text>
              <View style={[styles.badgePill, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>Dev 4 OCR</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              On-device ML Kit text recognition with review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.primary} />
        </TouchableOpacity>

        {/* Dev 1: Assistant */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/assistant')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="chatbubbles-outline" size={24} color={theme.secondary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Alalay Assistant</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Local Qwen3 conversation & tool proposals (Dev 1)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Dev 3: Insights */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/insights')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="bar-chart-outline" size={24} color={theme.accent} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Health Insights</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Summaries, chart trends & adherence stats (Dev 3)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Dev 3: Doctor Directory */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/directory')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="business-outline" size={24} color={theme.secondary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Doctor Directory</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Search curated offline specialists & clinics (Dev 3)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
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
  header: {
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dbBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 14,
    marginBottom: 12,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  cardGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
