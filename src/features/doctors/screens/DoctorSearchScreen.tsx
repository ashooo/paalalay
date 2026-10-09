import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { linawTheme } from '../theme.tokens';
import { doctorService } from '../service/doctor.service';
import { seedPlaceholderDoctors } from '../data/seed';
import type { DoctorModel } from '../contracts.proposal';

const QUICK_SPECIALTIES = [
  'Cardiology',
  'Endocrinology',
  'General Medicine',
  'Pediatrics',
  'Pulmonology',
];

export default function DoctorSearchScreen() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  const [specialty, setSpecialty] = useState('Cardiology');
  const [city, setCity] = useState('');
  const [doctors, setDoctors] = useState<DoctorModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-seed fake placeholder data on first mount if not present, then do initial search
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await seedPlaceholderDoctors();
        if (isMounted) {
          executeSearch('Cardiology', '');
        }
      } catch (err) {
        console.error('Failed to initialize doctors seed:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const executeSearch = useCallback(
    async (selectedSpecialty: string, selectedCity: string) => {
      const trimmedSpecialty = selectedSpecialty.trim();
      const trimmedCity = selectedCity.trim();

      if (!trimmedSpecialty) {
        setValidationError('Please enter or select a specialty');
        setDoctors([]);
        return;
      }

      setValidationError(null);
      setIsLoading(true);
      setHasSearched(true);

      const response = await doctorService.searchDoctorsWithDetails({
        specialty: trimmedSpecialty,
        city: trimmedCity || undefined,
        limit: 30,
      });

      setIsLoading(false);

      if (response.status === 'success') {
        setDoctors(response.data.doctors);
      } else {
        setValidationError(response.error.message);
        setDoctors([]);
      }
    },
    []
  );

  const handleSearchPress = () => {
    executeSearch(specialty, city);
  };

  const handleSelectQuickSpecialty = (item: string) => {
    setSpecialty(item);
    executeSearch(item, city);
  };

  const renderDoctorItem = ({ item }: { item: DoctorModel }) => {
    const isVerified = Boolean(item.verified_at);
    const dateFormatted = item.verified_at
      ? new Date(item.verified_at).toLocaleDateString()
      : null;

    return (
      <View
        style={[
          styles.doctorCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.specialtyBadge,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.specialtyBadgeText, { color: colors.primary }]}>
              {item.specialty}
            </Text>
          </View>
        </View>

        {item.doctor_name ? (
          <Text style={[styles.doctorName, { color: colors.text }]}>
            {item.doctor_name}
          </Text>
        ) : null}

        <Text style={[styles.facilityName, { color: colors.text }]}>
          {item.facility_name}
        </Text>

        <Text style={[styles.addressText, { color: colors.textMuted }]}>
          {item.address}, {item.city}
        </Text>

        {item.phone ? (
          <Text style={[styles.contactText, { color: colors.secondary }]}>
            Contact: {item.phone}
          </Text>
        ) : null}

        <View
          style={[
            styles.provenanceContainer,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Text
            style={[
              styles.provenanceText,
              { color: isVerified ? colors.success : colors.textMuted },
            ]}
          >
            {isVerified
              ? `Verified on ${dateFormatted} • ${item.source_url ?? 'Official Directory'}`
              : 'Unverified placeholder'}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyBadge,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Text style={[styles.emptyIconText, { color: colors.primary }]}>
            ⚕️
          </Text>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No doctors found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Try another specialty or city.
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header & Trust Cue */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Find Doctors
        </Text>
        <Text style={[styles.trustCue, { color: colors.textMuted }]}>
          Works offline • Data stays on this device
        </Text>
      </View>

      {/* Specialty Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Specialty
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: validationError ? colors.error : colors.border,
              color: colors.text,
            },
          ]}
          value={specialty}
          onChangeText={(text) => {
            setSpecialty(text);
            if (validationError) setValidationError(null);
          }}
          placeholder="e.g. Cardiology, Pediatrics"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />
        {validationError ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {validationError}
          </Text>
        ) : null}
      </View>

      {/* Quick Specialty Chips */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_SPECIALTIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = specialty.toLowerCase() === item.toLowerCase();
            return (
              <TouchableOpacity
                onPress={() => handleSelectQuickSpecialty(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.onPrimary : colors.text,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* City Input & Search Button */}
      <View style={styles.cityAndSearchRow}>
        <View style={styles.cityInputWrapper}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            City (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Manila, Pasig"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          onPress={handleSearchPress}
          style={[
            styles.searchButton,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.searchButtonText, { color: colors.onPrimary }]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Searching offline records…
          </Text>
        </View>
      ) : null}

      {/* Results List */}
      <FlatList
        data={doctors}
        keyExtractor={(item) => item.id}
        renderItem={renderDoctorItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={hasSearched ? renderEmptyState : null}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  trustCue: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  chipsContainer: {
    marginBottom: 12,
    maxHeight: 44,
  },
  chip: {
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cityAndSearchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  cityInputWrapper: {
    flex: 1,
  },
  searchButton: {
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 40,
  },
  doctorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  specialtyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specialtyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  provenanceContainer: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  provenanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
