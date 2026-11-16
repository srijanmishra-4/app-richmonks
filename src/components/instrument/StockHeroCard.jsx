import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import SymbolLogo from '@/components/SymbolLogo';
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
  const text = `${sign}${bare}`;
  return percent ? `(${text}%)` : text;
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
}) {
  const styles = useFluidStyles(createStyles);
  const open = String(status ?? '').toLowerCase().includes('open');
  const delta = parseSigned(price_change_value) ?? parseSigned(price_change);
  const changeColor = delta == null || delta === 0 ? MUTED : delta > 0 ? GREEN : RED;
  const changeText = [formatSigned(price_change_value, false), formatSigned(price_change, true)].filter(Boolean).join(' ');
  const lots = formatIndian(lot_size);
  const marginNum = formatIndian(margin);
  const marginText = marginNum ? `${marginNum}%` : '—';

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, open ? styles.dotOpen : styles.dotMuted]} />
          {status ? <Text style={[styles.status, open ? styles.statusOpen : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{status}</Text> : null}
          {cdate ? <Text style={styles.cdate} numberOfLines={1} maxFontSizeMultiplier={1.1}>{cdate}</Text> : null}
        </View>
        <ExpiryDropdownComponent value={expiry} onSelect={onExpiryChange} compact />
      </View>

      <View style={styles.identityRow}>
        <View style={styles.identity}>
          <SymbolLogo key={symbol || 'logo'} symbol={symbol} size={styles.logo.width} />
          <Text style={styles.symbol} numberOfLines={1} maxFontSizeMultiplier={1.1}>{symbol || '—'}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price} numberOfLines={1} maxFontSizeMultiplier={1.1}>{formatRupee(price)}</Text>
          <Text style={[styles.change, { color: changeColor }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{changeText || '—'}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          Lot Size: <Text style={styles.metaValue}>{lots || '—'}</Text>
        </Text>
        <View style={styles.metaSep} />
        <Text style={styles.metaLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          Margin: <Text style={styles.metaValue}>{marginText}</Text>
        </Text>
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
  logo: { width: 32 },
  symbol: { flexShrink: 1, fontSize: f(15, 17), lineHeight: f(20, 22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  priceCol: { flexShrink: 0, alignItems: 'flex-end', marginTop: f(6, 4) },
  price: { fontSize: f(16, 18), lineHeight: f(20, 24), fontFamily: 'Inter_600SemiBold', color: TEXT },
  change: { marginTop: f(3, 4), fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: f(12, 16), marginTop: f(8, 10) },
  metaLabel: { fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_400Regular', color: MUTED },
  metaValue: { fontFamily: 'Inter_600SemiBold', color: TEXT },
  metaSep: { width: StyleSheet.hairlineWidth, height: f(12, 14), backgroundColor: '#CBD5E1' },
});
