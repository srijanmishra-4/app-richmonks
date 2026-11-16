import { memo, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';

import PriceRangeBarComponent from '@/components/instrument/PriceRangeBarComponent';
import { useFluidStyles } from '@/utils/responsive';

const PERIODS = [
  { key: '1D', label: '1 Day', high: 'high', low: 'low', distHigh: 'dist_high', distLow: 'dist_low' },
  { key: '5D', label: '5 Day', high: 'high_5_days', low: 'low_5_days', distHigh: 'dist_high_5_day', distLow: 'dist_low_5_day' },
  { key: '20D', label: '20 Day', high: 'high_20_day', low: 'low_20_day', distHigh: 'dist_high_20_day', distLow: 'dist_low_20_day' },
  { key: '30D', label: '30 Day', high: 'high_30_days', low: 'low_30_days', distHigh: 'dist_high_30_day', distLow: 'dist_low_30_day' },
];

function HighLowRange({ profile }) {
  const styles = useFluidStyles(createStyles);
  const [period, setPeriod] = useState('1D');
  const meta = PERIODS.find((item) => item.key === period) ?? PERIODS[0];

  return (
    <View style={styles.section}>
      <Text style={styles.title} maxFontSizeMultiplier={1.1}>High Low Range</Text>
      <View style={styles.periods}>
        {PERIODS.map((item) => {
          const selected = item.key === period;
          return (
            <Pressable key={item.key} onPress={() => setPeriod(item.key)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.period, selected ? styles.periodActive : styles.periodIdle, Platform.OS === 'web' ? styles.pointer : null]}>
              <Text style={[styles.periodText, selected ? styles.periodTextActive : styles.periodTextIdle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <PriceRangeBarComponent high={profile?.[meta.high]} low={profile?.[meta.low]} price={profile?.price} wap={null} distanceFromLow={profile?.[meta.distLow] ?? null} distanceFromHigh={profile?.[meta.distHigh] ?? null} spaced />
    </View>
  );
}

export default memo(HighLowRange);

const createStyles = (f) => ({
  section: { marginTop: f(4, 6), marginBottom: f(12, 16) },
  title: { paddingHorizontal: f(16, 24), fontSize: f(16, 18), lineHeight: f(22, 24), fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2, color: '#0F172A' },
  periods: { flexDirection: 'row', alignItems: 'center', gap: f(8, 10), marginTop: f(14, 18), paddingHorizontal: f(16, 24) },
  period: { flex: 1, minWidth: 0, height: f(34, 38), paddingHorizontal: f(6, 8), borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodActive: { backgroundColor: '#EEF6FB', borderColor: '#D4E8F5' },
  periodIdle: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  periodText: { fontSize: f(12, 13), lineHeight: f(16, 18) },
  periodTextActive: { fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  periodTextIdle: { fontFamily: 'Inter_500Medium', color: '#64748B' },
  pointer: { cursor: 'pointer' },
});
