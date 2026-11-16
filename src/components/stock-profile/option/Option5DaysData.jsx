import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const NEUTRAL = '#64748B';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLS = [
  { key: 'date', label: 'Date', flex: 0.82 },
  { key: 'volume', label: 'Volume\n(In Lacs)', flex: 0.92 },
  { key: 'oi', label: 'OI / Δ OI', flex: 1.16 },
  { key: 'price', label: 'Option Price', flex: 1.05 },
  { key: 'future', label: 'Future Price', flex: 1.05 },
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

function numText(val) {
  const n = toNum(val);
  if (n == null) return '—';
  const abs = Math.abs(n);
  const fixed = Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 100) / 100);
  const [i, d] = fixed.split('.');
  return `${n < 0 ? '-' : ''}${d != null ? `${grouped(i)}.${d}` : grouped(i)}`;
}

function priceText(val) {
  const n = toNum(val);
  if (n == null) return '—';
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}₹${grouped(i)}.${d}`;
}

function deltaMeta(val) {
  const n = toNum(val);
  if (n == null || n === 0) return { text: '0', color: NEUTRAL };
  if (n > 0) return { text: `+${numText(n)}`, color: GREEN };
  return { text: numText(n), color: RED };
}

function pctMeta(val) {
  if (val == null || val === '') return { text: '0%', color: NEUTRAL };
  const n = toNum(val);
  if (n == null || n === 0) return { text: '0%', color: NEUTRAL };
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return { text: `${n > 0 ? '+' : '-'}${body}%`, color: n > 0 ? GREEN : RED };
}

function monthName(token) {
  const s = String(token ?? '').slice(0, 3).toLowerCase();
  const i = MONTHS.findIndex((item) => item.toLowerCase() === s);
  return i >= 0 ? MONTHS[i] : '';
}

function compactDate(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  if (val == null || val === '') return '—';
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return '—';
  let m = s.match(/(\d{1,2})[\s,./-]+([A-Za-z]{3,})/);
  if (m && monthName(m[2])) return `${Number(m[1])} ${monthName(m[2])}`;
  m = s.match(/([A-Za-z]{3,})[\s,./-]+(\d{1,2})/);
  if (m && monthName(m[1])) return `${Number(m[2])} ${monthName(m[1])}`;
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m && MONTHS[Number(m[2]) - 1]) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m && MONTHS[Number(m[2]) - 1]) return `${Number(m[1])} ${MONTHS[Number(m[2]) - 1]}`;
  return s;
}

function volumeText(val) {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '—';
  const s = String(val).trim();
  return s && !/^(null|undefined|nan)$/i.test(s) ? s : '—';
}

function strikeText(strike) {
  const raw = String(strike ?? '').replace(/[₹,\s]/g, '').trim();
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(strike).trim();
  return Number.isInteger(n) ? String(n) : String(n);
}

function rowCells(row) {
  const oi = deltaMeta(row?.chg_in_oi);
  const opt = pctMeta(row?.price_change);
  const fut = pctMeta(row?.future_pr_chg);
  return {
    date: { top: compactDate(row?.date) },
    volume: { top: volumeText(row?.volume) },
    oi: { top: numText(row?.oi), bottom: oi.text, color: oi.color },
    price: { top: priceText(row?.price), bottom: opt.text, color: opt.color },
    future: { top: priceText(row?.future_close), bottom: fut.text, color: fut.color },
  };
}

function Option5DaysData({ five_days_data, symbol, strike, optionType }) {
  const styles = useFluidStyles(createStyles);
  const rows = Array.isArray(five_days_data) ? five_days_data : [];
  const name = String(symbol ?? '').trim();
  const side = String(optionType ?? '').trim().toUpperCase();
  const core = [name, strikeText(strike)].filter(Boolean).join(' ');
  const subtitle = `For ${core}${side ? ` - ${side}` : ''}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.1}>5 Days Data</Text>
      <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>{subtitle}</Text>
      <View style={styles.table}>
        <View style={styles.head}>
          {COLS.map((col, idx) => (
            <View key={col.key} style={[styles.slot, { flex: col.flex }]}>
              {idx > 0 ? <View style={styles.vSep} /> : null}
              <View style={styles.cell}>
                <Text style={styles.headText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.1}>{col.label}</Text>
              </View>
            </View>
          ))}
        </View>
        {rows.map((row, i) => {
          const cells = rowCells(row);
          return (
            <View key={`${row?.date ?? 'row'}-${i}`}>
              {i > 0 ? <View style={styles.hSep} /> : null}
              <View style={styles.body}>
                {COLS.map((col, idx) => {
                  const cell = cells[col.key];
                  return (
                    <View key={col.key} style={[styles.slot, { flex: col.flex }]}>
                      {idx > 0 ? <View style={styles.vSep} /> : null}
                      <View style={styles.cell}>
                        <Text style={[styles.value, { color: cell.top === '—' ? NEUTRAL : TEXT }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{cell.top}</Text>
                        {cell.bottom != null ? <Text style={[styles.delta, { color: cell.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{cell.bottom}</Text> : null}
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

export default memo(Option5DaysData);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(10, 14), marginBottom: f(8, 12) },
  title: { fontSize: f(16, 18), lineHeight: f(22, 24), fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2, color: TEXT },
  subtitle: { marginTop: f(2, 3), fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: NEUTRAL },
  table: { marginTop: f(12, 14), marginHorizontal: -2, borderWidth: 1, borderColor: '#E3EDF5', borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  head: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#F4F8FB', borderBottomWidth: 2, borderBottomColor: '#0071A9' },
  body: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#FFFFFF' },
  hSep: { height: StyleSheet.hairlineWidth, backgroundColor: '#E7EEF5' },
  slot: { minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  vSep: { width: StyleSheet.hairlineWidth, marginVertical: f(10, 12), backgroundColor: '#E3EDF5' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: f(10, 12), paddingHorizontal: f(3, 4) },
  headText: { alignSelf: 'stretch', textAlign: 'center', fontSize: f(10, 11), lineHeight: f(13, 14), letterSpacing: 0.15, fontFamily: 'Inter_600SemiBold', color: '#475569' },
  value: { alignSelf: 'stretch', textAlign: 'center', fontSize: f(11, 12), lineHeight: f(16, 17), fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  delta: { alignSelf: 'stretch', marginTop: 4, textAlign: 'center', fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
});
