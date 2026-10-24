import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TableHeaderCell } from '@/components/CommonTable';
import { SymbolLink, SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { openFutureProfile } from '@/utils/instrumentProfile';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

export const COL = { symbol: 1.35, cmp: 1.1, wap: 1.05, hl: 1.5 };

export const FUTURE_TABLE_COLUMNS = [{ flex: COL.symbol, align: 'left', lines: 1 }, { flex: COL.cmp, align: 'right', lines: 2 }, { flex: COL.wap, align: 'right', lines: 1 }, { flex: COL.hl, align: 'left', lines: 2 }];

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

function ChangeText({ value }) {
  const styles = useFluidStyles(createStyles);
  const text = formatPct(value);
  if (!text) return null;
  const tone = text.startsWith('+') ? 'pos' : text.startsWith('-') ? 'neg' : 'flat';
  const color = tone === 'pos' ? GREEN : tone === 'neg' ? RED : NEUTRAL;
  return <Text style={[styles.change, { color }]} numberOfLines={1}>{text}</Text>;
}

export const FutureRow = memo(function FutureRow({ data }) {
  if (!data) return null;
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();
  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <SymbolLink label={`Open ${data.symbol} profile`} onPress={() => openFutureProfile({ symbol: data.symbol })}>
          <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
            <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
          </SymbolWithLogo>
        </SymbolLink>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.cmp }]}>
        <Text style={styles.cmp} numberOfLines={1}>{formatMoney(data.price)}</Text>
        <ChangeText value={data.price_change} />
      </View>
      <View style={[styles.cell, styles.cellWap, { flex: COL.wap }]}>
        <Text style={styles.wap} numberOfLines={1}>{formatMoney(data.wap)}</Text>
      </View>
      <View style={[styles.cell, styles.hlCell, { flex: COL.hl }]}>
        <View style={styles.hlRow}>
          <Text style={styles.hlLabel}>High</Text>
          <Text style={styles.hlValue} numberOfLines={1}>{formatGrouped(data.high5day)}</Text>
        </View>
        <View style={styles.hlRow}>
          <Text style={styles.hlLabel}>Low</Text>
          <Text style={styles.hlValue} numberOfLines={1}>{formatGrouped(data.low5day)}</Text>
        </View>
      </View>
    </>
  );
});

export function FutureHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  return (
    <>
      <TableHeaderCell label="Symbol" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} />
      <TableHeaderCell label="CMP" flex={COL.cmp} align="right" sortKey="price" getValue={(row) => sortNumber(row?.price)} sort={sort} onSort={onSort} style={styles.cmpHeader} />
      <TableHeaderCell label="WAP" flex={COL.wap} align="right" sortKey="wap" getValue={(row) => sortNumber(row?.wap)} sort={sort} onSort={onSort} style={styles.wapHeader} />
      <TableHeaderCell label="5 DAY HIGH / LOW" flex={COL.hl} align="left" sortKey="high5day" getValue={(row) => sortNumber(row?.high5day)} sort={sort} onSort={onSort} style={styles.hlHeader} />
    </>
  );
}

const createStyles = (f) => ({
  cell: { minWidth: 0, justifyContent: 'center', paddingRight: f(6, 14) },
  cellEnd: { alignItems: 'flex-end', paddingRight: f(10, 20), paddingLeft: f(4, 10) },
  cellWap: { alignItems: 'flex-end', paddingRight: f(10, 20), paddingLeft: f(6, 12) },
  symbol: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  cmp: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'right' },
  change: { marginTop: f(2, 3), fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  wap: { fontSize: f(11.5, 14.5), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  cmpHeader: { paddingRight: f(10, 20) },
  wapHeader: { paddingRight: f(10, 20) },
  hlHeader: { paddingLeft: f(10, 20), paddingRight: f(4, 12) },
  hlCell: { paddingLeft: f(10, 20), paddingRight: f(4, 12), gap: f(4, 6), borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E4E8EE' },
  hlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: f(200, 260), gap: f(8, 16) },
  hlLabel: { fontSize: f(10, 12), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  hlValue: { flexShrink: 1, fontSize: f(11, 14), lineHeight: f(14, 18), fontFamily: 'Inter_600SemiBold', color: '#1E293B', textAlign: 'right' },
});
