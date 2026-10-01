import { useState, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { socketRequest } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';

// ─── Sentiment Configuration ───────────────────────────────────────────────────
// Colors mapped from reference design. The remark from the API is mapped
// to one of these keys to decide the active ring color & highlighted legend item.

const SENTIMENT_CONFIG = {
  'Extreme Fear': { color: '#D32F2F' },
  'Fear': { color: '#E64A19' },
  'Mild Fear': { color: '#F57C00' },
  'Cautions': { color: '#F9A825' },
  'Mild Greed': { color: '#9CCC65' },
  'Greed': { color: '#43A047' },
  'Extreme Greed': { color: '#2E7D32' },
};

// Ordered labels for the legend (left column first, then right column)
const LEFT_COLUMN = ['Extreme Fear', 'Fear', 'Mild Fear', 'Cautions'];
const RIGHT_COLUMN = ['Mild Greed', 'Greed', 'Extreme Greed'];

// Map common backend remarks → sentiment keys
const REMARK_MAP = {
  'Extreme Fear': 'Extreme Fear',
  'Fear': 'Fear',
  'Mild Fear': 'Mild Fear',
  'Cautions': 'Cautions',
  'Cautious': 'Cautions',
  'Mild Greed': 'Mild Greed',
  'Greed': 'Greed',
  'Extreme Greed': 'Extreme Greed',
  'Bearish': 'Fear',
  'Mildly Bearish': 'Mild Fear',
  'Neutral': 'Cautions',
  'Mildly Bullish': 'Mild Greed',
  'Bullish': 'Greed',
  'Very Bullish': 'Extreme Greed',
  'Very Bearish': 'Extreme Fear',
};

function resolveRemark(remark) {
  if (!remark) return null;
  const trimmed = remark.trim();
  return REMARK_MAP[trimmed] || (SENTIMENT_CONFIG[trimmed] ? trimmed : null);
}

// ─── Donut Ring (SVG) ──────────────────────────────────────────────────────────

const RING_SIZE = 90;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING_BG = '#ECECEC';

function DonutRing({ score, activeColor }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const filled = (pct / 100) * CIRCUMFERENCE;
  const gap = CIRCUMFERENCE - filled;
  const scoreLabel = score ?? '—';

  return (
    <View style={styles.ringWrapper}>
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={styles.ringSvg}
      >
        <Circle cx={cx} cy={cy} r={RADIUS} stroke={RING_BG} strokeWidth={STROKE_WIDTH} fill="none" />
        {pct > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={RADIUS}
            stroke={activeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${filled} ${gap}`}
            strokeDashoffset={CIRCUMFERENCE * 0.25}
            strokeLinecap="round"
          />
        )}
        <SvgText
          x={cx}
          y={cy}
          fill="#0F172A"
          fontSize={20}
          fontFamily="Inter_700Bold"
          fontWeight="700"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {String(scoreLabel)}
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── Legend Item ────────────────────────────────────────────────────────────────

function LegendItem({ label, isActive }) {
  const cfg = SENTIMENT_CONFIG[label];
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: cfg.color, opacity: isActive ? 1 : 0.35 }]} />
      <Text style={[styles.legendLabel, isActive && styles.legendLabelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

function MarketSentimenter() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(() => socketRequest('GET_MARKET_SENTIMETER'), []);

  useSocketEvent('REC_MARKET_SENTIMETER', (res, _err, raw) => {
    const payload = res ?? raw;
    if (payload) setData(payload);
  });

  useEffect(() => { fetchData().catch(() => { }); }, [fetchData]);
  useRegisterRefresh(fetchData);

  const score = data?.score ?? 0;
  const remark = data?.remark;
  const timestamp = data?.timestamp;
  const activeSentiment = resolveRemark(remark);
  const activeColor = activeSentiment ? SENTIMENT_CONFIG[activeSentiment].color : RING_BG;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Market Sentiment</Text>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>

      {/* Body: Ring + Legend */}
      <View style={styles.body}>
        <DonutRing score={score} activeColor={activeColor} />

        {/* Legend — 2 columns */}
        <View style={styles.legendContainer}>
          <View style={styles.legendCol}>
            {LEFT_COLUMN.map((l) => <LegendItem key={l} label={l} isActive={activeSentiment === l} />)}
          </View>
          <View style={styles.legendCol}>
            {RIGHT_COLUMN.map((l) => <LegendItem key={l} label={l} isActive={activeSentiment === l} />)}
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(MarketSentimenter);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  timestamp: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  body: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  // Ring — flexShrink/min size keeps SVG from collapsing on web; score lives inside SVG (no absolute overlay).
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    minWidth: RING_SIZE,
    minHeight: RING_SIZE,
    flexShrink: 0,
    marginRight: 22,
    ...(Platform.OS === 'web' ? { alignSelf: 'flex-start' } : null),
  },
  ringSvg: { flexShrink: 0 },
  // Legend
  legendContainer: { flex: 1, flexDirection: 'row', gap: 12 },
  legendCol: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  legendLabelActive: { color: '#0F172A', fontFamily: 'Inter_700Bold' },
});
