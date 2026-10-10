import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, useColorScheme } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import AppTabs from '@/components/app-tabs';
import { careIconFont } from '@/components/icons';
import { configureNotificationPresentation } from '@/features/medications/native-reminders';
import { getDatabase } from '@/db';

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, ...careIconFont });
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);
  useEffect(() => { void configureNotificationPresentation().catch(() => {}); }, []);
  useEffect(() => { if (Platform.OS !== 'web') void getDatabase().catch(() => { /* Feature screens report storage errors without resetting saved data. */ }); }, []);
  if (!loaded && !error) return null;
  return <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}><AppTabs /></ThemeProvider>;
}
