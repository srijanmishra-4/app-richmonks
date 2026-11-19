import { memo, useId, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const DEEP_RED = [185, 28, 28];
const FADED_GREEN = [165, 214, 167];
const DEEP_GREEN = [22, 101, 52];
const EMPTY_TRACK = '#E2E8F0';
const CAP_COLOR = '#334155';

const SVG_H = 28;
const STROKE = 4;
const OUTER_R = 7;
const INNER_R = 4;
const CAP_H = 12;
const PAD = OUTER_R + 1;

function rgb(channels) {
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function colorAt(ratio) {
  const t = Math.min(1, Math.max(0, ratio));
  const channels = t <= 0.5
    ? mix(DEEP_RED, FADED_GREEN, t / 0.5)
    : mix(FADED_GREEN, DEEP_GREEN, (t - 0.5) / 0.5);
  return rgb(channels);
}

function parseNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null) return null;
  const str = String(val).trim().replace(/[₹,\s]/g, '');
  if (!str || str === '-' || str === '+' || str === '.') return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function formatGrouped(val) {
  const num = typeof val === 'number' ? val : parseNum(val);
  if (num == null) return '—';
  const negative = num < 0;
  const [intRaw, dec] = Math.abs(num).toFixed(2).split('.');
  let grouped = intRaw;
  if (intRaw.length > 3) {
    const head = intRaw.slice(0, -3);
    const tail = intRaw.slice(-3);
    grouped = `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
  }
  const body = dec === '00' ? grouped : `${grouped}.${dec}`;
  return negative ? `-${body}` : body;
}

function formatRupee(val) {
  const grouped = formatGrouped(val);
  if (grouped === '—') return grouped;
  if (grouped.startsWith('-')) return `-₹${grouped.slice(1)}`;
  return `₹${grouped}`;
}

function distanceLabel(val) {
  if (val == null || typeof val === 'boolean' || typeof val === 'object') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? formatGrouped(val) : null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '—' || /^(null|undefined|nan|n\/a)$/i.test(s)) return null;
  return s;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function buildRange({ high, low, price }) {
  const lowNum = parseNum(low);
  const highNum = parseNum(high);
  const priceNum = parseNum(price);

  if (lowNum == null || highNum == null || priceNum == null) {
    return { empty: true, lowNum, highNum, priceNum: null, ratio: 0 };
  }

  const ratio = highNum === lowNum ? 0.5 : clamp01((priceNum - lowNum) / (highNum - lowNum));
  return { empty: false, lowNum, highNum, priceNum, ratio };
}

function PriceRangeBar({ high, low, price, distanceFromLow, distanceFromHigh, spaced }) {
  const styles = useFluidStyles(createStyles);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [rowWidth, setRowWidth] = useState(0);
  const [trackBox, setTrackBox] = useState({ x: 0, width: 0 });
  const [priceWidth, setPriceWidth] = useState(0);
  const model = buildRange({ high, low, price });

  const trackW = Math.max(0, trackBox.width - PAD * 2);
  const x0 = PAD;
  const x1 = PAD + trackW;
  const cy = SVG_H / 2;
  const markerX = x0 + model.ratio * trackW;
  const priceLeft = Math.min(Math.max(0, trackBox.x + markerX - priceWidth / 2), Math.max(0, rowWidth - priceWidth));
  const gradId = `rangeGrad${uid}`;
  const lowText = formatRupee(model.lowNum);
  const highText = formatRupee(model.highNum);
  const markerText = formatRupee(model.priceNum);
  const summaryBase = model.empty
    ? `Low ${lowText}, High ${highText}`
    : `Price ${markerText}, Low ${lowText}, High ${highText}`;
  const lowDistance = distanceLabel(distanceFromLow);
  const highDistance = distanceLabel(distanceFromHigh);
  const summary = `${summaryBase}${lowDistance ? `, ${lowDistance} from low` : ''}${highDistance ? `, ${highDistance} from high` : ''}`;
  const distanceRow = lowDistance || highDistance ? (
    <View style={[styles.distanceRow, spaced ? styles.distanceSpaced : null]}>
      {lowDistance ? <Text style={styles.distanceLow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{lowDistance}</Text> : null}
      {highDistance ? <Text style={styles.distanceHigh} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{highDistance}</Text> : null}
    </View>
  ) : null;

  return (
    <View style={[styles.root, spaced ? styles.rootSpaced : null]} accessibilityRole="summary" accessibilityLabel={summary}>
      <View
        style={[styles.caption, spaced ? styles.captionSpaced : null]}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.width;
          if (next > 0) setRowWidth((prev) => (prev === next ? prev : next));
        }}
      >
        <Text style={styles.endLabel}>Low</Text>
        {!model.empty && trackBox.width > 0 ? (
          <View
            style={[styles.markerLabel, { left: priceLeft, opacity: priceWidth > 0 ? 1 : 0 }]}
            onLayout={(e) => {
              const next = e.nativeEvent.layout.width;
              if (next > 0) setPriceWidth((prev) => (prev === next ? prev : next));
            }}
          >
            <Text style={styles.markerValue} numberOfLines={1}>{markerText}</Text>
          </View>
        ) : null}
        <Text style={[styles.endLabel, styles.endAlignRight]}>High</Text>
      </View>

      <View style={styles.barRow}>
        <Text style={[styles.sideValue, spaced ? styles.sideValueSpaced : null]} numberOfLines={1}>{lowText}</Text>
        <View
          style={styles.track}
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout;
            if (width > 0) setTrackBox((prev) => (prev.x === x && prev.width === width ? prev : { x, width }));
          }}
        >
          {trackBox.width > 0 && trackW > 0 ? (
            <Svg width={trackBox.width} height={SVG_H}>
              <Defs>
                <LinearGradient id={gradId} x1={x0} y1={cy} x2={x1} y2={cy} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={rgb(DEEP_RED)} />
                  <Stop offset="0.5" stopColor={rgb(FADED_GREEN)} />
                  <Stop offset="1" stopColor={rgb(DEEP_GREEN)} />
                </LinearGradient>
              </Defs>

              <Rect
                x={x0}
                y={cy - STROKE / 2}
                width={trackW}
                height={STROKE}
                rx={STROKE / 2}
                fill={model.empty ? EMPTY_TRACK : `url(#${gradId})`}
              />

              <Line x1={x0} y1={cy - CAP_H / 2} x2={x0} y2={cy + CAP_H / 2} stroke={CAP_COLOR} strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={x1} y1={cy - CAP_H / 2} x2={x1} y2={cy + CAP_H / 2} stroke={CAP_COLOR} strokeWidth={1.5} strokeLinecap="round" />

              {!model.empty ? (
                <>
                  <Circle cx={markerX} cy={cy} r={OUTER_R} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={1} />
                  <Circle cx={markerX} cy={cy} r={INNER_R} fill={colorAt(model.ratio)} />
                </>
              ) : null}
            </Svg>
          ) : (
            <View style={styles.trackFallback} />
          )}
        </View>
        <Text style={[styles.sideValue, styles.endAlignRight, spaced ? styles.sideValueSpaced : null]} numberOfLines={1}>{highText}</Text>
      </View>

      {distanceRow}
    </View>
  );
}

const PriceRangeBarComponent = memo(PriceRangeBar);

export default PriceRangeBarComponent;

const createStyles = (f) => ({
  root: {
    width: '100%',
    marginTop: f(4, 8),
    paddingHorizontal: f(16, 24),
  },
  rootSpaced: { marginTop: f(16, 20) },
  caption: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: f(18, 20),
    marginBottom: f(6, 8),
  },
  captionSpaced: { marginBottom: f(10, 12) },
  markerLabel: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideValue: {
    flexShrink: 1,
    maxWidth: '34%',
    fontSize: f(13, 14.5),
    lineHeight: f(18, 20),
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  sideValueSpaced: { color: '#1E293B' },
  track: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: f(8, 10),
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 2,
    gap: 12,
  },
  distanceSpaced: { marginTop: 8 },
  distanceLow: {
    width: '46%',
    fontSize: f(10, 11.5),
    lineHeight: f(13, 15),
    fontFamily: 'Inter_400Regular',
    color: '#DC2626',
    textAlign: 'left',
  },
  distanceHigh: {
    width: '46%',
    marginLeft: 'auto',
    fontSize: f(10, 11.5),
    lineHeight: f(13, 15),
    fontFamily: 'Inter_400Regular',
    color: '#16A34A',
    textAlign: 'right',
  },
  markerValue: {
    fontSize: f(12, 14),
    lineHeight: f(16, 18),
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
    textAlign: 'center',
  },
  trackFallback: {
    height: SVG_H,
  },
  endLabel: {
    fontSize: f(11, 12.5),
    lineHeight: f(16, 18),
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  endAlignRight: {
    textAlign: 'right',
  },
});
