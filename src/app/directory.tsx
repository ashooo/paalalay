import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useColorScheme } from 'react-native';
import DoctorSearchScreen from '@/features/doctors/screens/DoctorSearchScreen';
import NearbyCareScreen from '@/features/care/NearbyCareScreen';
import { Colors } from '@/constants/theme';

export default function DirectoryRoute() {
  const [tab, setTab] = useState<'specialists' | 'maps'>('maps');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            tab === 'specialists' && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setTab('specialists')}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'specialists' ? theme.primary : theme.textMuted },
            ]}
          >
            Doctor Directory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            tab === 'maps' && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setTab('maps')}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'maps' ? theme.primary : theme.textMuted },
            ]}
          >
            Nearby Facilities (Maps)
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {tab === 'specialists' ? <DoctorSearchScreen /> : <NearbyCareScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
});
