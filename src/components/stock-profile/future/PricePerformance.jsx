import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const PERIODS = [
  { label: '1 Day', value: 'pl1day', percent: 'pl1daypercent' },
  { label: '5 Day', value: 'pl5day', percent: 'pl5daypercent' },
  { label: '20 Day', value: 'pl20day', percent: 'pl20daypercent' },
  { label: '60 Day', value: 'pl60day', percent: 'pl60daypercent' },
];

function toNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null || typeof val === 'boolean') return null;
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return null;
  const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
  const n = Number(s.replace(/[₹,\s%()+\-]/g, ''));
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : null;
}

function grouped(abs, digits) {
  const fixed = digits == null ? String(abs) : abs.toFixed(digits);
  const [i, d] = fixed.split('.');
  const g = i.length > 3 ? `${i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${i.slice(-3)}` : i;
  return d != null ? `${g}.${d}` : g;
}

function metric(val, kind) {
  if (val == null || typeof val === 'boolean' || typeof val === 'object') return { n: null, text: '-' };
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return { n: null, text: '-' };
  const n = toNum(s);
  if (n == null) {
    const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
    return { n: neg ? -1 : s.includes('+') ? 1 : null, text: s };
  }
  const abs = Math.round(Math.abs(n) * 100) / 100;
  if (abs === 0) return { n: 0, text: kind === 'money' ? '₹0' : '0%' };
  const body = grouped(abs, 2);
  const sign = n > 0 ? '+' : '-';
  return { n, text: kind === 'money' ? `${sign}₹${body}` : `${sign}${body}%` };
}

function tone(n) {
  if (n == null || n === 0) return MUTED;
  return n > 0 ? GREEN : RED;
}

function Mark({ up, color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Path d={up ? 'M4 0.7L7.3 7.3H0.7Z' : 'M4 7.3L7.3 0.7H0.7Z'} fill={color} />
    </Svg>
  );
}

function Column({ label, value, percent, edge, styles }) {
  const main = metric(value, 'money');
  const sub = metric(percent, 'percent');
  const mainColor = tone(main.n);
  const subColor = tone(sub.n);
  return (
    <View style={styles.col}>
      {edge ? <View style={styles.sep} /> : null}
      <View style={styles.cell}>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{label}</Text>
        <Text style={[styles.value, { color: mainColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} maxFontSizeMultiplier={1.1}>{main.text}</Text>
        <View style={styles.delta}>
          {sub.n != null && sub.n !== 0 ? <Mark up={sub.n > 0} color={subColor} size={styles.mark.width} /> : null}
          <Text style={[styles.deltaText, { color: subColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} maxFontSizeMultiplier={1.1}>{sub.text}</Text>
        </View>
      </View>
    </View>
  );
}

function PricePerformance({ data }) {
  const styles = useFluidStyles(createStyles);
  const source = data && typeof data === 'object' ? data : {};
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.1}>Price Performance</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.1}>P&L per lot across different time periods.</Text>
      <View style={styles.card}>
        {PERIODS.map((item, index) => <Column key={item.value} label={item.label} value={source[item.value]} percent={source[item.percent]} edge={index > 0} styles={styles} />)}
      </View>
    </View>
  );
}

export default memo(PricePerformance);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(6, 8), marginBottom: f(14, 16) },
  title: { fontSize: f(15, 16), lineHeight: f(20, 22), fontFamily: 'Inter_500Medium', color: TEXT },
  subtitle: { marginTop: f(2, 3), fontSize: f(11, 12), lineHeight: f(15, 16), fontFamily: 'Inter_400Regular', color: MUTED },
  card: { flexDirection: 'row', alignItems: 'stretch', marginTop: f(10, 12), backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EDF5', borderRadius: f(12, 14), overflow: 'hidden' },
  col: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  sep: { width: StyleSheet.hairlineWidth, marginVertical: f(10, 12), backgroundColor: '#E2E8F0' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingTop: f(12, 14), paddingBottom: f(12, 14), paddingHorizontal: f(4, 6) },
  label: { alignSelf: 'stretch', textAlign: 'center', fontSize: f(9, 11), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium', color: MUTED },
  value: { marginTop: f(8, 10), alignSelf: 'stretch', textAlign: 'center', fontSize: f(12, 14), lineHeight: f(14, 15), fontFamily: 'Inter_500Medium' },
  delta: { alignSelf: 'stretch', marginTop: f(6, 8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  mark: { width: f(7, 8) },
  deltaText: { flexShrink: 1, textAlign: 'center', fontSize: f(10, 12), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium' },
});
