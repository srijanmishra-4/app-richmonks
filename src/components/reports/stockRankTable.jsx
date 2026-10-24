import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TableHeaderCell } from '@/components/CommonTable';
import { SymbolLink, SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { openFutureProfile } from '@/utils/instrumentProfile';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

export const COL = {
  symbol: 1.2,
  rank: 0.5,
  cmp: 1.3,
  ppl5Days: 1.3,
};

export const STOCK_RANK_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 1 },
  { flex: COL.rank, align: 'right', lines: 2 },
  { flex: COL.cmp, align: 'right', lines: 2 },
  { flex: COL.ppl5Days, align: 'right', lines: 1 },
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

export function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const grouped = formatGrouped(val);
  return grouped === '—' ? '—' : `₹${grouped}`;
}

export function formatPct(val) {
  if (val == null || val === '' || val === '—') return '—';
  const clean = String(val).trim().replace(/%/g, '').trim();
  const num = Number(clean);
  if (!Number.isFinite(num)) return String(val);
  const body = clean.replace(/^[+-]/, '');
  if (num > 0) return `+${body}%`;
  if (num < 0) return `-${body}%`;
  return `${body}%`;
}

export function formatPpl(val) {
  if (val == null || val === '' || val === '—') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const abs = Math.abs(num);
  const parts = String(abs).split('.');
  const formatted = groupDigits(parts[0]) + (parts[1] ? `.${parts[1]}` : '');
  if (num < 0) return `-₹${formatted}`;
  if (num > 0) return `+₹${formatted}`;
  return `₹0`;
}

export function formatRankDelta(val) {
  if (val == null || val === '' || val === '—') return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  if (num > 0) return `+${num}`;
  if (num < 0) return `${num}`;
  return '0';
}

export function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const StockRankRow = memo(function StockRankRow({ data }) {
  if (!data) return null;
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();
  const priceChangeText = formatPct(data.price_change);
  const priceChangeNum = sortNumber(data.price_change);
  const priceChangeColor = priceChangeNum > 0 ? GREEN : priceChangeNum < 0 ? RED : NEUTRAL;

  const pplText = formatPpl(data['5_days_ppl']);
  const pplNum = sortNumber(data['5_days_ppl']);
  const pplColor = pplNum > 0 ? GREEN : pplNum < 0 ? RED : NEUTRAL;

  const rankDeltaText = formatRankDelta(data['5_days_rank']);
  const rankDeltaNum = sortNumber(data['5_days_rank']);
  const rankDeltaColor = rankDeltaNum > 0 ? GREEN : rankDeltaNum < 0 ? RED : NEUTRAL;

  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <SymbolLink label={`Open ${data.symbol} profile`} onPress={() => openFutureProfile({ symbol: data.symbol })}>
          <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
            <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
          </SymbolWithLogo>
        </SymbolLink>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.rank }]}>
        <Text style={styles.rank} numberOfLines={1}>{data.rank != null ? data.rank : '—'}</Text>
        {rankDeltaText ? (
          <Text style={[styles.rankDelta, { color: rankDeltaColor }]} numberOfLines={1}>{rankDeltaText}</Text>
        ) : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.cmp }]}>
        <Text style={styles.cmp} numberOfLines={1}>{formatMoney(data.price)}</Text>
        <Text style={[styles.change, { color: priceChangeColor }]} numberOfLines={1}>{priceChangeText}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.ppl5Days }]}>
        <Text style={[styles.ppl, { color: pplColor }]} numberOfLines={1}>{pplText}</Text>
      </View>
    </>
  );
});

export function StockRankHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  return (
    <>
      <TableHeaderCell label="SYMBOL" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} style={styles.symbolHeader} />
      <TableHeaderCell label="RANK" flex={COL.rank} align="right" sortKey="rank" getValue={(row) => sortNumber(row?.rank)} sort={sort} onSort={onSort} style={styles.endHeader} />
      <TableHeaderCell label="CMP" flex={COL.cmp} align="right" sortKey="price" getValue={(row) => sortNumber(row?.price)} sort={sort} onSort={onSort} style={styles.endHeader} />
      <TableHeaderCell label={'PPL\n5 DAYS'} flex={COL.ppl5Days} align="right" sortKey="5_days_ppl" getValue={(row) => sortNumber(row?.['5_days_ppl'])} sort={sort} onSort={onSort} style={styles.endHeader} />
    </>
  );
}

const createStyles = (f) => ({
  cell: { minWidth: 0, justifyContent: 'center', paddingLeft: f(2, 6), paddingRight: f(2, 6) },
  cellEnd: { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 0 },
  symbolHeader: { paddingLeft: f(2, 6), paddingRight: f(2, 6) },
  endHeader: { paddingLeft: 0, paddingRight: 0 },
  symbol: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  rank: { alignSelf: 'stretch', fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  rankDelta: { alignSelf: 'stretch', marginTop: f(2, 3), fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', textAlign: 'right' },
  cmp: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  change: { marginTop: f(2, 3), fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', textAlign: 'right' },
  ppl: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', textAlign: 'right' },
});
