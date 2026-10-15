import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TableHeaderCell } from '@/components/CommonTable';

export const GREEN = '#16A34A';
export const RED = '#DC2626';
export const NEUTRAL = '#64748B';

export const COL = { symbol: 1.25, tp: 0.9, cmpWap: 1.05, oi: 1.15, };

export const MOST_ACTIVE_OPTIONS_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 4, bars: ['70%', '56%', '62%', '62%'] },
  { flex: COL.tp, align: 'right', lines: 1 },
  { flex: COL.cmpWap, align: 'right', lines: 2 },
  { flex: COL.oi, align: 'right', lines: 2 },
];

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

export function formatGrouped(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
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
  return `${sign}${groupDigits(parts[0])}${dec}`;
}

export function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const grouped = formatGrouped(val);
  return grouped === '—' ? '—' : `₹${grouped}`;
}

export function formatOiDelta(val) {
  if (val == null || val === '' || val === '—') return '—';
  const str = String(val).trim().replace(/[₹,\s]/g, '');
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return String(val);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const parts = String(abs).split('.');
  const dec = parts.length > 1 ? `.${parts[1]}` : '';
  return `${sign}${groupDigits(parts[0])}${dec}`;
}

export function parseNumber(val) {
  if (val == null || val === '' || val === '—') return 0;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function hasLevel(val) {
  return val != null && val !== '' && val !== '—';
}

function highLowLines(lowVal, highVal) {
  const hasLow = hasLevel(lowVal);
  const hasHigh = hasLevel(highVal);
  if (!hasLow && !hasHigh) return null;
  if (hasLow && hasHigh && parseNumber(lowVal) > parseNumber(highVal)) {
    return { high: formatGrouped(lowVal), low: formatGrouped(highVal) };
  }
  return {
    high: hasHigh ? formatGrouped(highVal) : null,
    low: hasLow ? formatGrouped(lowVal) : null,
  };
}

export const MostActiveOptionsRow = memo(function MostActiveOptionsRow({ data, optionType }) {
  if (!data) return null;

  const priceChangeNum = parseNumber(data.price_change);
  const cmpColor = priceChangeNum > 0 ? GREEN : priceChangeNum < 0 ? RED : '#0F172A';

  const chgInOiNum = parseNumber(data.chg_in_oi);
  const oiDeltaColor = chgInOiNum > 0 ? GREEN : chgInOiNum < 0 ? RED : NEUTRAL;

  const optSuffix = optionType === 'put' ? 'PE' : 'CE';
  const levels = highLowLines(data.low, data.high);
  const newColor = data.is_new === 'green' ? GREEN : data.is_new === 'red' ? RED : null;

  return (
    <>
      {newColor ? <View style={[styles.newMark, { backgroundColor: newColor }]} /> : null}
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
        {data.strike != null && data.strike !== '' ? (
          <Text style={styles.strike} numberOfLines={1}>
            {`SP: ${formatGrouped(data.strike)} ${optSuffix}`}
          </Text>
        ) : null}
        {levels?.high ? (
          <Text style={styles.rangeText} numberOfLines={1}>{`High: ${levels.high}`}</Text>
        ) : null}
        {levels?.low ? (
          <Text style={styles.rangeText} numberOfLines={1}>{`Low: ${levels.low}`}</Text>
        ) : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.tp }]}>
        <Text style={styles.tp} numberOfLines={1}>{formatMoney(data.trigger_point)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.cmpWap }]}>
        <Text style={[styles.cmp, { color: cmpColor }]} numberOfLines={1}>
          {formatMoney(data.price)}
        </Text>
        <Text style={styles.wap} numberOfLines={1}>
          {formatMoney(data.wap)}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.oi }]}>
        <Text style={styles.oi} numberOfLines={1}>{formatGrouped(data.oi)}</Text>
        <Text style={[styles.oiDelta, { color: oiDeltaColor }]} numberOfLines={1}>
          {formatOiDelta(data.chg_in_oi)}
        </Text>
      </View>
    </>
  );
});

export function MostActiveOptionsHeader({ sort, onSort }) {
  return (
    <>
      <TableHeaderCell
        label="SYMBOL"
        flex={COL.symbol}
        align="left"
        sortKey="symbol"
        getValue={(row) => row?.symbol ?? ''}
        sort={sort}
        onSort={onSort}
        style={styles.symbolHeader}
      />
      <TableHeaderCell
        label="TP"
        flex={COL.tp}
        align="right"
        sortKey="trigger_point"
        getValue={(row) => sortNumber(row?.trigger_point)}
        sort={sort}
        onSort={onSort}
        style={styles.endHeader}
      />
      <TableHeaderCell
        label="CMP / WAP"
        flex={COL.cmpWap}
        align="right"
        sortKey="price"
        getValue={(row) => sortNumber(row?.price)}
        sort={sort}
        onSort={onSort}
        style={styles.endHeader}
      />
      <TableHeaderCell
        label="OI"
        flex={COL.oi}
        align="right"
        sortKey="oi"
        getValue={(row) => sortNumber(row?.oi)}
        sort={sort}
        onSort={onSort}
        style={styles.endHeader}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Sits on the left edge of the shared table row (8px horizontal, 6px vertical padding).
  newMark: {
    width: 3.5,
    alignSelf: 'stretch',
    marginLeft: -8,
    marginVertical: -6,
    marginRight: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  cell: { minWidth: 0, justifyContent: 'center', paddingLeft: 2, paddingRight: 2 },
  cellEnd: { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 0 },
  symbolHeader: { paddingLeft: 2, paddingRight: 2 },
  endHeader: { paddingLeft: 0, paddingRight: 0 },
  symbol: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  strike: { marginTop: 2, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#64748B' },
  rangeText: { marginTop: 2, fontSize: 8.5, lineHeight: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  tp: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'right' },
  cmp: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  wap: { marginTop: 2, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#64748B', textAlign: 'right' },
  oi: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  oiDelta: { marginTop: 2, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
});
