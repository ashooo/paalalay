import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => { /* Keep motion disabled if the preference cannot be read. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function ActivityFeedback({ label }: { label: string }) {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const reduced = useReducedMotion();
  const [dots] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    if (reduced) { dots.forEach(dot => dot.setValue(0)); return; }
    const cycles = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 140),
      Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(dot, { toValue: 0, duration: 320, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.delay((2 - index) * 140 + 180),
    ])));
    cycles.forEach(cycle => cycle.start());
    return () => cycles.forEach(cycle => cycle.stop());
  }, [dots, reduced]);
  return <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.row}>
    <View importantForAccessibility="no-hide-descendants" style={styles.dots}>{dots.map((dot, index) => <Animated.View key={index} style={[styles.dot, { backgroundColor: c.primary, opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]} />)}</View>
    <Text accessibilityLiveRegion="polite" style={[styles.label, { color: c.textMuted }]}>{label}</Text>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, dots: { flexDirection: 'row', gap: 5, paddingVertical: 4 }, dot: { height: 7, width: 7, borderRadius: 4 }, label: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, flexShrink: 1 } });
