import { memo, useId, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

// Full-track gradient. The solid side is a clip of these stops; the other side is a dash.
const DEEP_RED = [185, 28, 28];
const FADED_GREEN = [165, 214, 167];
const DEEP_GREEN = [22, 101, 52];
const DOTTED_GREEN = '#22C55E';
const DOTTED_RED = '#EF4444';
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

function buildRange({ high, low, price, wap }) {
  const hasWap = wap != null && String(wap).trim() !== '';
  const lowNum = parseNum(low);
  const highNum = parseNum(high);
  const priceNum = parseNum(price);
  const wapNum = hasWap ? parseNum(wap) : null;
  const markerNum = hasWap ? wapNum : priceNum;
  const missing = lowNum == null || highNum == null || markerNum == null || (hasWap && priceNum == null);

  if (missing) {
    return { empty: true, hasWap, lowNum, highNum, markerNum: null, ratio: 0, solidFrom: 0, solidTo: 0, dotted: null };
  }

  const ratio = highNum === lowNum ? 0.5 : clamp01((markerNum - lowNum) / (highNum - lowNum));
  let solidFrom = 0;
  let solidTo = 1;
  let dotted = null;

  if (hasWap && priceNum < wapNum) {
    solidTo = ratio;
    dotted = { from: ratio, to: 1, color: DOTTED_GREEN };
  } else if (hasWap && priceNum > wapNum) {
    solidFrom = ratio;
    dotted = { from: 0, to: ratio, color: DOTTED_RED };
  }

  return { empty: false, hasWap, lowNum, highNum, markerNum, ratio, solidFrom, solidTo, dotted };
}

function dashSegment(from, to, x0, trackW, markerX) {
  if (to - from <= 0.001) return null;
  let start = x0 + from * trackW;
  let end = x0 + to * trackW;
  const gap = OUTER_R;
  if (Math.abs(start - markerX) < 0.5) start = markerX + gap;
  if (Math.abs(end - markerX) < 0.5) end = markerX - gap;
  if (end - start < 4) return null;
  return { start, end };
}

function PriceRangeBar({ high, low, price, wap, distanceFromLow, distanceFromHigh, spaced }) {
  const styles = useFluidStyles(createStyles);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(0);
  const model = buildRange({ high, low, price, wap });

  const trackW = Math.max(0, width - PAD * 2);
  const x0 = PAD;
  const x1 = PAD + trackW;
  const cy = SVG_H / 2;
  const markerX = x0 + model.ratio * trackW;
  const solidX = x0 + model.solidFrom * trackW;
  const solidW = Math.max(0, (model.solidTo - model.solidFrom) * trackW);
  const dash = model.dotted ? dashSegment(model.dotted.from, model.dotted.to, x0, trackW, markerX) : null;
  const labelLeft = Math.min(Math.max(0, markerX - labelWidth / 2), Math.max(0, width - labelWidth));
  const gradId = `rangeGrad${uid}`;
  const clipId = `rangeClip${uid}`;
  const lowText = formatGrouped(model.lowNum);
  const highText = formatGrouped(model.highNum);
  const markerText = formatGrouped(model.markerNum);
  const summaryBase = model.empty
    ? `Low ${lowText}, High ${highText}`
    : `${model.hasWap ? 'WAP' : 'Price'} ${markerText}, Low ${lowText}, High ${highText}`;
  const lowDistance = distanceLabel(distanceFromLow);
  const highDistance = distanceLabel(distanceFromHigh);
  const summary = `${summaryBase}${lowDistance ? `, ${lowDistance} from low` : ''}${highDistance ? `, ${highDistance} from high` : ''}`;
  const markerSlot = (
    <View style={[styles.labelSlot, spaced ? styles.labelSlotSpaced : null]}>
      {!model.empty && width > 0 ? (
        <View
          style={[styles.markerLabel, spaced ? styles.markerSpaced : null, { left: labelLeft, opacity: labelWidth > 0 ? 1 : 0 }]}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.width;
            if (next > 0) setLabelWidth((prev) => (prev === next ? prev : next));
          }}
        >
          <Text style={styles.markerValue} numberOfLines={1}>{markerText}</Text>
          {model.hasWap ? <Text style={styles.markerCaption}>WAP</Text> : null}
        </View>
      ) : null}
    </View>
  );
  const distanceRow = lowDistance || highDistance ? (
    <View style={[styles.distanceRow, spaced ? styles.distanceSpaced : null]}>
      {lowDistance ? <Text style={styles.distanceLow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{lowDistance}</Text> : null}
      {highDistance ? <Text style={styles.distanceHigh} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{highDistance}</Text> : null}
    </View>
  ) : null;

  return (
    <View style={[styles.root, spaced ? styles.rootSpaced : null]} accessibilityRole="summary" accessibilityLabel={summary}>
      <View
        style={styles.track}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.width;
          if (next > 0) setWidth((prev) => (prev === next ? prev : next));
        }}
      >
        <View style={[styles.ends, spaced ? styles.endsSpaced : null]}>
          <View style={styles.endLeft}>
            <Text style={styles.endLabel}>Low</Text>
            <Text style={[styles.endValue, spaced ? styles.endValueSpaced : null]} numberOfLines={1}>{lowText}</Text>
          </View>
          <View style={styles.endRight}>
            <Text style={[styles.endLabel, styles.endAlignRight]}>High</Text>
            <Text style={[styles.endValue, styles.endAlignRight, spaced ? styles.endValueSpaced : null]} numberOfLines={1}>{highText}</Text>
          </View>
        </View>

        {width > 0 && trackW > 0 ? (
          <Svg width={width} height={SVG_H}>
            <Defs>
              <LinearGradient id={gradId} x1={x0} y1={cy} x2={x1} y2={cy} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={rgb(DEEP_RED)} />
                <Stop offset="0.5" stopColor={rgb(FADED_GREEN)} />
                <Stop offset="1" stopColor={rgb(DEEP_GREEN)} />
              </LinearGradient>
              {solidW > 0 ? (
                <ClipPath id={clipId}>
                  <Rect x={solidX} y={0} width={solidW} height={SVG_H} />
                </ClipPath>
              ) : null}
            </Defs>

            {model.empty ? (
              <Rect x={x0} y={cy - STROKE / 2} width={trackW} height={STROKE} rx={STROKE / 2} fill={EMPTY_TRACK} />
            ) : null}

            {!model.empty && solidW > 0 ? (
              <G clipPath={`url(#${clipId})`}>
                <Rect
                  x={x0}
                  y={cy - STROKE / 2}
                  width={trackW}
                  height={STROKE}
                  rx={STROKE / 2}
                  fill={`url(#${gradId})`}
                />
              </G>
            ) : null}

            {!model.empty && dash ? (
              <Line
                x1={dash.start}
                y1={cy}
                x2={dash.end}
                y2={cy}
                stroke={model.dotted.color}
                strokeWidth={STROKE}
                strokeDasharray="1 8"
                strokeLinecap="round"
              />
            ) : null}

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

        {markerSlot}
        {distanceRow}
      </View>
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
  track: {
    width: '100%',
  },
  labelSlot: {
    height: f(32, 40),
    position: 'relative',
  },
  labelSlotSpaced: { height: f(40, 48) },
  markerLabel: {
    position: 'absolute',
    top: 2,
    alignItems: 'center',
  },
  markerSpaced: { top: 10 },
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
  markerCaption: {
    fontSize: f(10, 12),
    lineHeight: f(13, 15),
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    textAlign: 'center',
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
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  endsSpaced: { marginBottom: 14 },
  endLeft: {
    alignItems: 'flex-start',
    maxWidth: '46%',
  },
  endRight: {
    alignItems: 'flex-end',
    maxWidth: '46%',
  },
  endLabel: {
    fontSize: f(11, 12.5),
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  endValue: {
    marginTop: 2,
    fontSize: f(13, 14.5),
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  endValueSpaced: { marginTop: 5, color: '#1E293B' },
  endAlignRight: {
    textAlign: 'right',
  },
});
