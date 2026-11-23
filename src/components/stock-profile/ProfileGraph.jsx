import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';

import LineGraph from '@/components/LineGraph';
import CandlestickGraph from '@/components/CandlestickGraph';
import { BookmarkIcon, LineGraphIcon } from '@/components/icons/StockProfileIcons';
import { useSocketEvent } from '@/hooks/useSocket';
import { socketRequest } from '@/utils/socket';
import { useFluidStyles } from '@/utils/responsive';

const ACTIVE = '#0071A9';
const GREEN = '#22C55E';
const RED = '#EF4444';
const CANDLE_FALLBACK_HEIGHT = 198;
const CANDLE_FALLBACK_HEIGHT_WIDE = 364;

const LINE_PERIODS = [
  { key: '1D', label: '1 Day' },
  { key: '5D', label: '5 Day' },
  { key: '30D', label: '30 Day' },
];

const CANDLE_PERIODS = [
  { key: '1D', label: '1D', series: 'candleGraph1Day' },
  { key: '5D', label: '5D', series: 'candleGraph5Days' },
  { key: '10D', label: '10D', series: 'candleGraph10Days' },
  { key: '20D', label: '20D', series: 'candleGraph20Days' },
  { key: '30D', label: '30D', series: 'candleGraph30Days' },
  { key: '60D', label: '60D', series: 'candleGraph60Days' },
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

function readCandleResponse(res) {
  const data = res?.result ?? res;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

function ProfileGraph({ data, period, onPeriodChange, periods, fill, symbol, optionType, strikePr, expiryState, keyStats, header }) {
  const styles = useFluidStyles(createStyles);
  const [localPeriod, setLocalPeriod] = useState('1D');
  const [chartWidth, setChartWidth] = useState(0);
  const [lineStackHeight, setLineStackHeight] = useState(0);
  const [graphMode, setGraphMode] = useState('line'); // 'line' | 'candle'
  const [candlePeriod, setCandlePeriod] = useState('1D');
  const [candleData, setCandleData] = useState(null);
  const candleFocused = useRef(false);
  const candleKey = useRef('');

  const lineItems = periods?.length ? periods : LINE_PERIODS;
  const items = graphMode === 'candle' ? CANDLE_PERIODS : lineItems;
  const compact = items.length > 3;
  const selected = graphMode === 'candle' ? candlePeriod : (period || localPeriod);
  const points = useMemo(() => graphPoints(data), [data]);

  // Candlestick socket. Both profiles stay mounted while the other is open and share
  // REC_CANDLESTICK_GRAPH, so only the visible one may apply a response, and it
  // re-requests its own contract (symbol, call/put, strike, expiry) on focus.
  const shouldFetchCandle = graphMode === 'candle' && !!symbol;
  useFocusEffect(useCallback(() => {
    candleFocused.current = true;
    if (shouldFetchCandle) {
      const key = `${symbol}|${optionType}|${strikePr}|${expiryState}`;
      if (candleKey.current !== key) {
        candleKey.current = key;
        setCandleData(null);
      }
      const payload = { symbol, option_type: optionType || 'XX', strike_pr: strikePr ?? 0, expiry_state: expiryState || 'near' };
      socketRequest('GET_CANDLESTICK_GRAPH', payload).then((res) => {
        if (!candleFocused.current) return;
        const parsed = res && typeof res === 'object' && !Array.isArray(res) ? res : null;
        if (parsed) setCandleData(parsed);
      }).catch(() => {});
    }
    return () => { candleFocused.current = false; };
  }, [shouldFetchCandle, symbol, optionType, strikePr, expiryState]));

  useSocketEvent('REC_CANDLESTICK_GRAPH', (res) => {
    if (!candleFocused.current || graphMode !== 'candle') return;
    const parsed = readCandleResponse(res);
    if (parsed) setCandleData(parsed);
  }, graphMode === 'candle');

  const candleMeta = CANDLE_PERIODS.find((item) => item.key === candlePeriod) ?? CANDLE_PERIODS[0];
  const candleSeries = useMemo(() => {
    const arr = candleData?.[candleMeta.series];
    return Array.isArray(arr) ? arr : [];
  }, [candleData, candleMeta.series]);

  const onChartBoxLayout = (event) => {
    if (Platform.OS !== 'web') return;
    const next = event.nativeEvent.layout.width;
    if (next > 0) setChartWidth((prev) => (prev === next ? prev : next));
  };

  const choose = (key) => {
    if (graphMode === 'candle') {
      setCandlePeriod(key);
    } else {
      if (onPeriodChange) onPeriodChange(key);
      else setLocalPeriod(key);
    }
  };

  const toggleMode = useCallback(() => {
    setGraphMode((prev) => (prev === 'line' ? 'candle' : 'line'));
  }, []);

  const onLineStackLayout = (event) => {
    const next = event.nativeEvent.layout.height;
    if (next > 0) setLineStackHeight((prev) => (prev === next ? prev : next));
  };

  const renderLineGraph = () => {
    if (fill) {
      return (
        <View style={styles.chartBox} onLayout={onChartBoxLayout}>
          <LineGraph flex largeTooltip data={points} height={190} style={Platform.OS === 'web' && chartWidth > 0 ? { width: chartWidth } : null} />
        </View>
      );
    }
    return <LineGraph largeTooltip data={points} height={190} />;
  };

  const candleHeight = lineStackHeight || (fill ? CANDLE_FALLBACK_HEIGHT_WIDE : CANDLE_FALLBACK_HEIGHT);

  return (
    <View style={fill ? styles.wideWrap : null}>
      {graphMode === 'candle' ? (
        <View style={[styles.candleStack, fill ? styles.candleStackWide : null, { height: candleHeight }]}>
          <CandlestickGraph data={candleSeries} height={candleHeight} keyStats={keyStats} />
        </View>
      ) : (
        <View onLayout={onLineStackLayout}>
          {header}
          <View style={[styles.graph, fill ? styles.graphWide : null]}>
            {renderLineGraph()}
          </View>
        </View>
      )}
      <View style={[styles.controls, fill ? styles.controlsWide : null]}>
        <View style={[styles.pills, compact ? styles.pillsCompact : null]}>
          {items.map((item) => {
            const active = item.key === selected;
            return (
              <Pressable
                key={item.key}
                onPress={() => choose(item.key)}
                style={[fill ? styles.pillWide : styles.pill, compact ? styles.pillCompact : null, fill && compact ? styles.pillCompactWide : null, active ? styles.pillActive : styles.pillIdle, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
              >
                <Text style={[styles.pillText, fill ? styles.pillTextWide : null, compact ? styles.pillTextCompact : null, active ? styles.pillTextActive : styles.pillTextIdle]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
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
            <Pressable onPress={toggleMode} accessibilityRole="button" accessibilityLabel={graphMode === 'line' ? 'Show candlestick chart' : 'Show line chart'} style={[styles.candle, styles.candleWide, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}>
              {graphMode === 'line' ? <CandlestickMark /> : <LineGraphIcon size={18} />}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={toggleMode} accessibilityRole="button" accessibilityLabel={graphMode === 'line' ? 'Show candlestick chart' : 'Show line chart'} style={[styles.candle, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}>
            {graphMode === 'line' ? <CandlestickMark /> : <LineGraphIcon size={18} />}
          </Pressable>
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
  pillsCompact: { flex: 1, gap: f(4, 6) },
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
  pillCompact: { flex: 1, minWidth: 0, height: f(28, 32), paddingHorizontal: f(2, 4) },
  pillText: { fontSize: f(12.5, 14), lineHeight: f(16, 18) },
  pillTextCompact: { fontSize: f(11.5, 13), lineHeight: f(15, 16) },
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
  candleStack: { paddingHorizontal: f(16, 24) },
  candleStackWide: { paddingHorizontal: 0, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  controlsWide: { marginTop: 36, paddingHorizontal: 0 },
  chartActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  watchlist: { height: 36, marginRight: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  watchlistText: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  pillWide: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pillCompactWide: { paddingVertical: 6, paddingHorizontal: 6 },
  pillTextWide: { fontSize: 13, lineHeight: 18 },
  candleWide: { width: 36, height: 36 },
});
