import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, Keyboard, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const rmIcon = require('@/assets/icon.png');

const DOT_ACTIVE = '#1A8CF0';
const DOT_IDLE = '#B8DDF8';
const DOT_COUNT = 3;
const STEP_MS = 360;
const BACKDROP = ['rgba(214, 234, 248, 0.55)', 'rgba(148, 178, 210, 0.45)', 'rgba(30, 58, 95, 0.4)'];

function Dot({ index, progress, size }) {
  const style = useAnimatedStyle(() => {
    const active = Math.max(0, 1 - Math.abs(progress.value - index));
    return { backgroundColor: interpolateColor(active, [0, 1], [DOT_IDLE, DOT_ACTIVE]), opacity: 0.75 + active * 0.25, transform: [{ scale: 1 + active * 0.2 }] };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

export function RMLoader() {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Ping-pong 0 → 2 → 0 gives the ● ○ ○ / ○ ● ○ / ○ ○ ● / ○ ● ○ sequence.
    progress.value = withRepeat(withTiming(DOT_COUNT - 1, { duration: STEP_MS * (DOT_COUNT - 1), easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(progress);
  }, [progress]);

  const card = Math.round(Math.min(128, Math.max(112, width * 0.3)));
  const logo = Math.round(card * 0.46);
  const dot = card >= 120 ? 9 : 8;

  return (
    <View style={[styles.card, { width: card, height: card, borderRadius: 22 }]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Image source={rmIcon} resizeMode="contain" style={{ width: logo, height: logo }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, marginTop: 6 }}>
        {Array.from({ length: DOT_COUNT }, (_, i) => <Dot key={i} index={i} progress={progress} size={dot} />)}
      </View>
    </View>
  );
}

function LoaderLayer() {
  const rootRef = useRef(null);
  const keyboardTopRef = useRef(null);
  const [overlap, setOverlap] = useState(0);

  // Portion of this layer hidden by the keyboard, so the card centers in what remains visible.
  const measure = useCallback(() => {
    const top = keyboardTopRef.current;
    if (top == null) { setOverlap(0); return; }
    rootRef.current?.measureInWindow((_x, y, _w, h) => setOverlap(Math.max(0, Math.round(y + h - top))));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.visualViewport) return undefined;
      const vp = window.visualViewport;
      const sync = () => { const inset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop); setOverlap(inset > 80 ? inset : 0); };
      sync();
      vp.addEventListener('resize', sync);
      vp.addEventListener('scroll', sync);
      return () => { vp.removeEventListener('resize', sync); vp.removeEventListener('scroll', sync); };
    }
    const onShow = (e) => { keyboardTopRef.current = e.endCoordinates?.screenY ?? null; measure(); };
    const onHide = () => { keyboardTopRef.current = null; measure(); };
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    if (Keyboard.isVisible()) { const metrics = Keyboard.metrics(); if (metrics) onShow({ endCoordinates: metrics }); }
    return () => subs.forEach((s) => s.remove());
  }, [measure]);

  return (
    <Animated.View ref={rootRef} entering={FadeIn.duration(140)} onLayout={measure} style={[StyleSheet.absoluteFill, styles.backdrop, { paddingBottom: overlap }]}>
      <LinearGradient colors={BACKDROP} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <RMLoader />
    </Animated.View>
  );
}

export function RMLoaderOverlay({ visible }) {
  return visible ? <LoaderLayer /> : null;
}

const styles = StyleSheet.create({
  backdrop: { zIndex: 1000, alignItems: 'center', justifyContent: 'center' },
  card: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)' }
      : { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }),
  },
});
