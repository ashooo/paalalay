import React, { useState, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { linawTheme } from '../theme.tokens';
import { doctorService } from '../service/doctor.service';
import { fetchDoctors } from '@/services/api-client';
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

      const input = {
        specialty: trimmedSpecialty,
        city: trimmedCity || undefined,
        limit: 30,
      };
      const response = Platform.OS === 'web'
        ? await fetchDoctors(input)
        : await doctorService.searchDoctorsWithDetails(input);

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
    const isVerified = Boolean(item.verified_at && item.source_url);
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

        {item.latitude != null && item.longitude != null ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const url = Platform.select({
                ios: `maps:0,0?q=${item.latitude},${item.longitude}`,
                android: `geo:0,0?q=${item.latitude},${item.longitude}(${encodeURIComponent(item.facility_name)})`,
                default: `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
              });
              if (url) Linking.openURL(url).catch(() => {});
            }}
            style={styles.coordinatesRow}
          >
            <Text style={[styles.coordinatesText, { color: colors.textMuted }]}>
              📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} • View location
            </Text>
          </TouchableOpacity>
        ) : null}

        {item.phone ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${item.phone}`).catch(() => {})}
          >
            <Text style={[styles.contactText, { color: colors.secondary }]}>
              📞 Contact: {item.phone} (Tap to call)
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={item.source_url ? 0.7 : 1}
          onPress={() => {
            if (item.source_url) {
              Linking.openURL(item.source_url).catch(() => {});
            }
          }}
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
              ? `✓ Verified on ${dateFormatted} • ${item.source_url ? 'View directory source ↗' : 'Official Directory'}`
              : 'Unverified placeholder'}
          </Text>
        </TouchableOpacity>
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
  headerTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  trustCue: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: { fontFamily: 'Manrope_400Regular',
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: { fontFamily: 'Manrope_400Regular',
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
  chipText: { fontFamily: 'Manrope_600SemiBold',
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
  searchButtonText: { fontFamily: 'Manrope_600SemiBold',
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
  loadingText: { fontFamily: 'Manrope_400Regular',
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
  specialtyBadgeText: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
  doctorName: { fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  facilityName: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  contactText: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  coordinatesRow: {
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 13,
  },
  provenanceContainer: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  provenanceText: { fontFamily: 'Manrope_400Regular',
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
  emptyIconText: { fontFamily: 'Manrope_400Regular',
    fontSize: 28,
  },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
});
