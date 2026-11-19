import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const COLUMNS = [
  { label: 'Fut. OI', value: 'chg_fut_oi', percent: 'chg_fut_oi_pct' },
  { label: 'Call OI', value: 'chg_call_oi', percent: 'chg_call_oi_pct' },
  { label: 'Put OI', value: 'chg_put_oi', percent: 'chg_put_oi_pct' },
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

function grouped(intPart) {
  if (intPart.length <= 3) return intPart;
  return `${intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${intPart.slice(-3)}`;
}

function periodLabel(val) {
  if (val == null || typeof val === 'boolean') return '-';
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan)$/i.test(s)) return '-';
  return s;
}

function lakhsMeta(val) {
  const n = toNum(val);
  if (n == null) return { text: '-', color: MUTED };
  const lakhs = Math.round((Math.abs(n) / 100000) * 100) / 100;
  if (lakhs === 0) return { text: '0.00', color: MUTED };
  const [i, d] = lakhs.toFixed(2).split('.');
  const body = `${grouped(i)}.${d}`;
  if (n > 0) return { text: `+${body}`, color: GREEN };
  return { text: `-${body}`, color: RED };
}

function pctMeta(val) {
  if (val == null || typeof val === 'boolean' || typeof val === 'object') return { text: '-', color: MUTED };
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return { text: '-', color: MUTED };
  const n = toNum(s);
  if (n == null) {
    const isPos = s.startsWith('+');
    const isNeg = s.startsWith('-');
    return { text: s.includes('%') ? s : `${s}%`, color: isPos ? GREEN : isNeg ? RED : MUTED };
  }
  const rounded = Math.abs(n).toFixed(2);
  if (n > 0) return { text: `+${rounded}%`, color: GREEN };
  if (n < 0) return { text: `-${rounded}%`, color: RED };
  return { text: '0.00%', color: MUTED };
}

function OIChangesTable({ oi_overview, symbol }) {
  const styles = useFluidStyles(createStyles);
  const rows = Array.isArray(oi_overview?.oi_changes) ? oi_overview.oi_changes : Array.isArray(oi_overview?.i_changes) ? oi_overview.i_changes : [];
  const stockSymbol = String(symbol ?? '').trim();

  return (
    <View style={styles.wrap}>
      <View style={styles.headingWrap}>
        <Text style={styles.title} maxFontSizeMultiplier={1.1}>OI Changes</Text>
        <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>For {stockSymbol || '—'}</Text>
      </View>
      <View style={styles.headerRow}>
        <View style={[styles.headerCell, styles.headerPeriodCell]}>
          <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>Period</Text>
        </View>
        {COLUMNS.map((column) => (
          <View key={column.value} style={styles.headerGroup}>
            <View style={styles.headerSepPlaceholder} />
            <View style={[styles.headerCell, styles.headerOiCell]}>
              <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>{column.label}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>(In Lacs)</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.rowsList}>
        {rows.map((row, index) => {
          const isLatest = index === 0;
          return (
            <View key={`${row?.period ?? 'row'}-${index}`} style={styles.rowCard}>
              <View style={[styles.accentBar, isLatest ? styles.accentBarLatest : styles.accentBarNeutral]} />
              <View style={styles.rowInner}>
                <View style={[styles.cell, styles.periodCell]}>
                  <Text style={styles.periodLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{periodLabel(row?.period)}</Text>
                </View>
                {COLUMNS.map((column) => {
                  const amount = lakhsMeta(row?.[column.value]);
                  const pct = pctMeta(row?.[column.percent]);
                  return (
                    <View key={column.value} style={styles.metricGroup}>
                      <View style={styles.vSep} />
                      <View style={[styles.cell, styles.oiCell]}>
                        <Text style={[styles.oiVal, { color: amount.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{amount.text}</Text>
                        <Text style={[styles.oiPct, { color: pct.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{pct.text}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(OIChangesTable);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(22, 28), paddingTop: f(18, 22), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  headingWrap: { marginBottom: f(6, 8) },
  title: { fontSize: f(16, 17), lineHeight: f(20, 22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  subtitle: { marginTop: f(1, 2), fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: f(10, 12), paddingBottom: f(6, 8) },
  headerGroup: { flex: 1.2, flexDirection: 'row', alignItems: 'flex-end', minWidth: 0 },
  headerCell: { minWidth: 0 },
  headerPeriodCell: { flex: 1.05, alignItems: 'flex-start' },
  headerOiCell: { flex: 1, alignItems: 'center' },
  headerSepPlaceholder: { width: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_600SemiBold', color: '#475569' },
  headerSubtitle: { marginTop: 1, fontSize: f(9, 10), lineHeight: f(11, 12), fontFamily: 'Inter_400Regular', color: SUBTLE },
  rowsList: { gap: f(6, 7) },
  rowCard: { position: 'relative', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: f(8, 10), overflow: 'hidden' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  accentBarLatest: { backgroundColor: GREEN },
  accentBarNeutral: { backgroundColor: '#E2E8F0' },
  rowInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: f(8, 9), paddingHorizontal: f(10, 12) },
  metricGroup: { flex: 1.2, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  cell: { minWidth: 0, justifyContent: 'center' },
  periodCell: { flex: 1.05, alignItems: 'flex-start' },
  oiCell: { flex: 1, alignItems: 'center' },
  vSep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#E2E8F0', marginVertical: f(2, 3) },
  periodLabel: { fontSize: f(11, 12), lineHeight: f(15, 16), fontFamily: 'Inter_600SemiBold', color: TEXT },
  oiVal: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  oiPct: { marginTop: 1, fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_500Medium', textAlign: 'center' },
});
