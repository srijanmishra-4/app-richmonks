import { memo, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const BLUE = '#2563EB';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const BORDER = '#E2E8F0';
const DIVIDER = '#F1F5F9';

const SIGNAL_THEME = {
  S: { bg: '#ECFDF3', text: GREEN },
  W: { bg: '#FEF2F2', text: RED },
  N: { bg: '#EFF6FF', text: BLUE },
};

const MONEYNESS_THEME = {
  ITM: { border: '#BFDBFE', text: BLUE, bg: '#F5F9FF' },
  ATM: { border: '#FDE68A', text: '#B45309', bg: '#FFFBEB' },
  OTM: { border: '#CBD5E1', text: MUTED, bg: '#F8FAFC' },
};

function SortIcon({ size = 8, color = SUBTLE }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 12" fill="none">
      <Path d="M2.5 4.5L5 2L7.5 4.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 7.5L5 10L2.5 7.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function isBlank(val) {
  if (val == null) return true;
  const s = String(val).trim();
  return !s || /^(null|undefined|nan|-|—)$/i.test(s);
}

function toNumber(val) {
  if (isBlank(val)) return null;
  const n = Number(String(val).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatStrike(val) {
  if (isBlank(val)) return '-';
  const n = toNumber(val);
  return n == null ? String(val).trim() : n.toLocaleString('en-IN');
}

function formatRupee(val) {
  if (isBlank(val)) return '-';
  const n = toNumber(val);
  return n == null ? String(val).trim() : `₹${n.toFixed(2)}`;
}

function compactQty(abs) {
  if (abs >= 1e7) return `${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(abs / 1e3).toFixed(1)} K`;
  return String(abs);
}

function formatOi(val) {
  const n = toNumber(val);
  if (n == null) return isBlank(val) ? '-' : String(val).trim();
  return `${n < 0 ? '-' : ''}${compactQty(Math.abs(n))}`;
}

function formatChangeOi(val) {
  const n = toNumber(val);
  if (n == null) return { text: isBlank(val) ? '-' : String(val).trim(), color: MUTED };
  if (n > 0) return { text: `+${compactQty(n)}`, color: GREEN };
  if (n < 0) return { text: `-${compactQty(Math.abs(n))}`, color: RED };
  return { text: '0', color: MUTED };
}

function OptionsData({ optionData }) {
  const styles = useFluidStyles(createStyles);
  const [tab, setTab] = useState('calls');

  const side = tab === 'calls' ? optionData?.daily_data?.call?.data : optionData?.daily_data?.put?.data;
  const records = Array.isArray(side) ? side : [];

  const renderTab = (key, label) => {
    const active = tab === key;
    return (
      <Pressable onPress={() => setTab(key)} style={[styles.tabBtn, active ? styles.tabBtnActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
        <Text style={[styles.tabBtnText, active ? styles.tabBtnTextActive : null]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabSelector}>
        {renderTab('calls', 'Calls')}
        {renderTab('puts', 'Puts')}
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <View style={[styles.headerCell, styles.colStrike]}>
            <Text style={styles.headerText}>Strike</Text>
            <SortIcon />
          </View>
          <View style={[styles.headerCell, styles.colTrigger]}>
            <Text style={styles.headerText}>TP</Text>
            <SortIcon />
          </View>
          <View style={[styles.headerCell, styles.colCmp]}>
            <View style={styles.headerStack}>
              <View style={styles.headerMain}>
                <Text style={styles.headerText}>Price</Text>
                <SortIcon />
              </View>
              <Text style={styles.headerSubText}>Wap</Text>
            </View>
          </View>
          <View style={[styles.headerCell, styles.colOi]}>
            <View style={styles.headerStack}>
              <View style={styles.headerMain}>
                <Text style={styles.headerText}>OI</Text>
                <SortIcon />
              </View>
              <Text style={styles.headerSubText}>ΔOI</Text>
            </View>
          </View>
          <View style={[styles.headerCell, styles.colSignal]}>
            <Text style={styles.headerText}>Signal</Text>
          </View>
        </View>

        {records.length === 0 ? (
          <View style={styles.emptyWrap}><Text style={styles.emptyText}>No options data available</Text></View>
        ) : (
          records.map((item, index) => {
            const chgOi = formatChangeOi(item?.change_OI);
            const sw = String(item?.sw ?? '').trim().toUpperCase();
            const sig = SIGNAL_THEME[sw];
            const tag = String(item?.tag ?? '').trim().toUpperCase();
            const money = MONEYNESS_THEME[tag];
            const isLast = index === records.length - 1;
            return (
              <View key={`${item?.strike ?? 'row'}-${index}`} style={[styles.row, isLast ? null : styles.rowDivider]}>
                <View style={[styles.cell, styles.colStrike, styles.strikeCell]}>
                  <Text style={styles.primaryText} numberOfLines={1}>{formatStrike(item?.strike)}</Text>
                  {money ? (
                    <View style={[styles.tagPill, { borderColor: money.border, backgroundColor: money.bg }]}>
                      <Text style={[styles.tagText, { color: money.text }]}>{tag}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.cell, styles.colTrigger]}>
                  <Text style={styles.primaryText} numberOfLines={1}>{formatRupee(item?.trigger_point)}</Text>
                </View>
                <View style={[styles.cell, styles.colCmp]}>
                  <Text style={styles.primaryText} numberOfLines={1}>{formatRupee(item?.current_price)}</Text>
                  <Text style={styles.subText} numberOfLines={1}>{formatRupee(item?.wap)}</Text>
                </View>
                <View style={[styles.cell, styles.colOi]}>
                  <Text style={styles.primaryText} numberOfLines={1}>{formatOi(item?.OI)}</Text>
                  <Text style={[styles.subText, { color: chgOi.color }]} numberOfLines={1}>{chgOi.text}</Text>
                </View>
                <View style={[styles.cell, styles.colSignal]}>
                  {sig ? (
                    <View style={[styles.signalBadge, { backgroundColor: sig.bg }]}>
                      <Text style={[styles.signalText, { color: sig.text }]}>{sw}</Text>
                    </View>
                  ) : (
                    <Text style={styles.subText}>-</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

export default memo(OptionsData);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(16, 20) },
  tabSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: f(10, 12), padding: 3, height: f(38, 42) },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: f(8, 10) },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabBtnText: { fontSize: f(13, 14), lineHeight: f(17, 18), fontFamily: 'Inter_500Medium', color: MUTED },
  tabBtnTextActive: { fontFamily: 'Inter_600SemiBold', color: TEXT },
  pointer: { cursor: 'pointer' },
  table: { marginTop: f(12, 14), backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: f(12, 14), overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: f(8, 12), paddingVertical: f(9, 10), backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: BORDER },
  headerCell: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  headerStack: { alignItems: 'center', justifyContent: 'center' },
  headerMain: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerText: { fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_500Medium', color: MUTED, letterSpacing: 0.2 },
  headerSubText: { fontSize: f(9, 10), lineHeight: f(12, 13), fontFamily: 'Inter_400Regular', color: SUBTLE },
  colStrike: { flex: 1.6 },
  colTrigger: { flex: 1.2 },
  colCmp: { flex: 1.25 },
  colOi: { flex: 1.3 },
  colSignal: { flex: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: f(8, 12), paddingVertical: f(10, 12) },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  cell: { minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  strikeCell: { flexDirection: 'row', gap: f(8, 10) },
  primaryText: { fontSize: f(12, 13), lineHeight: f(16, 17), fontFamily: 'Inter_600SemiBold', color: TEXT, textAlign: 'center' },
  subText: { marginTop: 2, fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_400Regular', color: SUBTLE, textAlign: 'center' },
  tagPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: f(5, 6), paddingVertical: 1, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: f(8, 9), lineHeight: f(11, 12), fontFamily: 'Inter_500Medium', letterSpacing: 0.3 },
  signalBadge: { width: f(24, 26), height: f(24, 26), borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  signalText: { fontSize: f(11, 12), lineHeight: f(14, 15), fontFamily: 'Inter_600SemiBold' },
  emptyWrap: { paddingVertical: f(24, 32), alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: f(12, 13), fontFamily: 'Inter_400Regular', color: MUTED },
});
