import { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import LineGraph from '@/components/LineGraph';
import PriceRangeBarComponent from '@/components/instrument/PriceRangeBarComponent';
import { useFluidStyles } from '@/utils/responsive';

const ACTIVE = '#0071A9';
const GREEN = '#22C55E';
const RED = '#EF4444';

const PERIODS = [
  { key: '1D', label: '1 Day', high: 'high', low: 'low', series: 'graphData1Day' },
  { key: '5D', label: '5 Day', high: 'high_5_days', low: 'low_5_days', series: 'graphData5Days' },
  { key: '30D', label: '30 Day', high: 'high_30_days', low: 'low_30_days', series: 'graphData30Days' },
];

function graphPoints(series) {
  if (!Array.isArray(series)) return [];
  return series.map((pt) => ({
    price: pt?.price,
    price_change: pt?.price_change,
    price_change_value: pt?.price_change_value,
    cdate: pt?.cdate,
    time: pt?.time,
  }));
}

function CandlestickMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Line x1="5.5" y1="1.5" x2="5.5" y2="16.5" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
      <Rect x="3.4" y="4.5" width="4.2" height="8" rx="0.8" fill={GREEN} />
      <Line x1="12.5" y1="3" x2="12.5" y2="16.5" stroke={RED} strokeWidth="1.2" strokeLinecap="round" />
      <Rect x="10.4" y="7" width="4.2" height="6" rx="0.8" fill={RED} />
    </Svg>
  );
}

function KeyStatsOverview({ profile, graph }) {
  const styles = useFluidStyles(createStyles);
  const [period, setPeriod] = useState('1D');
  const meta = PERIODS.find((item) => item.key === period) ?? PERIODS[0];
  const series = graph?.[meta.series];
  const points = useMemo(() => graphPoints(series), [series]);

  return (
    <View style={styles.section}>
      <PriceRangeBarComponent
        high={profile?.[meta.high]}
        low={profile?.[meta.low]}
        price={profile?.price}
        wap={profile?.wap}
      />
      <View style={styles.graph}>
        <LineGraph data={points} height={190} />
      </View>
      <View style={styles.controls}>
        <View style={styles.pills}>
          {PERIODS.map((item) => {
            const selected = item.key === period;
            return (
              <Pressable
                key={item.key}
                onPress={() => setPeriod(item.key)}
                style={[styles.pill, selected ? styles.pillActive : styles.pillIdle, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
              >
                <Text style={[styles.pillText, selected ? styles.pillTextActive : styles.pillTextIdle]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.candle}>
          <CandlestickMark />
        </View>
      </View>
    </View>
  );
}

export default memo(KeyStatsOverview);

const createStyles = (f) => ({
  section: { paddingBottom: f(20, 24) },
  graph: { marginTop: f(8, 12), paddingHorizontal: f(16, 24) },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: f(12, 16),
    marginTop: f(16, 20),
    paddingHorizontal: f(16, 24),
  },
  pills: { flexDirection: 'row', alignItems: 'center', gap: f(8, 10), flexShrink: 1 },
  pill: {
    height: f(30, 34),
    minWidth: f(48, 56),
    paddingHorizontal: f(12, 14),
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: '#EEF6FB', borderColor: '#EEF6FB' },
  pillIdle: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  pillText: { fontSize: f(12.5, 14), lineHeight: f(16, 18) },
  pillTextActive: { fontFamily: 'Inter_500Medium', color: ACTIVE },
  pillTextIdle: { fontFamily: 'Inter_400Regular', color: '#64748B' },
  candle: {
    width: f(30, 34),
    height: f(30, 34),
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
