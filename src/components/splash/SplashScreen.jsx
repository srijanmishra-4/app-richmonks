import { useEffect } from 'react';
import { View, Text, Image, ImageBackground, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, cancelAnimation, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const bgMobile2 = require('@/assets/rm-bg-mobile-2.png');
const rmIcon = require('@/assets/icon.png');

const DOT_ACTIVE = '#1A8CF0';
const DOT_IDLE = '#B8DDF8';
const DOT_COUNT = 3;
const STEP_MS = 520;

function Dot({ index, progress, size }) {
  const style = useAnimatedStyle(() => {
    // Phase 0 = this dot's turn; the next dot fades in while this one fades out.
    const phase = (progress.value - index + DOT_COUNT) % DOT_COUNT;
    const t = interpolate(phase, [0, 0.5, 1, 2.5, 3], [1, 1, 0, 0, 1]);
    const active = t * t * (3 - 2 * t);
    return { backgroundColor: interpolateColor(active, [0, 1], [DOT_IDLE, DOT_ACTIVE]), opacity: 0.8 + active * 0.2, transform: [{ scale: 1 + active * 0.22 }] };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

export default function SplashScreen({ fontsReady, onReady }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(DOT_COUNT, { duration: STEP_MS * DOT_COUNT, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress]);

  // Sizes derive from the 9:16 artwork width so the composition holds on any screen.
  const u = Math.min(width, height * 0.5625, 480);
  const logo = u * 0.35;
  const fontSize = Math.max(14, u * 0.04);
  const dot = u * 0.036;

  return (
    <ImageBackground source={bgMobile2} resizeMode="cover" onLoadEnd={onReady} style={{ flex: 1, backgroundColor: '#DCEFFB' }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: height * 0.11 }}>
        <Image source={rmIcon} resizeMode="contain" style={{ width: logo, height: logo }} />
        <Text style={{ marginTop: -u * 0.054, fontSize, lineHeight: fontSize * 1.3, color: '#2B4A6F', letterSpacing: 0.3, fontFamily: fontsReady ? 'Inter_500Medium' : undefined, fontWeight: fontsReady ? undefined : '500' }}>
          Trust  Trade  Earn
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: u * 0.03, marginTop: u * 0.033 }} accessibilityRole="progressbar" accessibilityLabel="Loading">
          {Array.from({ length: DOT_COUNT }, (_, i) => <Dot key={i} index={i} progress={progress} size={dot} />)}
        </View>
      </View>
    </ImageBackground>
  );
}
