import { memo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const ACCENT = '#0071A9';

function ClockIcon({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.7} />
      <Path d="M12 8.2V12l2.6 1.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ComingSoon({ message }) {
  const styles = useFluidStyles(createStyles);
  const copy = message || 'This part of Richmonks will open here as soon as it is ready.';

  return (
    <View style={styles.root} accessibilityRole="text" accessibilityLabel={`Coming soon. ${copy}`}>
      <View style={styles.ring}>
        <View style={styles.halo}>
          <View style={styles.core}>
            <ClockIcon size={styles.icon.width} />
          </View>
        </View>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText} maxFontSizeMultiplier={1.1}>Coming Soon</Text>
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>{copy}</Text>
    </View>
  );
}

export default memo(ComingSoon);

const createStyles = (f) => {
  const ring = f(96, 112);
  const halo = f(74, 86);
  const core = f(50, 58);
  return {
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: f(32, 48), paddingBottom: f(24, 40) },
    ring: {
      width: ring,
      height: ring,
      borderRadius: ring / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(0, 113, 169, 0.28)',
    },
    halo: {
      width: halo,
      height: halo,
      borderRadius: halo / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 113, 169, 0.08)',
    },
    core: {
      width: core,
      height: core,
      borderRadius: core / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ACCENT,
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
    icon: { width: f(22, 26) },
    pill: {
      marginTop: f(22, 28),
      paddingHorizontal: f(12, 14),
      paddingVertical: f(5, 6),
      borderRadius: 999,
      backgroundColor: '#EEF6FB',
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    pillText: { fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: ACCENT, letterSpacing: 0.3 },
    body: { marginTop: f(12, 16), maxWidth: f(280, 360), fontSize: f(14, 16), lineHeight: f(20, 24), fontFamily: 'Inter_400Regular', color: '#64748B', textAlign: 'center' },
  };
};
