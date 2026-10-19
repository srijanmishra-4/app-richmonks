import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#94A3B8';

const PAD_TOP = 3;
const PAD_BOTTOM = 3;
const PAD_LEFT = 1;
// Leaves room for the end dot + halo so it isn't clipped at the right edge.
const PAD_RIGHT = 3;

function toPrice(point) {
  const raw = point?.price ?? point?.close;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

// Monotone cubic (Fritsch–Carlson): smooth curve that never overshoots the real
// highs/lows, so the line stays faithful to the data.
function monotonePath(xs, ys) {
  const n = xs.length;
  const h = xs[1] - xs[0];
  const d = new Array(n - 1);
  for (let i = 0; i < n - 1; i += 1) d[i] = (ys[i + 1] - ys[i]) / h;

  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }

  const f = (v) => v.toFixed(2);
  let path = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = xs[i] + h / 3;
    const c1y = ys[i] + (m[i] * h) / 3;
    const c2x = xs[i + 1] - h / 3;
    const c2y = ys[i + 1] - (m[i + 1] * h) / 3;
    path += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(xs[i + 1])},${f(ys[i + 1])}`;
  }
  return path;
}

function WatchlistSparkline({ graph, change, width = 64, height = 24, id = 'spark' }) {
  const points = useMemo(() => {
    if (!Array.isArray(graph)) return [];
    // Leading { price: 0 } is an empty slot. Keeping it sets the scale floor to 0,
    // so every series (prices clustered far above 0) draws the same flat top.
    return graph.map(toPrice).filter((price) => price != null && price > 0);
  }, [graph]);

  const changeNum = typeof change === 'number' ? change : parseFloat(String(change ?? '').replace(/[₹,()%+\s]/g, ''));
  const lastDelta = points.length >= 2 ? points[points.length - 1] - points[0] : 0;
  const signed = Number.isFinite(changeNum) && changeNum !== 0 ? changeNum : lastDelta;
  const color = signed > 0 ? GREEN : signed < 0 ? RED : NEUTRAL;

  const geom = useMemo(() => {
    if (points.length < 2 || width <= 0 || height <= 0) return null;
    let min = points[0];
    let max = points[0];
    for (let i = 1; i < points.length; i += 1) {
      if (points[i] < min) min = points[i];
      if (points[i] > max) max = points[i];
    }
    // Pad a flat or near-flat series so tiny ticks don't get stretched into
    // full-height zig-zags.
    const minRange = Math.abs(max) * 0.002 || 1;
    if (max - min < minRange) {
      const mid = (max + min) / 2;
      min = mid - minRange / 2;
      max = mid + minRange / 2;
    }
    const range = max - min;
    const usableW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
    const usableH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
    const toY = (price) => PAD_TOP + usableH - ((price - min) / range) * usableH;

    const xs = points.map((_, i) => PAD_LEFT + (i / (points.length - 1)) * usableW);
    const ys = points.map(toY);
    const line = monotonePath(xs, ys);
    const lastX = xs[xs.length - 1];
    const area = `${line} L${lastX.toFixed(2)},${height} L${xs[0].toFixed(2)},${height} Z`;

    return { line, area, lastX, lastY: ys[ys.length - 1] };
  }, [points, width, height]);

  if (!geom) return <View style={{ width, height }} />;

  const gradId = `spark-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <View style={[styles.box, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.22" />
            <Stop offset="0.7" stopColor={color} stopOpacity="0.04" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={geom.area} fill={`url(#${gradId})`} />
        <Path d={geom.line} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={geom.lastX} cy={geom.lastY} r={2.4} fill={color} fillOpacity={0.18} />
        <Circle cx={geom.lastX} cy={geom.lastY} r={1.3} fill={color} />
      </Svg>
    </View>
  );
}

export default memo(WatchlistSparkline);

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
