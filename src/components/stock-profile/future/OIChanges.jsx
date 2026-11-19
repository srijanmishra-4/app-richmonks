import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const PERIODS = [
  { key: '1d', label: '1 Day' },
  { key: '5d', label: '5 Day' },
  { key: '20d', label: '20 Day' },
  { key: '60d', label: '60 Day' },
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

function formatOiLakhs(n) {
  const abs = Math.abs(n);
  if (abs < 100000) return null;
  const lakhs = Math.round((abs / 100000) * 100) / 100;
  const [i, d] = String(lakhs).split('.');
  const g = i.length > 3 ? `${i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${i.slice(-3)}` : i;
  return `${n > 0 ? '+' : '-'}${d != null ? `${g}.${d}` : g}L`;
}

function metric(val, percent) {
  if (val == null || typeof val === 'boolean' || typeof val === 'object') return { n: null, text: '-' };
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return { n: null, text: '-' };
  const n = toNum(s);
  if (n == null) {
    const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
    return { n: neg ? -1 : s.includes('+') ? 1 : null, text: s };
  }
  if (!percent) {
    const lakhs = formatOiLakhs(n);
    if (lakhs) return { n, text: lakhs };
  }
  const abs = Math.round(Math.abs(n) * 100) / 100;
  if (abs === 0) return { n: 0, text: percent ? '0%' : '0' };
  const [i, d] = String(abs).split('.');
  const g = i.length > 3 ? `${i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${i.slice(-3)}` : i;
  const body = `${n > 0 ? '+' : '-'}${d != null ? `${g}.${d}` : g}`;
  return { n, text: percent || s.includes('%') ? `${body}%` : body };
}

function tone(n) {
  if (n == null || n === 0) return MUTED;
  return n > 0 ? GREEN : RED;
}

function periodKey(period) {
  const raw = String(period ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!raw || /^(null|undefined|nan)$/.test(raw)) return '';
  if (raw.includes('expir')) return 'expiry';
  const words = { oneday: '1d', fiveday: '5d', fivedays: '5d', tenday: '10d', tendays: '10d', twentyday: '20d', twentydays: '20d', sixtyday: '60d', sixtydays: '60d' };
  if (words[raw]) return words[raw];
  const m = raw.match(/^(?:chginoi|oi|return|change)?(60|20|10|5|1)(?:d|day|days)?$/);
  if (m) return `${m[1]}d`;
  const rev = raw.match(/^d(60|20|10|5|1)$/);
  return rev ? `${rev[1]}d` : '';
}

function rowsByPeriod(list) {
  const map = {};
  const rows = Array.isArray(list) ? list : [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const key = periodKey(row?.period);
    if (key && map[key] == null) map[key] = row;
  }
  return map;
}

function Mark({ up, color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Path d={up ? 'M4 0.7L7.3 7.3H0.7Z' : 'M4 7.3L7.3 0.7H0.7Z'} fill={color} />
    </Svg>
  );
}

function Column({ label, value, percent, edge, styles }) {
  const main = metric(value, false);
  const sub = metric(percent, true);
  const mainColor = tone(main.n);
  const subColor = tone(sub.n);
  return (
    <View style={styles.col}>
      {edge ? <View style={styles.sep} /> : null}
      <View style={styles.cell}>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{label}</Text>
        <Text style={[styles.value, { color: mainColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} maxFontSizeMultiplier={1.1}>{main.text}</Text>
        <View style={styles.delta}>
          {sub.n != null && sub.n !== 0 ? <Mark up={sub.n > 0} color={subColor} size={styles.mark.width} /> : null}
          <Text style={[styles.deltaText, { color: subColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} maxFontSizeMultiplier={1.1}>{sub.text}</Text>
        </View>
      </View>
    </View>
  );
}

function OIChanges({ data }) {
  const styles = useFluidStyles(createStyles);
  const map = rowsByPeriod(data);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.1}>OI Changes</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.1}>Open interest change across different time periods.</Text>
      <View style={styles.card}>
        {PERIODS.map((item, index) => {
          const row = map[item.key];
          return <Column key={item.key} label={item.label} value={row?.chg_in_oi ?? row?.chg_fut_oi} percent={row?.chg_in_oi_pct ?? row?.chg_fut_oi_pct} edge={index > 0} styles={styles} />;
        })}
      </View>
    </View>
  );
}

export default memo(OIChanges);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginBottom: f(4, 6) },
  title: { fontSize: f(15, 16), lineHeight: f(20, 22), fontFamily: 'Inter_500Medium', color: TEXT },
  subtitle: { marginTop: f(2, 3), fontSize: f(11, 12), lineHeight: f(15, 16), fontFamily: 'Inter_400Regular', color: MUTED },
  card: { flexDirection: 'row', alignItems: 'stretch', marginTop: f(10, 12), backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EDF5', borderRadius: f(12, 14), overflow: 'hidden' },
  col: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  sep: { width: StyleSheet.hairlineWidth, marginVertical: f(10, 12), backgroundColor: '#E2E8F0' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingTop: f(12, 14), paddingBottom: f(12, 14), paddingHorizontal: f(4, 6) },
  label: { alignSelf: 'stretch', textAlign: 'center', fontSize: f(10, 12), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium', color: MUTED },
  value: { marginTop: f(8, 10), alignSelf: 'stretch', textAlign: 'center', fontSize: f(12, 14), lineHeight: f(14, 15), fontFamily: 'Inter_500Medium' },
  delta: { alignSelf: 'stretch', marginTop: f(6, 8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  mark: { width: f(7, 8) },
  deltaText: { flexShrink: 1, textAlign: 'center', fontSize: f(10, 12), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium' },
});
