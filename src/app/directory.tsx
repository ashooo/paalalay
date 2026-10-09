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

export default function DirectoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Owner Header */}
      <View style={[styles.ownerBadge, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="code-slash" size={14} color={theme.primary} />
        <Text style={[styles.ownerBadgeText, { color: theme.primary }]}>
          Dev 3 Module • Offline Specialist Directory
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>Specialist Directory</Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Search curated offline clinics, hospitals, and medical practitioners.
      </Text>

      {/* Verified Data Guardrail Notice */}
      <View style={[styles.noticeCard, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
        <Text style={[styles.noticeText, { color: theme.text }]}>
          Safety Rule: All doctor listings are verified offline records. Listings are never hallucinated or fabricated by AI.
        </Text>
      </View>

      {/* Offline Directory Search Filter */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Search Directory</Text>

        <Text style={[styles.label, { color: theme.textMuted }]}>Medical Specialty *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Cardiology, Endocrinology, General Practice"
          placeholderTextColor={theme.textMuted}
          value={specialty}
          onChangeText={setSpecialty}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>City (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Quezon City, Pasig, Manila"
          placeholderTextColor={theme.textMuted}
          value={city}
          onChangeText={setCity}
        />

        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color={theme.onPrimary} />
          <Text style={[styles.searchButtonText, { color: theme.onPrimary }]}>
            Search Offline Directory
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frozen Tool Contracts Checklist */}
      <View style={[styles.contractsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.contractsTitle, { color: theme.text }]}>
          Dev 3 Frozen Tool Contract:
        </Text>
        <Text style={[styles.contractItem, { color: theme.textMuted }]}>
          • <Text style={styles.boldText}>search_specialists</Text> (Read)
        </Text>
        <Text style={[styles.contractDetails, { color: theme.textMuted }]}>
          Required: specialty (string)
        </Text>
        <Text style={[styles.contractDetails, { color: theme.textMuted }]}>
          Optional: city (string), limit (integer ≤30)
        </Text>
        <Text style={[styles.contractDetails, { color: theme.textMuted }]}>
          Returns: results [{'{'}id, specialty, doctor_name?, facility_name, address, city{'}'}]
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
  noticeCard: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
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
  searchButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contractsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  contractsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contractItem: {
    fontSize: 13,
  },
  contractDetails: {
    fontSize: 12,
    marginLeft: 10,
  },
  boldText: {
    fontWeight: '700',
  },
});
