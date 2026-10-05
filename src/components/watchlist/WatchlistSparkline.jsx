import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const GREEN = '#10B981';
const RED = '#EF4444';
const NEUTRAL = '#94A3B8';

function toPrice(point) {
  const raw = point?.price ?? point?.close;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

function WatchlistSparkline({ graph, change, width = 72, height = 28, id = 'spark' }) {
  const points = useMemo(() => {
    if (!Array.isArray(graph)) return [];
    return graph.map(toPrice).filter((price) => price != null);
  }, [graph]);

  const changeNum = typeof change === 'number' ? change : parseFloat(String(change ?? '').replace(/[₹,()%+\s]/g, ''));
  const lastDelta = points.length >= 2 ? points[points.length - 1] - points[0] : 0;
  const signed = Number.isFinite(changeNum) && changeNum !== 0 ? changeNum : lastDelta;
  const color = signed > 0 ? GREEN : signed < 0 ? RED : NEUTRAL;

  const { line, area } = useMemo(() => {
    if (points.length < 2 || width <= 0 || height <= 0) return { line: '', area: '' };
    let min = points[0];
    let max = points[0];
    for (let i = 1; i < points.length; i += 1) {
      if (points[i] < min) min = points[i];
      if (points[i] > max) max = points[i];
    }
    const range = max === min ? 1 : max - min;
    const padY = 2;
    const usableH = Math.max(1, height - padY * 2);
    const coords = points.map((price, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = padY + usableH - ((price - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const linePath = `M ${coords.join(' L ')}`;
    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
    return { line: linePath, area: areaPath };
  }, [points, width, height]);

  if (points.length < 2) return <View style={{ width, height }} />;

  const gradId = `spark-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <View style={[styles.box, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}
        <Path d={line} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export default memo(WatchlistSparkline);

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
