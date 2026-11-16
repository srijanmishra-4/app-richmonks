import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const ZERO = '#0F172A';
const MUTED = '#94A3B8';
const HEADER = '#64748B';

const VALUE_COLS = [
  { key: 'price', label: 'Price (₹)', wide: true },
  { key: 'fut', label: 'Fut. OI' },
  { key: 'call', label: 'Call OI' },
  { key: 'put', label: 'Put OI' },
];

function toNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null || typeof val !== 'string' && typeof val !== 'number') return null;
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-)$/i.test(s)) return null;
  const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
  const n = Number(s.replace(/[₹,\s%()+\-]/g, ''));
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : null;
}

function pct(val) {
  const n = toNum(val);
  if (n == null) return { text: '-', color: MUTED };
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0) return { text: '0%', color: ZERO };
  return { text: `${rounded > 0 ? '+' : '-'}${Math.abs(rounded).toFixed(2)}%`, color: rounded > 0 ? GREEN : RED };
}

function overview(summary, period) {
  const rows = summary?.oi_overview;
  if (!Array.isArray(rows)) return null;
  return rows.find((item) => item?.period === period) ?? null;
}

function Performance({ profile }) {
  const styles = useFluidStyles(createStyles);
  const momentum = profile?.price_momemtum;
  const five = overview(profile?.oi_summary, '5 Days');
  const mom = overview(profile?.oi_summary, 'MOM');
  const rows = [
    { label: '1 Day', price: momentum?.return_1_day ?? profile?.price_change, fut: profile?.oi_qty_change_1_day, call: null, put: null },
    { label: '5 Days', price: five ? five.price : momentum?.return_5_day, fut: five ? five.fut_oi : profile?.oi_qty_change_5_day, call: five?.call_oi, put: five?.put_oi },
    { label: '10 Days', price: null, fut: null, call: null, put: null },
    { label: '60 Days', price: null, fut: null, call: null, put: null },
    { label: 'MOM', price: mom?.price, fut: mom ? mom.fut_oi : profile?.market_bias?.future_oi, call: mom?.call_oi, put: mom?.put_oi },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.1}>Performance</Text>
      <View style={styles.row}>
        <View style={styles.periodCell}><Text style={styles.header} numberOfLines={1} maxFontSizeMultiplier={1.1}>Period</Text></View>
        {VALUE_COLS.map((col) => (
          <View key={col.key} style={col.wide ? styles.wideSlot : styles.slot}>
            <View style={styles.vSep} />
            <View style={styles.cell}><Text style={styles.header} numberOfLines={1} maxFontSizeMultiplier={1.1}>{col.label}</Text></View>
          </View>
        ))}
      </View>
      {rows.map((item) => (
        <View key={item.label}>
          <View style={styles.hSep} />
          <View style={styles.row}>
            <View style={styles.periodCell}><Text style={styles.period} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text></View>
            {VALUE_COLS.map((col) => {
              const meta = pct(item[col.key]);
              return (
                <View key={col.key} style={col.wide ? styles.wideSlot : styles.slot}>
                  <View style={styles.vSep} />
                  <View style={styles.cell}><Text style={[styles.value, { color: meta.color }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{meta.text}</Text></View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export default memo(Performance);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(4, 6), marginBottom: f(12, 16) },
  title: { marginBottom: f(12, 14), fontSize: f(16, 18), lineHeight: f(22, 24), fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2, color: '#0F172A' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  hSep: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6EEF5' },
  periodCell: { width: f(66, 76), flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: f(12, 14) },
  slot: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  wideSlot: { flex: 1.18, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  vSep: { width: StyleSheet.hairlineWidth, marginVertical: f(10, 12), backgroundColor: '#E1E8F0' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: f(12, 14), paddingHorizontal: f(2, 4) },
  header: { textAlign: 'center', fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: HEADER },
  period: { textAlign: 'center', fontSize: f(12, 13), lineHeight: f(16, 17), fontFamily: 'Inter_500Medium', color: '#64748B' },
  value: { textAlign: 'center', fontSize: f(11, 12), lineHeight: f(15, 16), fontFamily: 'Inter_500Medium', fontVariant: ['tabular-nums'] },
});
