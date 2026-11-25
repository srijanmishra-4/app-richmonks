import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function monthName(token) {
  const s = String(token ?? '').slice(0, 3).toLowerCase();
  const i = MONTHS.findIndex((item) => item.toLowerCase() === s);
  return i >= 0 ? MONTHS[i] : '';
}

function parseDate(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
  }
  if (val == null || val === '') return { day: '-', month: '' };
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return { day: '-', month: '' };
  let m = s.match(/(\d{1,2})[\s,./-]+([A-Za-z]{3,})/);
  if (m && monthName(m[2])) return { day: String(Number(m[1])), month: monthName(m[2]) };
  m = s.match(/([A-Za-z]{3,})[\s,./-]+(\d{1,2})/);
  if (m && monthName(m[1])) return { day: String(Number(m[2])), month: monthName(m[1]) };
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m && MONTHS[Number(m[2]) - 1]) return { day: String(Number(m[3])), month: MONTHS[Number(m[2]) - 1] };
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m && MONTHS[Number(m[2]) - 1]) return { day: String(Number(m[1])), month: MONTHS[Number(m[2]) - 1] };
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
  return { day: s, month: '' };
}

function priceText(val) {
  const n = toNum(val);
  if (n == null) return '-';
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}₹${grouped(i)}.${d}`;
}

function priceChangeMeta(val) {
  if (val == null || typeof val === 'boolean' || typeof val === 'object') return null;
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return null;
  const n = toNum(s);
  if (n == null) {
    const isPos = s.startsWith('+');
    const isNeg = s.startsWith('-');
    const text = s.includes('%') ? s : `${s}%`;
    return { text, color: isPos ? GREEN : isNeg ? RED : MUTED };
  }
  const rounded = Math.abs(n).toFixed(2);
  if (n > 0) return { text: `+${rounded}%`, color: GREEN };
  if (n < 0) return { text: `-${rounded}%`, color: RED };
  return { text: '0.00%', color: MUTED };
}

function oiText(val) {
  const n = toNum(val);
  if (n == null) return '-';
  const abs = Math.abs(n);
  const fixed = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  const [i, d] = fixed.split('.');
  const res = d != null ? `${grouped(i)}.${d}` : grouped(i);
  return n < 0 ? `-${res}` : res;
}

function MomOiTable({ oi_overview, mom, symbol }) {
  const { isLaptop } = useBreakpoint();
  const styles = useFluidStyles(createStyles);
  const list = oi_overview?.mom ?? mom;
  const rows = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
  const stockSymbol = String(symbol ?? '').trim();

  return (
    <View style={styles.wrap}>
      <View style={styles.headingWrap}>
        <Text style={[styles.title, isLaptop ? styles.titleWide : null]} maxFontSizeMultiplier={1.1}>MoM OI</Text>
        <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>For {stockSymbol || '—'}</Text>
      </View>
      <View style={styles.headerRow}>
        <View style={[styles.headerCell, styles.headerDateCell]}>
          <Text style={[styles.headerTitle, isLaptop ? styles.headerTitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Date</Text>
        </View>
        <View style={styles.headerSepPlaceholder} />
        <View style={[styles.headerCell, styles.headerPriceCell]}>
          <Text style={[styles.headerTitle, isLaptop ? styles.headerTitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Price (₹)</Text>
        </View>
        <View style={styles.headerSepPlaceholder} />
        <View style={[styles.headerCell, styles.headerOiCell]}>
          <Text style={[styles.headerTitle, isLaptop ? styles.headerTitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Fut. OI</Text>
          <Text style={[styles.headerSubtitle, isLaptop ? styles.headerSubtitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>(In Lacs)</Text>
        </View>
        <View style={styles.headerSepPlaceholder} />
        <View style={[styles.headerCell, styles.headerOiCell]}>
          <Text style={[styles.headerTitle, isLaptop ? styles.headerTitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Call OI</Text>
          <Text style={[styles.headerSubtitle, isLaptop ? styles.headerSubtitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>(In Lacs)</Text>
        </View>
        <View style={styles.headerSepPlaceholder} />
        <View style={[styles.headerCell, styles.headerOiCell]}>
          <Text style={[styles.headerTitle, isLaptop ? styles.headerTitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Put OI</Text>
          <Text style={[styles.headerSubtitle, isLaptop ? styles.headerSubtitleWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>(In Lacs)</Text>
        </View>
      </View>
      <View style={styles.rowsList}>
        {rows.map((row, index) => {
          const dateParts = parseDate(row?.date ?? row?.cdate);
          const chg = priceChangeMeta(row?.price_change);
          return (
            <View key={`${row?.date ?? row?.cdate ?? 'row'}-${index}`} style={styles.rowCard}>
              <View style={styles.accentBar} />
              <View style={[styles.rowInner, isLaptop ? styles.rowInnerWide : null]}>
                <View style={[styles.cell, styles.dateCell]}>
                  <Text style={[styles.dateLabel, isLaptop ? styles.dateLabelWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{dateParts.month ? `${dateParts.day} ${dateParts.month}` : dateParts.day}</Text>
                </View>
                <View style={styles.vSep} />
                <View style={[styles.cell, styles.priceCell]}>
                  <Text style={[styles.priceVal, isLaptop ? styles.priceValWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{priceText(row?.price)}</Text>
                  {chg ? <Text style={[styles.priceChg, isLaptop ? styles.priceChgWide : null, { color: chg.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{chg.text}</Text> : null}
                </View>
                <View style={styles.vSep} />
                <View style={[styles.cell, styles.oiCell]}>
                  <Text style={[styles.oiVal, isLaptop ? styles.oiValWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{oiText(row?.future_oi)}</Text>
                </View>
                <View style={styles.vSep} />
                <View style={[styles.cell, styles.oiCell]}>
                  <Text style={[styles.oiVal, isLaptop ? styles.oiValWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{oiText(row?.call_oi)}</Text>
                </View>
                <View style={styles.vSep} />
                <View style={[styles.cell, styles.oiCell]}>
                  <Text style={[styles.oiVal, isLaptop ? styles.oiValWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{oiText(row?.put_oi)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(MomOiTable);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(22, 28), paddingTop: f(18, 22), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  headingWrap: { marginBottom: f(6, 8) },
  title: { fontSize: f(16, 17), lineHeight: f(20, 22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  titleWide: { fontSize: f(17, 18), lineHeight: f(21, 23) },
  subtitle: { marginTop: f(1, 2), fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: f(10, 12), paddingBottom: f(6, 8) },
  headerCell: { minWidth: 0 },
  headerDateCell: { flex: 0.82, alignItems: 'flex-start' },
  headerPriceCell: { flex: 1.28, alignItems: 'center' },
  headerOiCell: { flex: 1.22, alignItems: 'center' },
  headerSepPlaceholder: { width: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_600SemiBold', color: '#475569' },
  headerTitleWide: { fontSize: f(11, 12), lineHeight: f(14, 15) },
  headerSubtitle: { marginTop: 1, fontSize: f(9, 10), lineHeight: f(11, 12), fontFamily: 'Inter_400Regular', color: SUBTLE },
  headerSubtitleWide: { fontSize: f(10, 11), lineHeight: f(12, 13) },
  rowsList: { gap: f(6, 7) },
  rowCard: { position: 'relative', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: f(8, 10), overflow: 'hidden' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#E2E8F0' },
  rowInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: f(12, 14), paddingHorizontal: f(10, 12) },
  rowInnerWide: { paddingVertical: f(14, 16) },
  cell: { minWidth: 0, justifyContent: 'center' },
  dateCell: { flex: 0.82, alignItems: 'flex-start' },
  priceCell: { flex: 1.28, alignItems: 'center' },
  oiCell: { flex: 1.22, alignItems: 'center' },
  vSep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#E2E8F0', marginVertical: f(2, 3) },
  dateLabel: { fontSize: f(11, 12), lineHeight: f(15, 16), fontFamily: 'Inter_600SemiBold', color: TEXT },
  dateLabelWide: { fontSize: f(12, 13.5), lineHeight: f(16, 17.5) },
  priceVal: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_600SemiBold', color: TEXT, textAlign: 'center' },
  priceValWide: { fontSize: f(12, 13.5), lineHeight: f(16, 17.5) },
  priceChg: { marginTop: 1, fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_500Medium', textAlign: 'center' },
  priceChgWide: { fontSize: f(11, 12), lineHeight: f(14, 15) },
  oiVal: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: TEXT, textAlign: 'center' },
  oiValWide: { fontSize: f(12, 13.5), lineHeight: f(16, 17.5) },
});
