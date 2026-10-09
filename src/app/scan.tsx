import React from 'react';
import { Stack } from 'expo-router';
import { ScanPrescriptionScreen } from '@/features/ocr';

export default function ScanScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scan Prescription',
          headerTitleAlign: 'center',
        }}
      />
      <ScanPrescriptionScreen />
    </>
  );
}
