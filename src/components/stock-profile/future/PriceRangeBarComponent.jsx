import { memo, useId, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const TRACK_STOPS = [
  [0, [248, 113, 113]],
  [0.28, [248, 180, 180]],
  [0.5, [213, 222, 232]],
  [0.72, [167, 232, 197]],
  [1, [74, 222, 128]],
];
const EMPTY_TRACK = '#E2E8F0';
const LOW_COLOR = '#16A34A';
const HIGH_COLOR = '#DC2626';

const SVG_H = 28;
const STROKE = 6;
const OUTER_R = 9;
const INNER_R = 5;
const PAD = OUTER_R + 2;

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

function hex(channels) {
  return `#${channels.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function colorAt(ratio) {
  const t = Math.min(1, Math.max(0, ratio));
  let index = 1;
  while (index < TRACK_STOPS.length - 1 && TRACK_STOPS[index][0] < t) index += 1;
  const [start, from] = TRACK_STOPS[index - 1];
  const [end, to] = TRACK_STOPS[index];
  const span = end - start;
  return rgb(mix(from, to, span === 0 ? 0 : (t - start) / span));
}

function parseNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null) return null;
  const str = String(val).trim().replace(/[₹,%\s]/g, '');
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

function presentDistance(val) {
  const label = distanceLabel(val);
  if (!label) return null;
  const raw = label.trim().replace(/%$/, '').trim();
  if (!raw || raw === '+' || raw === '-' || raw === '−' || raw === '–') return null;
  if (/^[+−–-]/.test(raw)) return `${raw}%`;
  return `+ ${raw}%`;
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
  const [labelInsets, setLabelInsets] = useState({ left: 0, right: 0 });
  const model = buildRange({ high, low, price });

  const trackW = Math.max(0, trackBox.width - PAD * 2);
  const x0 = PAD;
  const x1 = PAD + trackW;
  const cy = SVG_H / 2;
  const markerX = x0 + model.ratio * trackW;
  const markerAbs = trackBox.x + markerX;
  const maxLeft = Math.max(0, rowWidth - priceWidth);
  const insetLeft = labelInsets.left + 8;
  const insetRight = labelInsets.right + 8;
  const openLeft = Math.max(0, rowWidth - priceWidth - insetRight);
  const priceLeft = priceWidth > 0 && openLeft > insetLeft
    ? Math.min(Math.max(insetLeft, markerAbs - priceWidth / 2), openLeft)
    : Math.min(Math.max(0, markerAbs - priceWidth / 2), maxLeft);
  const caretCenter = priceWidth > 0 ? markerAbs - priceLeft : 0;
  const caretLeft = Math.min(Math.max(8, caretCenter - 5), Math.max(8, priceWidth - 18));
  const gradId = `rangeGrad${uid}`;
  const lowText = formatRupee(model.lowNum);
  const highText = formatRupee(model.highNum);
  const markerText = formatRupee(model.priceNum);
  const summaryBase = model.empty
    ? `Low ${lowText}, High ${highText}`
    : `Price ${markerText}, Low ${lowText}, High ${highText}`;
  const lowDistance = presentDistance(distanceFromLow);
  const highDistance = presentDistance(distanceFromHigh);
  const summary = `${summaryBase}${lowDistance ? `, ${lowDistance} from low` : ''}${highDistance ? `, ${highDistance} from high` : ''}`;
  const ready = !model.empty && trackBox.width > 0 && rowWidth > 0;

  return (
    <View style={[styles.root, spaced ? styles.rootSpaced : null]} accessibilityRole="summary" accessibilityLabel={summary}>
      <View
        style={[styles.caption, spaced ? styles.captionSpaced : null]}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.width;
          if (next > 0) setRowWidth((prev) => (prev === next ? prev : next));
        }}
      >
        <Text
          style={styles.endLabel}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.width;
            if (next > 0) setLabelInsets((prev) => (prev.left === next ? prev : { ...prev, left: next }));
          }}
        >
          Low
        </Text>
        {ready ? (
          <View
            style={[styles.tooltip, { left: priceLeft, opacity: priceWidth > 0 ? 1 : 0 }]}
            onLayout={(e) => {
              const next = e.nativeEvent.layout.width;
              if (next > 0) setPriceWidth((prev) => (prev === next ? prev : next));
            }}
          >
            <Text style={styles.markerValue} numberOfLines={1}>{markerText}</Text>
            <View style={[styles.caretEdge, { left: caretLeft - 1 }]} />
            <View style={[styles.caret, { left: caretLeft }]} />
          </View>
        ) : null}
        <Text
          style={[styles.endLabel, styles.endAlignRight]}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.width;
            if (next > 0) setLabelInsets((prev) => (prev.right === next ? prev : { ...prev, right: next }));
          }}
        >
          High
        </Text>
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
                  {TRACK_STOPS.map(([offset, channels]) => (
                    <Stop key={offset} offset={offset} stopColor={hex(channels)} />
                  ))}
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

              {!model.empty ? (
                <>
                  <Circle cx={markerX} cy={cy} r={OUTER_R} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
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

      {lowDistance || highDistance ? (
        <View style={[styles.distanceBand, spaced ? styles.distanceSpaced : null]}>
          {lowDistance ? (
            <Text style={styles.distanceText} numberOfLines={1}>
              Distance from low : <Text style={styles.distanceLow}>{lowDistance}</Text>
            </Text>
          ) : <View />}
          {highDistance ? (
            <Text style={[styles.distanceText, styles.distanceEnd]} numberOfLines={1}>
              Distance from high : <Text style={styles.distanceHigh}>{highDistance}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}
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
    minHeight: f(28, 32),
    paddingBottom: 6,
    overflow: 'visible',
    zIndex: 2,
  },
  captionSpaced: { marginBottom: f(2, 4) },
  tooltip: {
    position: 'absolute',
    bottom: 6,
    zIndex: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  caretEdge: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E2E8F0',
  },
  caret: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  distanceBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: f(8, 10),
  },
  distanceSpaced: { marginTop: f(12, 14) },
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
  distanceText: {
    flexShrink: 1,
    fontSize: f(11, 12.5),
    lineHeight: f(15, 17),
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  distanceEnd: { textAlign: 'right' },
  distanceLow: {
    fontFamily: 'Inter_600SemiBold',
    color: LOW_COLOR,
  },
  distanceHigh: {
    fontFamily: 'Inter_600SemiBold',
    color: HIGH_COLOR,
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
