import { memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import OptionStrikeDropdown, { OptionTypeDropdown } from '@/components/stock-profile/option/OptionStrikeDropdown';
import ExpiryDropdownComponent, { formatExpiryDate } from '@/components/stock-profile/ExpiryDropdown';
import SymbolLogo from '@/components/SymbolLogo';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { openFutureProfile } from '@/utils/stockProfile';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const MUTED = '#64748B';
const TEXT = '#0F172A';

function formatIndian(val) {
  if (val == null || val === '') return '';
  let str = String(val).trim();
  const hasParens = str.startsWith('(') && str.endsWith(')');
  if (hasParens) str = str.slice(1, -1).trim();
  str = str.replace(/[₹,%]/g, '').trim();
  if (!str) return '';

  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }

  const parts = str.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : null;
  if (!/^\d+$/.test(intPart)) return '';

  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    intPart = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
  }

  const res = decPart !== null ? `${intPart}.${decPart}` : intPart;
  const signed = sign ? `${sign}${res}` : res;
  return hasParens ? `(${signed})` : signed;
}

function formatRupee(val) {
  const grouped = formatIndian(val);
  if (!grouped) return '—';
  if (grouped.startsWith('-')) return `-₹${grouped.slice(1)}`;
  if (grouped.startsWith('(-')) return `(-₹${grouped.slice(2)}`;
  if (grouped.startsWith('(')) return `(₹${grouped.slice(1)}`;
  return `₹${grouped}`;
}

function parseSigned(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null || val === '') return null;
  const str = String(val).trim();
  if (!str) return null;
  const neg = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
  const num = parseFloat(str.replace(/[₹,%()+\s]/g, ''));
  if (!Number.isFinite(num)) return null;
  return neg ? -Math.abs(num) : num;
}

function formatSigned(val, percent) {
  if (val == null || val === '') return '';
  let str = String(val).trim();
  const paren = str.startsWith('(') && str.endsWith(')');
  if (paren) str = str.slice(1, -1).trim();
  const grouped = formatIndian(str);
  if (!grouped) return '';
  const bare = grouped.replace(/^[+-]/, '');
  const num = parseFloat(bare.replace(/,/g, ''));
  const negative = paren || grouped.startsWith('-');
  const sign = Number.isFinite(num) && num === 0 ? '' : negative ? '-' : '+';
  return percent ? `(${sign}${bare}%)` : `${sign}₹${bare}`;
}

function futureExpiry(expiry) {
  const value = String(expiry ?? '').trim();
  if (value === 'weeklyNear') return 'near';
  if (value === 'weeklyNext') return 'next';
  if (value === 'weeklyFar') return 'far';
  return value || 'near';
}

function StockHeroCard({
  status,
  cdate,
  expiry,
  onExpiryChange,
  symbol,
  price,
  price_change,
  price_change_value,
  lot_size,
  margin,
  wap,
  isOption,
  optionType,
  onOptionTypeChange,
  strike,
  onStrikeChange,
  expiryDate,
}) {
  const styles = useFluidStyles(createStyles);
  const { isLaptop } = useBreakpoint();
  const wide = Boolean(isOption) && isLaptop;
  const open = String(status ?? '').toLowerCase().includes('open');
  const formattedExpiry = formatExpiryDate(expiryDate);
  const expiryLabel = isOption && formattedExpiry ? (String(expiry || '').startsWith('weekly') ? `${formattedExpiry} (W)` : formattedExpiry) : undefined;
  const delta = parseSigned(price_change_value) ?? parseSigned(price_change);
  const changeColor = delta == null || delta === 0 ? MUTED : delta > 0 ? GREEN : RED;
  const changeText = [formatSigned(price_change_value, false), formatSigned(price_change, true)].filter(Boolean).join(' ');
  const lots = formatIndian(lot_size);
  const marginNum = formatIndian(margin);
  const marginText = marginNum ? `${marginNum}%` : '—';
  const priceNum = parseSigned(price);
  const wapNum = parseSigned(wap);
  const wapColor = priceNum == null || wapNum == null ? MUTED : priceNum > wapNum ? GREEN : RED;

  return (
    <View style={[styles.card, wide ? styles.cardWide : null]}>
      <View style={[styles.statusRow, wide ? styles.statusRowWide : null]}>
        <View style={[styles.statusLeft, wide ? styles.statusLeftWide : null]}>
          <View style={[styles.dot, open ? styles.dotOpen : styles.dotMuted]} />
          {status ? <Text style={[styles.status, open ? styles.statusOpen : null, wide ? styles.statusWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{status}</Text> : null}
          {cdate ? <Text style={[styles.cdate, wide ? styles.cdateWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{cdate}</Text> : null}
        </View>
        <ExpiryDropdownComponent value={expiry} onSelect={onExpiryChange} compact large={wide} withWeekly={Boolean(isOption) && String(symbol || '').toUpperCase() === 'NIFTY'} displayLabel={expiryLabel} />
      </View>

      <View style={[styles.identityRow, wide ? styles.identityRowWide : null]}>
        <View style={[styles.identity, isOption ? styles.identityOption : null, wide ? styles.identityWide : null]}>
          {wide ? (
            <View style={styles.logoSpace}>
              <SymbolLogo key={symbol || 'logo'} symbol={symbol} size={styles.logo.width} />
            </View>
          ) : (
            <SymbolLogo key={symbol || 'logo'} symbol={symbol} size={styles.logo.width} />
          )}
          {isOption ? (
            <View style={styles.optionIdentity}>
              <Text style={[styles.symbol, wide ? styles.symbolWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{symbol || '—'}</Text>
              <View style={[styles.optionRow, wide ? styles.optionRowWide : null]}>
                <OptionTypeDropdown value={optionType} onSelect={onOptionTypeChange} />
                <OptionStrikeDropdown symbol={symbol} optionType={optionType} value={strike} onSelect={onStrikeChange} />
              </View>
            </View>
          ) : (
            <Text style={styles.symbol} numberOfLines={1} maxFontSizeMultiplier={1.1}>{symbol || '—'}</Text>
          )}
        </View>
        <View style={[styles.priceCol, wide ? styles.priceColWide : null]}>
          <Text style={[styles.price, wide ? styles.priceWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{formatRupee(price)}</Text>
          <Text style={[styles.change, { color: changeColor }, wide ? styles.changeWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{changeText || '—'}</Text>
        </View>
      </View>

      <View style={[styles.metaRow, wide ? styles.metaRowWide : null]}>
        <View style={[styles.metaLeft, wide ? styles.metaLeftWide : null]}>
          <Text style={[styles.metaLabel, wide ? styles.metaLabelWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            Lot Size: <Text style={styles.metaValue}>{lots || '—'}</Text>
          </Text>
          <View style={[styles.metaSep, wide ? styles.metaSepWide : null]} />
          <Text style={[styles.metaLabel, wide ? styles.metaLabelWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            Margin: <Text style={styles.metaValue}>{marginText}</Text>
          </Text>
        </View>
        {isOption ? (
          <Pressable onPress={() => openFutureProfile({ symbol, expiry: futureExpiry(expiry) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Future Profile" style={[styles.futureLink, wide ? styles.futureLinkWide : null, Platform.OS === 'web' ? styles.pointer : null]}>
            <Text style={[styles.futureText, wide ? styles.futureTextWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>Future Profile</Text>
            <ChevronRightIcon size={14} color="#0071A9" />
          </Pressable>
        ) : (
          <Text style={[styles.metaLabel, styles.wap, wide ? styles.metaLabelWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            WAP: <Text style={[styles.metaValue, { color: wapColor }]}>{formatRupee(wap)}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

export default memo(StockHeroCard);

const createStyles = (f) => ({
  card: { paddingHorizontal: f(16, 24), paddingTop: f(14, 18), paddingBottom: f(14, 18) },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: f(12, 16) },
  statusLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: f(6, 8) },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOpen: { backgroundColor: GREEN },
  dotMuted: { backgroundColor: '#94A3B8' },
  status: { flexShrink: 0, fontSize: f(12, 13.5), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: MUTED },
  statusOpen: { color: GREEN },
  cdate: { flexShrink: 1, fontSize: f(11.5, 13), lineHeight: f(16, 18), fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: f(12, 16), marginTop: f(18, 22) },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: f(10, 12) },
  logo: { width: f(32, 40) },
  symbol: { flexShrink: 1, fontSize: f(15, 17), lineHeight: f(20, 22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  priceCol: { flexShrink: 0, alignItems: 'flex-end', marginTop: f(6, 4) },
  price: { fontSize: f(16, 18), lineHeight: f(20, 24), fontFamily: 'Inter_600SemiBold', color: TEXT },
  change: { marginTop: f(3, 4), fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: f(12, 16), marginTop: f(14, 16) },
  metaLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: f(12, 16) },
  metaLabel: { flexShrink: 1, fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_400Regular', color: MUTED },
  wap: { flexShrink: 0 },
  futureLink: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 2 },
  futureText: { fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  pointer: { cursor: 'pointer' },
  metaValue: { fontFamily: 'Inter_600SemiBold', color: TEXT },
  metaSep: { width: StyleSheet.hairlineWidth, height: f(12, 14), backgroundColor: '#CBD5E1' },
  identityOption: { alignItems: 'center' },
  optionIdentity: { flex: 1, minWidth: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: f(18, 22), marginTop: f(4, 6) },
  cardWide: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  statusRowWide: { gap: 12 },
  statusLeftWide: { gap: 8 },
  statusWide: { fontSize: 13, lineHeight: 18 },
  cdateWide: { fontSize: 13, lineHeight: 18 },
  identityRowWide: { gap: 12, marginTop: 16 },
  identityWide: { gap: 12, alignItems: 'center' },
  symbolWide: { fontSize: 20, lineHeight: 26, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  logoSpace: { marginRight: 12 },
  priceColWide: { marginTop: 0 },
  priceWide: { fontSize: 20, lineHeight: 26, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  changeWide: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  metaRowWide: { gap: 12, marginTop: 16 },
  metaLeftWide: { gap: 12 },
  metaLabelWide: { fontSize: 13, lineHeight: 18 },
  metaSepWide: { height: 14 },
  futureLinkWide: { gap: 4 },
  futureTextWide: { fontSize: 14, lineHeight: 18 },
  optionRowWide: { gap: 12, marginTop: 12 },
});
