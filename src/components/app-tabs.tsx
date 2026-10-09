import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { House, Pill, NotebookPen, MessageCircleHeart, Stethoscope } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
    tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
    tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 18 },
    tabBarHideOnKeyboard: true,
    sceneStyle: { backgroundColor: colors.background },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Paalalay', tabBarLabel: 'Home', tabBarIcon: ({ color }) => <House color={color} size={22} strokeWidth={1.75} /> }} />
    <Tabs.Screen name="medications" options={{ title: 'Medicines', tabBarIcon: ({ color }) => <Pill color={color} size={22} strokeWidth={1.75} /> }} />
    <Tabs.Screen name="health" options={{ title: 'Log', tabBarIcon: ({ color }) => <NotebookPen color={color} size={22} strokeWidth={1.75} /> }} />
    <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: ({ color }) => <MessageCircleHeart color={color} size={22} strokeWidth={1.75} /> }} />
    <Tabs.Screen name="directory" options={{ title: 'Nearby care', tabBarLabel: 'Care', tabBarIcon: ({ color }) => <Stethoscope color={color} size={22} strokeWidth={1.75} /> }} />
    <Tabs.Screen name="insights" options={{ href: null, title: 'Insights' }} />
    <Tabs.Screen name="scan" options={{ href: null, title: 'Scan prescription' }} />
    <Tabs.Screen name="memories" options={{ href: null, title: 'Memories' }} />
    <Tabs.Screen name="chat" options={{ href: null }} />
  </Tabs>;
}
