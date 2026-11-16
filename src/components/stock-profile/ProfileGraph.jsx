import { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import LineGraph from '@/components/LineGraph';
import { BookmarkIcon } from '@/components/icons/StockProfileIcons';
import { useFluidStyles } from '@/utils/responsive';

const ACTIVE = '#0071A9';
const GREEN = '#22C55E';
const RED = '#EF4444';

const PERIODS = [
  { key: '1D', label: '1 Day' },
  { key: '5D', label: '5 Day' },
  { key: '30D', label: '30 Day' },
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

function ProfileGraph({ data, period, onPeriodChange, fill }) {
  const styles = useFluidStyles(createStyles);
  const [localPeriod, setLocalPeriod] = useState('1D');
  const [chartWidth, setChartWidth] = useState(0);
  const selected = period || localPeriod;
  const points = useMemo(() => graphPoints(data), [data]);
  const onChartBoxLayout = (event) => {
    if (Platform.OS !== 'web') return;
    const next = event.nativeEvent.layout.width;
    if (next > 0) setChartWidth((prev) => (prev === next ? prev : next));
  };
  const choose = (key) => {
    if (onPeriodChange) onPeriodChange(key);
    else setLocalPeriod(key);
  };

  return (
    <View style={fill ? styles.wideWrap : null}>
      <View style={[styles.graph, fill ? styles.graphWide : null]}>
        {fill ? (
          <View style={styles.chartBox} onLayout={onChartBoxLayout}>
            <LineGraph flex largeTooltip data={points} height={190} style={Platform.OS === 'web' && chartWidth > 0 ? { width: chartWidth } : null} />
          </View>
        ) : (
          <LineGraph largeTooltip data={points} height={190} />
        )}
      </View>
      <View style={[styles.controls, fill ? styles.controlsWide : null]}>
        <View style={styles.pills}>
          {PERIODS.map((item) => {
            const active = item.key === selected;
            return (
              <Pressable
                key={item.key}
                onPress={() => choose(item.key)}
                style={[fill ? styles.pillWide : styles.pill, active ? styles.pillActive : styles.pillIdle, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
              >
                <Text style={[styles.pillText, fill ? styles.pillTextWide : null, active ? styles.pillTextActive : styles.pillTextIdle]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fill ? (
          <View style={styles.chartActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Watchlist" style={[styles.watchlist, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}>
              <BookmarkIcon size={16} />
              <Text style={styles.watchlistText} numberOfLines={1} maxFontSizeMultiplier={1.1}>Watchlist</Text>
            </Pressable>
            <View style={[styles.candle, styles.candleWide]}>
              <CandlestickMark />
            </View>
          </View>
        ) : (
          <View style={styles.candle}>
            <CandlestickMark />
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(ProfileGraph);

const createStyles = (f) => ({
  fill: { flex: 1, minHeight: 0 },
  graph: { marginTop: f(8, 12), paddingHorizontal: f(16, 24) },
  graphFill: { flex: 1, minHeight: 0 },
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
  wideWrap: { width: '100%', flexGrow: 1, flexShrink: 1, minHeight: 0 },
  graphWide: { marginTop: 44, paddingHorizontal: 0 },
  chartBox: { maxWidth: 1100, width: '100%', alignSelf: 'center', height: 320, maxHeight: 380 },
  controlsWide: { marginTop: 36, paddingHorizontal: 0 },
  chartActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  watchlist: { height: 36, marginRight: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  watchlistText: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  pillWide: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pillTextWide: { fontSize: 13, lineHeight: 18 },
  candleWide: { width: 36, height: 36 },
});
