import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TableHeaderCell } from '@/components/CommonTable';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

export const COL = { symbol: 1.3, cmp: 1.1, level: 1.1, rank: 0.6 };

export const SHIFTING_GEARS_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 1 },
  { flex: COL.cmp, align: 'right', lines: 2 },
  { flex: COL.level, align: 'right', lines: 1 },
  { flex: COL.rank, align: 'right', lines: 1 },
];

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatGrouped(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }
  if (isNaN(parseFloat(str))) return String(val);
  const parts = str.split('.');
  const dec = parts.length > 1 ? `.${parts[1]}` : '';
  return `${sign}${groupDigits(parts[0])}${dec}`;
}

function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const grouped = formatGrouped(val);
  return grouped === '—' ? '—' : `₹${grouped}`;
}

function formatPct(val) {
  if (val == null || val === '') return '';
  const clean = String(val).trim().replace(/%/g, '').trim();
  const num = Number(clean);
  if (!Number.isFinite(num)) return String(val);
  const body = clean.replace(/^[+-]/, '');
  if (num > 0) return `+${body}%`;
  if (num < 0) return `-${body}%`;
  return `${body}%`;
}

function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const ShiftingGearsRow = memo(function ShiftingGearsRow({ data, levelField }) {
  if (!data) return null;

  const priceChangeText = formatPct(data.price_change);
  const priceChangeNum = sortNumber(data.price_change);
  const priceChangeColor = priceChangeNum > 0 ? GREEN : priceChangeNum < 0 ? RED : NEUTRAL;

  return (
    <>
      <View style={[styles.cell, styles.symbolCell, { flex: COL.symbol }]}>
        <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
      </View>
      <View style={[styles.cell, styles.cmpCell, { flex: COL.cmp }]}>
        <Text style={styles.cmp} numberOfLines={1}>{formatMoney(data.price)}</Text>
        {priceChangeText ? (
          <Text style={[styles.change, { color: priceChangeColor }]} numberOfLines={1}>{priceChangeText}</Text>
        ) : null}
      </View>
      <View style={[styles.cell, styles.levelCell, { flex: COL.level }]}>
        <Text style={styles.levelValue} numberOfLines={1}>{formatMoney(data[levelField])}</Text>
      </View>
      <View style={[styles.cell, styles.rankCell, { flex: COL.rank }]}>
        <Text style={styles.rank} numberOfLines={1}>{data.rank != null ? data.rank : '—'}</Text>
      </View>
    </>
  );
});

export function ShiftingGearsHeader({ sort, onSort, levelField, levelLabel }) {
  return (
    <>
      <TableHeaderCell label="SYMBOL" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} style={styles.symbolHeader} />
      <TableHeaderCell label="CMP" flex={COL.cmp} align="right" sortKey="price" getValue={(row) => sortNumber(row?.price)} sort={sort} onSort={onSort} style={styles.cmpHeader} />
      <TableHeaderCell label={levelLabel} flex={COL.level} align="right" sortKey={levelField} getValue={(row) => sortNumber(row?.[levelField])} sort={sort} onSort={onSort} style={styles.levelHeader} />
      <TableHeaderCell label="RANK" flex={COL.rank} align="right" sortKey="rank" getValue={(row) => sortNumber(row?.rank)} sort={sort} onSort={onSort} style={styles.rankHeader} />
    </>
  );
}

const styles = StyleSheet.create({
  cell: { minWidth: 0, justifyContent: 'center' },
  symbolCell: { paddingRight: 8 },
  cmpCell: { alignItems: 'flex-end', paddingLeft: 8, paddingRight: 12 },
  levelCell: { alignItems: 'flex-end', paddingLeft: 8, paddingRight: 12 },
  rankCell: { alignItems: 'flex-end', paddingLeft: 8, paddingRight: 8 },
  symbolHeader: { paddingRight: 8 },
  cmpHeader: { paddingLeft: 8, paddingRight: 12 },
  levelHeader: { paddingLeft: 8, paddingRight: 12 },
  rankHeader: { paddingLeft: 8, paddingRight: 8 },
  symbol: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  cmp: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  change: { marginTop: 2, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  levelValue: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  rank: { alignSelf: 'stretch', fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
});
