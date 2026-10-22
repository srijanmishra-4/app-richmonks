import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TableHeaderCell } from '@/components/CommonTable';
import { SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { useFluid, useFluidStyles } from '@/utils/responsive';

export const GREEN = '#16A34A';
export const RED = '#DC2626';
export const NEUTRAL = '#64748B';

// Five columns, spaced like trending options. OI is the widest so an 8-digit
// Indian-grouped value (1,23,45,678) and its signed delta stay on one line.
export const COL = { symbol: 1.1, tp: 0.92, cmpWap: 1.05, hl: 1.02, oi: 1.0 };

export const MOST_ACTIVE_OPTIONS_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 2, bars: ['70%', '56%'] },
  { flex: COL.tp, align: 'center', lines: 1 },
  { flex: COL.cmpWap, align: 'center', lines: 2 },
  { flex: COL.hl, align: 'center', lines: 2 },
  { flex: COL.oi, align: 'right', lines: 2 },
];

function useMostActiveType() {
  const f = useFluid();
  return useMemo(() => {
    const text = { fontFamily: 'Inter_500Medium' };
    return {
      gap: f(8, 16),
      stackGap: f(4, 6),
      symbol: { ...text, fontFamily: 'Inter_600SemiBold', fontSize: f(10.5, 14.5), lineHeight: f(14, 19), color: '#0F172A' },
      strike: { ...text, fontSize: f(9, 12), lineHeight: f(12, 16), color: '#64748B' },
      center: { ...text, fontFamily: 'Inter_600SemiBold', fontSize: f(10, 14), lineHeight: f(14, 18), color: '#0F172A', textAlign: 'center' },
      oi: { ...text, fontSize: f(10, 14), lineHeight: f(14, 18), color: '#0F172A', textAlign: 'right' },
      sub: { ...text, fontSize: f(9, 12), lineHeight: f(12, 16), color: '#64748B', textAlign: 'right' },
      centerSub: { ...text, fontSize: f(9, 12), lineHeight: f(12, 16), color: '#64748B', textAlign: 'center' },
      hl: { ...text, fontFamily: 'Inter_600SemiBold', fontSize: f(10, 14), lineHeight: f(14, 18), color: '#1E293B', textAlign: 'center' },
    };
  }, [f]);
}

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
  const styles = useFluidStyles(createStyles);
  const type = useMostActiveType();
  const showLogo = useShowReportSymbolLogo();
  if (!data) return null;

  const priceChangeNum = parseNumber(data.price_change);
  const cmpColor = priceChangeNum > 0 ? GREEN : priceChangeNum < 0 ? RED : '#0F172A';

  const chgInOiNum = parseNumber(data.chg_in_oi);
  const oiDeltaColor = chgInOiNum > 0 ? GREEN : chgInOiNum < 0 ? RED : NEUTRAL;

  const optSuffix = optionType === 'put' ? 'PE' : 'CE';
  const levels = highLowLines(data.low, data.high);
  const newColor = data.is_new === 'green' ? GREEN : data.is_new === 'red' ? RED : null;
  const end = [styles.cell, styles.cellEnd, { marginLeft: type.gap }];
  const mid = [styles.cell, styles.cellCenter, { marginLeft: type.gap }];
  const stack = { gap: type.stackGap };

  return (
    <>
      {newColor ? <View style={[styles.newMark, { backgroundColor: newColor }]} /> : null}
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
          <View style={stack}>
            <Text style={type.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
            {data.strike != null && data.strike !== '' ? (
              <Text style={type.strike} numberOfLines={1}>
                {`SP: ${formatGrouped(data.strike)} ${optSuffix}`}
              </Text>
            ) : null}
          </View>
        </SymbolWithLogo>
      </View>
      <View style={[mid, styles.cellTop, { flex: COL.tp }]}>
        <Text style={type.center} numberOfLines={1}>{formatMoney(data.trigger_point)}</Text>
      </View>
      <View style={[mid, stack, { flex: COL.cmpWap }]}>
        <Text style={[type.center, { color: cmpColor }]} numberOfLines={1}>
          {formatMoney(data.price)}
        </Text>
        <Text style={type.centerSub} numberOfLines={1}>
          {formatMoney(data.wap)}
        </Text>
      </View>
      <View style={[mid, stack, { flex: COL.hl }]}>
        <Text style={type.hl} numberOfLines={1}>{levels?.high ?? '—'}</Text>
        <Text style={type.hl} numberOfLines={1}>{levels?.low ?? '—'}</Text>
      </View>
      <View style={[end, stack, { flex: COL.oi }]}>
        <Text style={type.oi} numberOfLines={1}>{formatGrouped(data.oi)}</Text>
        <Text style={[type.sub, { color: oiDeltaColor }]} numberOfLines={1}>
          {formatOiDelta(data.chg_in_oi)}
        </Text>
      </View>
    </>
  );
});

export function MostActiveOptionsHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  const type = useMostActiveType();
  const colGap = { marginLeft: type.gap, minWidth: 0 };

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
        align="center"
        sortKey="trigger_point"
        getValue={(row) => sortNumber(row?.trigger_point)}
        sort={sort}
        onSort={onSort}
        style={[styles.centerHeader, colGap]}
      />
      <TableHeaderCell
        label="CMP / WAP"
        flex={COL.cmpWap}
        align="center"
        sortKey="price"
        getValue={(row) => sortNumber(row?.price)}
        sort={sort}
        onSort={onSort}
        style={[styles.centerHeader, colGap]}
      />
      <TableHeaderCell
        label="HIGH / LOW"
        flex={COL.hl}
        align="center"
        sortKey="high"
        getValue={(row) => sortNumber(row?.high)}
        sort={sort}
        onSort={onSort}
        style={[styles.centerHeader, colGap]}
      />
      <TableHeaderCell
        label="OI"
        flex={COL.oi}
        align="right"
        sortKey="oi"
        getValue={(row) => sortNumber(row?.oi)}
        sort={sort}
        onSort={onSort}
        style={[styles.endHeader, colGap]}
      />
    </>
  );
}

const createStyles = (f) => ({
  newMark: {
    width: f(3.5, 4.5),
    alignSelf: 'stretch',
    marginLeft: -8,
    marginVertical: -6,
    marginRight: f(4, 6),
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  cell: { minWidth: 0, justifyContent: 'center', overflow: 'hidden', paddingVertical: f(4, 8) },
  cellEnd: { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 0 },
  cellCenter: { alignItems: 'center', paddingLeft: 0, paddingRight: 0 },
  cellTop: { alignSelf: 'stretch', justifyContent: 'flex-start' },
  symbolHeader: { minWidth: 0, paddingLeft: 0, paddingRight: 2 },
  endHeader: { paddingLeft: 0, paddingRight: 0 },
  centerHeader: { paddingLeft: 0, paddingRight: 0 },
});
