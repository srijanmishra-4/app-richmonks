import { createContext, memo, useContext } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { useFluidStyles } from '@/utils/responsive';

export const GREEN = '#16A34A';
export const RED = '#DC2626';
export const NEUTRAL = '#64748B';

export const COL = { symbol: 1.2, price: 1, callValue: 1.25, putValue: 1.25 };

export const CALL_PUT_VALUE_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 1 },
  { flex: COL.price, align: 'right', lines: 2 },
  { flex: COL.callValue, align: 'right', lines: 2 },
  { flex: COL.putValue, align: 'right', lines: 2 },
];

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

export function formatIndianMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  let str = String(val).trim().replace(/[₹,\s]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    sign = '+';
    str = str.slice(1).trim();
  }
  if (isNaN(parseFloat(str))) return String(val);
  const parts = str.split('.');
  const dec = parts.length > 1 ? `.${parts[1]}` : '';
  return `${sign}₹${groupDigits(parts[0])}${dec}`;
}

export function formatPct(val) {
  if (val == null || val === '') return '—';
  const clean = String(val).trim().replace(/%/g, '').trim();
  const num = Number(clean);
  if (!Number.isFinite(num)) return String(val);
  const body = clean.replace(/^[+-]/, '');
  if (num > 0) return `+${body}%`;
  if (num < 0) return `-${body}%`;
  return `${body}%`;
}

export function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const CallPutFilterContext = createContext(null);

function NewMark({ isCallNew, isPutNew }) {
  const styles = useFluidStyles(createStyles);
  const activeFilter = useContext(CallPutFilterContext);
  let newColor = null;
  if (activeFilter === 'Strong Call' && isCallNew) newColor = GREEN;
  else if (activeFilter === 'Strong Put' && isPutNew) newColor = GREEN;
  else if (activeFilter === 'Weak Call' && isCallNew) newColor = RED;
  else if (activeFilter === 'Weak Put' && isPutNew) newColor = RED;
  return newColor ? <View style={[styles.newMark, { backgroundColor: newColor }]} /> : null;
}

export const CallPutValueRow = memo(function CallPutValueRow({ data }) {
  if (!data) return null;
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();
  const isCallNew = !!data.is_call_remark_new;
  const isPutNew = !!data.is_put_remark_new;

  const pctNum = sortNumber(data.price_change);
  const pctColor = pctNum > 0 ? GREEN : pctNum < 0 ? RED : NEUTRAL;

  return (
    <>
      {isCallNew || isPutNew ? <NewMark isCallNew={isCallNew} isPutNew={isPutNew} /> : null}
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
          <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
        </SymbolWithLogo>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.price }]}>
        <Text style={styles.price} numberOfLines={1}>{formatIndianMoney(data.price)}</Text>
        <Text style={[styles.priceChange, { color: pctColor }]} numberOfLines={1}>{formatPct(data.price_change)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.callValue }]}>
        <Text style={styles.valText} numberOfLines={1}>{formatIndianMoney(data.call_value)}</Text>
        <Text style={styles.addText} numberOfLines={1}>{formatIndianMoney(data.call_value_addition)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.putValue }]}>
        <Text style={styles.valText} numberOfLines={1}>{formatIndianMoney(data.put_value)}</Text>
        <Text style={styles.addText} numberOfLines={1}>{formatIndianMoney(data.put_value_addition)}</Text>
      </View>
    </>
  );
}, (prev, next) => prev.data === next.data);

export function CallPutValueHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  const isSym = sort?.key === 'symbol';
  const isPrice = sort?.key === 'price';
  const isPriceChg = sort?.key === 'price_change';
  const isOICall = sort?.key === 'call_value';
  const isOIPut = sort?.key === 'put_value';
  const isAddCall = sort?.key === 'call_value_addition';
  const isAddPut = sort?.key === 'put_value_addition';

  const symArrow = isSym ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const priceArrow = isPrice ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const priceChgArrow = isPriceChg ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const oiCallArrow = isOICall ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const oiPutArrow = isOIPut ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const addCallArrow = isAddCall ? (sort.dir === 'desc' ? '▾' : '▴') : '';
  const addPutArrow = isAddPut ? (sort.dir === 'desc' ? '▾' : '▴') : '';

  return (
    <View style={styles.headerWrap}>
      <Pressable onPress={() => onSort({ key: 'symbol', getValue: (r) => r?.symbol ?? '' })} style={[styles.hCol, styles.hColLeft, { flex: COL.symbol }, Platform.OS === 'web' && styles.pointer]}>
        <View style={styles.hLineLeft}>
          <Text style={[styles.hLabel, isSym && styles.hLabelActive]}>SYMBOL</Text>
          {isSym ? <Text style={[styles.hArrow, styles.hArrowActive]}>{symArrow}</Text> : null}
        </View>
        <Text style={styles.hSubLabelSpacer}> </Text>
      </Pressable>
      <View style={[styles.hCol, { flex: COL.price }]}>
        <Pressable onPress={() => onSort({ key: 'price', getValue: (r) => sortNumber(r?.price) })} style={[styles.hLine, Platform.OS === 'web' && styles.pointer]}>
          {isPrice ? <Text style={[styles.hArrow, styles.hArrowActive]}>{priceArrow}</Text> : null}
          <Text style={[styles.hLabel, isPrice && styles.hLabelActive]}>CMP</Text>
        </Pressable>
        <Text style={styles.hSubLabelSpacer}> </Text>
      </View>
      <View style={[styles.hCol, { flex: COL.callValue }]}>
        <Pressable onPress={() => onSort({ key: 'call_value', getValue: (r) => sortNumber(r?.call_value) })} style={[styles.hLine, Platform.OS === 'web' && styles.pointer]}>
          {isOICall ? <Text style={[styles.hArrow, styles.hArrowActive]}>{oiCallArrow}</Text> : null}
          <Text style={[styles.hLabel, isOICall && styles.hLabelActive]}>CALL VALUE</Text>
        </Pressable>
        <Pressable onPress={() => onSort({ key: 'call_value_addition', getValue: (r) => sortNumber(r?.call_value_addition) })} style={[styles.hLine, Platform.OS === 'web' && styles.pointer]}>
          {isAddCall ? <Text style={[styles.hArrow, styles.hArrowActive]}>{addCallArrow}</Text> : null}
          <Text style={[styles.hSubLabel, isAddCall && styles.hLabelActive]}>Added Today</Text>
        </Pressable>
      </View>
      <View style={[styles.hCol, { flex: COL.putValue }]}>
        <Pressable onPress={() => onSort({ key: 'put_value', getValue: (r) => sortNumber(r?.put_value) })} style={[styles.hLine, Platform.OS === 'web' && styles.pointer]}>
          {isOIPut ? <Text style={[styles.hArrow, styles.hArrowActive]}>{oiPutArrow}</Text> : null}
          <Text style={[styles.hLabel, isOIPut && styles.hLabelActive]}>PUT VALUE</Text>
        </Pressable>
        <Pressable onPress={() => onSort({ key: 'put_value_addition', getValue: (r) => sortNumber(r?.put_value_addition) })} style={[styles.hLine, Platform.OS === 'web' && styles.pointer]}>
          {isAddPut ? <Text style={[styles.hArrow, styles.hArrowActive]}>{addPutArrow}</Text> : null}
          <Text style={[styles.hSubLabel, isAddPut && styles.hLabelActive]}>Added Today</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (f) => ({
  pointer: { cursor: 'pointer' },
  headerWrap: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  hCol: { minWidth: 0, justifyContent: 'flex-end', paddingLeft: f(8, 16), paddingRight: f(2, 6) },
  hColLeft: { justifyContent: 'flex-start', paddingLeft: 0 },
  hLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: f(2, 4) },
  hLineLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: f(2, 4) },
  hLabel: { fontSize: f(9.5, 12), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.2, textTransform: 'uppercase' },
  hSubLabel: { marginTop: f(2, 4), fontSize: f(8.5, 11), lineHeight: f(13, 15), fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  hSubLabelSpacer: { marginTop: f(2, 4), fontSize: f(9.5, 12), lineHeight: f(13, 16) },
  hLabelActive: { color: '#0F172A', fontFamily: 'Inter_600SemiBold' },
  hArrow: { fontSize: f(8, 11), lineHeight: f(13, 16), color: '#CBD5E1' },
  hArrowActive: { color: '#0F172A', fontWeight: 'bold' },
  newMark: { width: f(3.5, 4.5), alignSelf: 'stretch', marginLeft: -8, marginVertical: -6, marginRight: f(4, 6), borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  cell: { minWidth: 0, justifyContent: 'center', paddingLeft: f(2, 6), paddingRight: f(2, 6) },
  cellEnd: { alignItems: 'flex-end', paddingLeft: f(8, 16), paddingRight: f(2, 6) },
  symbol: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  price: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  priceChange: { marginTop: f(3, 5), fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', textAlign: 'right' },
  valText: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  addText: { marginTop: f(3, 5), fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#64748B', textAlign: 'right' },
});
