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
  'Cautious': { color: '#F9A825' },
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

function DonutRing({ score, activeColor, isDesktop }) {
  const size = isDesktop ? 104 : RING_SIZE;
  const strokeWidth = isDesktop ? 11 : STROKE_WIDTH;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const cx = size / 2;
  const cy = size / 2;
  const filled = (pct / 100) * circumference;
  const gap = circumference - filled;
  const scoreLabel = score ?? '—';

  return (
    <View style={[styles.ringWrapper, isDesktop && { width: size, height: size, minWidth: size, minHeight: size, marginRight: 0 }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={styles.ringSvg}
      >
        <Circle cx={cx} cy={cy} r={radius} stroke={RING_BG} strokeWidth={strokeWidth} fill="none" />
        {pct > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${filled} ${gap}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
        )}
        <SvgText
          x={cx}
          y={cy}
          fill="#0F172A"
          fontSize={isDesktop ? 22 : 20}
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

function sentimentLabel(key) {
  return key === 'Cautions' ? 'Cautious' : key;
}

function LegendItem({ label, isActive, isDesktop }) {
  const cfg = SENTIMENT_CONFIG[label];
  return (
    <View style={[styles.legendItem, isDesktop && styles.desktopLegendItem]}>
      <View style={[styles.legendDot, isDesktop && styles.desktopLegendDot, { backgroundColor: cfg.color, opacity: isActive ? 1 : 0.35 }]} />
      <Text style={[styles.legendLabel, isDesktop && styles.desktopLegendLabel, isActive && styles.legendLabelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

import { useBreakpoint } from '@/hooks/useBreakpoint';

const ALL_SENTIMENTS = ['Extreme Fear', 'Fear', 'Mild Fear', 'Cautions', 'Mild Greed', 'Greed', 'Extreme Greed'];

function MarketSentimenter() {
  const { isDesktop } = useBreakpoint();
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
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDesktop && styles.desktopTitle]}>Market Sentimeter</Text>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>

      {/* Body: ring beside the legend on mobile; ring above two tag rows on web. */}
      <View style={[styles.body, isDesktop && styles.desktopBody]}>
        {isDesktop ? <View style={styles.desktopTopSpace} /> : null}
        <DonutRing score={score} activeColor={activeColor} isDesktop={isDesktop} />
        {isDesktop ? <View style={styles.desktopMidSpace} /> : null}

        {isDesktop ? (
          <View style={styles.desktopLegendStack}>
            <View style={styles.desktopLegendRow}>
              {LEFT_COLUMN.map((l) => (
                <LegendItem key={l} label={sentimentLabel(l)} isActive={activeSentiment === l} isDesktop />
              ))}
            </View>
            <View style={styles.desktopLegendRow}>
              {RIGHT_COLUMN.map((l) => (
                <LegendItem key={l} label={l} isActive={activeSentiment === l} isDesktop />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.legendContainer}>
            <View style={styles.legendCol}>
              {LEFT_COLUMN.map((l) => (
                <LegendItem key={l} label={sentimentLabel(l)} isActive={activeSentiment === l} />
              ))}
            </View>
            <View style={styles.legendCol}>
              {RIGHT_COLUMN.map((l) => (
                <LegendItem key={l} label={l} isActive={activeSentiment === l} />
              ))}
            </View>
          </View>
        )}
        {isDesktop ? <View style={styles.desktopBottomSpace} /> : null}
      </View>
    </View>
  );
}

export default memo(MarketSentimenter);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, backgroundColor: '#FFFFFF' },
  desktopContainer: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  desktopTitle: { fontSize: 18 },
  timestamp: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  body: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  desktopBody: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  desktopTopSpace: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  desktopMidSpace: { flexGrow: 1.7, flexShrink: 1, flexBasis: 18 },
  desktopBottomSpace: { flexGrow: 1.3, flexShrink: 1, flexBasis: 0 },
  // Ring — flexShrink/min size keeps SVG from collapsing on web; score lives inside SVG (no absolute overlay).
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    minWidth: RING_SIZE,
    minHeight: RING_SIZE,
    flexShrink: 0,
    marginRight: 20,
    ...(Platform.OS === 'web' ? { alignSelf: 'center' } : null),
  },
  ringSvg: { flexShrink: 0 },
  // Legend
  legendContainer: { flex: 1, flexDirection: 'row', gap: 16 },
  legendCol: { flex: 1, gap: 10 },
  desktopLegendStack: { alignItems: 'center', gap: 10, maxWidth: '100%' },
  desktopLegendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  desktopLegendItem: { flexShrink: 0 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  desktopLegendDot: { width: 7.5, height: 7.5, borderRadius: 3.75 },
  legendLabel: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: '#64748B' },
  desktopLegendLabel: { fontSize: 12, lineHeight: 16 },
  legendLabelActive: { color: '#0F172A', fontFamily: 'Inter_700Bold' },
});
