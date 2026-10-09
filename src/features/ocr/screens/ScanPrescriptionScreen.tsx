import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { extractPrescriptionText, parsePrescriptionHints } from '../services/ocrService';
import type { OcrHandoffPayload } from '../types';

interface ScanPrescriptionScreenProps {
  onHandoffToMedication?: (payload: OcrHandoffPayload) => void;
}

export function ScanPrescriptionScreen({ onHandoffToMedication }: ScanPrescriptionScreenProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request permissions and open Camera
  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Paalalay needs camera access to scan your prescription document.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        processImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  // Request permissions and open Gallery
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Access Required',
          'Paalalay needs photo gallery access to select a prescription image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        processImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not access photo library. Please try again.');
    }
  };

  // Run on-device OCR
  const processImage = async (uri: string) => {
    setImageUri(uri);
    setIsProcessing(true);
    setErrorMessage(null);

    const response = await extractPrescriptionText({ image_uri: uri });
    setIsProcessing(false);

    if (response.status === 'success' && response.data) {
      setExtractedText(response.data.raw_text);
    } else {
      setErrorMessage(
        response.error?.message ??
          'Could not extract text. Please ensure the prescription is clearly printed.'
      );
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setExtractedText('');
    setErrorMessage(null);
  };

  // Handoff to Dev 2 Medication Creation Form
  const handleProceedToMedication = () => {
    if (!extractedText.trim()) {
      Alert.alert('Review Required', 'Please ensure prescription text is not empty.');
      return;
    }

    const hints = parsePrescriptionHints(extractedText);
    const handoffPayload: OcrHandoffPayload = {
      raw_text: extractedText.trim(),
      requires_manual_review: true,
      source: 'ocr_verified',
      parsedHints: hints,
    };

    if (onHandoffToMedication) {
      onHandoffToMedication(handoffPayload);
    } else {
      // Coordinate with Dev 2's medication creation screen route
      router.push({
        pathname: '/medications',
        params: {
          ocr_raw_text: handoffPayload.raw_text,
          ocr_name: hints.suggestedName ?? '',
          ocr_strength: hints.suggestedStrength ?? '',
          ocr_instructions: hints.suggestedInstructions ?? '',
          source: 'ocr_verified',
          requires_manual_review: 'true',
        },
      });
    }
  };

  const hints = parsePrescriptionHints(extractedText);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header & Trust Banner */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Scan Prescription</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Optical recognition runs directly on your device. Never uploaded to the cloud.
        </Text>
        <View style={[styles.trustBadge, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
          <Text style={[styles.trustBadgeText, { color: theme.primary }]}>
            Works offline • Data stays on this device
          </Text>
        </View>
      </View>

      {/* State 1: No Image Captured Yet */}
      {!imageUri && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={56} color={theme.accent} />
          </View>
          <Text style={[styles.emptyPromptTitle, { color: theme.text }]}>
            Capture a Typed Prescription
          </Text>
          <Text style={[styles.emptyPromptDesc, { color: theme.textMuted }]}>
            For best results, lay the paper flat on a well-lit surface with no shadows or glare.
          </Text>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleCaptureCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={20} color={theme.onPrimary} />
              <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={20} color={theme.secondary} />
              <Text style={[styles.secondaryButtonText, { color: theme.secondary }]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* State 2: Processing On-Device OCR */}
      {imageUri && isProcessing && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
          <Text style={[styles.processingTitle, { color: theme.text }]}>
            Analyzing Document Locally...
          </Text>
          <Text style={[styles.processingDesc, { color: theme.textMuted }]}>
            Using on-device ML Kit text recognition.
          </Text>
        </View>
      )}

      {/* State 3: Error Occurred */}
      {imageUri && !isProcessing && errorMessage && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.error }]}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={[styles.errorTitle, { color: theme.error }]}>Scanning Issue</Text>
          <Text style={[styles.errorDesc, { color: theme.textMuted }]}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 16, borderColor: theme.border }]}
            onPress={handleReset}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>Try Another Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State 4: Review Extracted Text (Patient Safety Review Card) */}
      {imageUri && !isProcessing && extractedText.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewHeaderBadge}>
              <Ionicons name="create-outline" size={18} color={theme.primary} />
              <Text style={[styles.reviewHeaderTitle, { color: theme.text }]}>
                Verify Extracted Text
              </Text>
            </View>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[styles.retakeText, { color: theme.primary }]}>Retake</Text>
            </TouchableOpacity>
          </View>

          {/* Prescription Image Preview Thumbnail */}
          <View style={styles.thumbnailWrapper}>
            <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          </View>

          {/* Safety Notice */}
          <View style={[styles.safetyNotice, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.secondary} />
            <Text style={[styles.safetyNoticeText, { color: theme.text }]}>
              Double-check medicine name, dosage, and frequency against your printed prescription before continuing.
            </Text>
          </View>

          {/* Editable Transcription Input */}
          <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
            Editable Transcription:
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            value={extractedText}
            onChangeText={setExtractedText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {/* Extracted Hints Preview */}
          {(hints.suggestedName || hints.suggestedStrength) && (
            <View style={[styles.hintsContainer, { borderColor: theme.border }]}>
              <Text style={[styles.hintsTitle, { color: theme.textMuted }]}>
                Detected Parameters:
              </Text>
              {hints.suggestedName ? (
                <Text style={[styles.hintItem, { color: theme.text }]}>
                  • Medication: <Text style={styles.hintBold}>{hints.suggestedName}</Text>
                </Text>
              ) : null}
              {hints.suggestedStrength ? (
                <Text style={[styles.hintItem, { color: theme.text }]}>
                  • Strength: <Text style={styles.hintBold}>{hints.suggestedStrength}</Text>
                </Text>
              ) : null}
              {hints.suggestedInstructions ? (
                <Text style={[styles.hintItem, { color: theme.text }]}>
                  • Instructions: <Text style={styles.hintBold}>{hints.suggestedInstructions}</Text>
                </Text>
              ) : null}
            </View>
          )}

          {/* Handoff Confirmation Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: 16 }]}
            onPress={handleProceedToMedication}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward-outline" size={20} color={theme.onPrimary} />
            <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>
              Verify & Add Medication
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 20,
  },
  title: { fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  trustBadgeText: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginVertical: 16,
  },
  emptyPromptTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyPromptDesc: { fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  actionButtonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  primaryButtonText: { fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    width: '100%',
  },
  secondaryButtonText: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  processingTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  processingDesc: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  errorTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  errorDesc: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  reviewHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewHeaderTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
  },
  retakeText: { fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  safetyNotice: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    width: '100%',
    marginBottom: 14,
  },
  safetyNoticeText: { fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  inputLabel: { fontFamily: 'Manrope_600SemiBold',
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textArea: { fontFamily: 'Manrope_400Regular',
    width: '100%',
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  hintsContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  hintsTitle: { fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  hintItem: { fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  hintBold: {
    fontWeight: '700',
  },
});
