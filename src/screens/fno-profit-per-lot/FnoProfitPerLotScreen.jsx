import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonMetaRow, SkeletonSummaryCard, usePulse } from '@/components/skeleton/SkeletonBars';
import { SYMBOL_LOGO_GAP, SYMBOL_LOGO_SIZE, SymbolLink, SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { openFutureProfile } from '@/utils/instrumentProfile';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

// ─── Design Tokens ──────────────────────────────────────────────────────────────

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

// ─── Column Flex Weights ────────────────────────────────────────────────────────

const COL = { symbol: 1.4, cmp: 1.05, today: 1, fiveDays: 1 };

const TABLE_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 2 },
  { flex: COL.cmp, align: 'right', lines: 2 },
  { flex: COL.today, align: 'right', lines: 1 },
  { flex: COL.fiveDays, align: 'right', lines: 1 },
];

// ─── Formatting Utilities (Indian comma grouping) ───────────────────────────────

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatCurrency(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(Math.round(num));
  const formatted = groupDigits(String(abs));
  if (num < 0) return `-₹${formatted}`;
  return `₹${formatted}`;
}

function formatCurrencySigned(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(Math.round(num));
  const formatted = groupDigits(String(abs));
  if (num < 0) return `-₹${formatted}`;
  if (num > 0) return `+₹${formatted}`;
  return `₹0`;
}

function formatPctSigned(val) {
  if (val == null || val === '') return '';
  const num = parseFloat(String(val));
  if (!Number.isFinite(num)) return '';
  if (num === 0) return '0%';
  if (num > 0) return `+${num}%`;
  return `${num}%`;
}

function formatPriceChangePct(val) {
  if (val == null || val === '') return '';
  const num = parseFloat(String(val).replace(/%/g, '').trim());
  if (!Number.isFinite(num)) return String(val);
  const body = Math.abs(num).toFixed(1);
  if (num > 0) return `+${body}%`;
  if (num < 0) return `-${body}%`;
  return `0.0%`;
}

function valueColor(val) {
  if (val == null || val === '') return NEUTRAL;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,%\s]/g, ''));
  if (!Number.isFinite(num) || num === 0) return NEUTRAL;
  return num > 0 ? GREEN : RED;
}

function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ─── Row Component ──────────────────────────────────────────────────────────────

const PPLRow = memo(function PPLRow({ data }) {
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();
  if (!data) return null;

  const pc = formatPriceChangePct(data.price_change);
  const pcColor = pc.startsWith('+') ? GREEN : pc.startsWith('-') ? RED : NEUTRAL;
  const todayColor = valueColor(data.today);
  const fiveDaysColor = valueColor(data['5_days']);

  return (
    <>
      <View style={[styles.cell, styles.cellSymbol, { flex: COL.symbol }]}>
        <SymbolLink label={`Open ${data.symbol} profile`} onPress={() => openFutureProfile({ symbol: data.symbol })}>
          <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
            <Text style={styles.symbolText} numberOfLines={1}>{data.symbol || '—'}</Text>
            <Text style={styles.lotText} numberOfLines={1}>({data.lot ?? '—'})</Text>
          </SymbolWithLogo>
        </SymbolLink>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.cmp }]}>
        <Text style={styles.cmpPrice} numberOfLines={1}>{formatCurrency(data.price)}</Text>
        {pc ? <Text style={[styles.cmpChange, { color: pcColor }]} numberOfLines={1}>{pc}</Text> : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.today }]}>
        <Text style={[styles.pplValue, { color: todayColor }]} numberOfLines={1}>{formatCurrency(data.today)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.fiveDays }]}>
        <Text style={[styles.pplValue, { color: fiveDaysColor }]} numberOfLines={1}>{formatCurrency(data['5_days'])}</Text>
      </View>
    </>
  );
});

// ─── Header Component ───────────────────────────────────────────────────────────
// Same four flex columns as the row. The old group wrapper did not share those
// widths, so Today / 5 Days sat off the amounts.

function PPLHeaderCell({ label, flex, align = 'left', sortKey, getValue, sort, onSort, style, indent = 0 }) {
  const styles = useFluidStyles(createStyles);
  const active = sort?.key === sortKey;
  const arrow = active ? (sort.dir === 'desc' ? '▾' : '▴') : null;

  return (
    <Pressable
      onPress={() => onSort?.({ key: sortKey, getValue })}
      style={[styles.headCell, { flex }, align === 'right' ? styles.headCellRight : null, style, Platform.OS === 'web' ? styles.pointer : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {indent ? <View style={{ width: indent }} /> : null}
      {align === 'right' && arrow ? <Text style={styles.headArrow}>{arrow}</Text> : null}
      <Text style={[styles.headLabel, align === 'right' ? styles.headLabelRight : null, active ? styles.headLabelActive : null]} numberOfLines={align === 'right' ? 1 : 2}>{label}</Text>
      {align !== 'right' && arrow ? <Text style={styles.headArrow}>{arrow}</Text> : null}
    </Pressable>
  );
}

function PPLHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();

  return (
    <View style={styles.headWrap}>
      <View style={styles.headLine}>
        <View style={{ flexGrow: COL.symbol + COL.cmp + COL.today / 2, flexShrink: 1, flexBasis: 0 }} />
        <View style={[styles.pplGroupSlot, { flexGrow: COL.today / 2 + COL.fiveDays }]}>
          <Text style={styles.pplGroupLabel} numberOfLines={1}>PROFIT PER LOT</Text>
        </View>
      </View>
      <View style={styles.headLine}>
        <PPLHeaderCell
          label={'SYMBOL\n(LOT)'}
          flex={COL.symbol}
          sortKey="symbol"
          getValue={(row) => row?.symbol ?? ''}
          sort={sort}
          onSort={onSort}
          style={styles.cellSymbol}
          indent={showLogo ? SYMBOL_LOGO_SIZE + SYMBOL_LOGO_GAP : 0}
        />
        <PPLHeaderCell
          label="CMP"
          flex={COL.cmp}
          align="right"
          sortKey="price"
          getValue={(row) => sortNumber(row?.price)}
          sort={sort}
          onSort={onSort}
        />
        <PPLHeaderCell
          label="Today"
          flex={COL.today}
          align="right"
          sortKey="today"
          getValue={(row) => sortNumber(row?.today)}
          sort={sort}
          onSort={onSort}
        />
        <PPLHeaderCell
          label="5 Days"
          flex={COL.fiveDays}
          align="right"
          sortKey="5_days"
          getValue={(row) => sortNumber(row?.['5_days'])}
          sort={sort}
          onSort={onSort}
        />
      </View>
    </View>
  );
}

// ─── Screen Component ───────────────────────────────────────────────────────────

function FnoProfitPerLotScreen() {
  const styles = useFluidStyles(createStyles);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);

  useEffect(() => {
    const gen = ++genRef.current;
    setLoading(true);
    setError(false);
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_FNO_ALL_STOCKS_PPL')
        .then((res) => {
          if (gen !== genRef.current) return null;
          setData(res);
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[FnoProfitPerLot] Socket fetch error:', err?.message);
          setError(true);
          setLoading(false);
          return null;
        });
    });
    queueRef.current = task.then(() => { }, () => { });
    return () => { genRef.current += 1; };
  }, []);

  const rows = data?.data ?? [];
  const expiryDate = data?.expiry_date ?? '';
  const cdate = data?.cdate ?? '';
  const pl1day = data?.oneDayPpl?.pl1day ?? 0;
  const pl1daypercent = data?.oneDayPpl?.pl1daypercent ?? '0';
  const pl5day = data?.fiveDayPpl?.pl5day ?? 0;
  const pl5daypercent = data?.fiveDayPpl?.pl5daypercent ?? '0';

  const todayColor = valueColor(pl1day);
  const fiveDayColor = valueColor(pl5day);
  const todayPctColor = valueColor(parseFloat(pl1daypercent));
  const fiveDayPctColor = valueColor(parseFloat(pl5daypercent));

  const HeaderComponent = useCallback(({ sort, onSort }) => <PPLHeader sort={sort} onSort={onSort} />, []);
  const pulse = usePulse(loading);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="FNO Profit Per Lot" timestamp={cdate} />

      {loading ? (
        <View style={styles.content}>
          <SkeletonMetaRow pulse={pulse} />
          <SkeletonSummaryCard pulse={pulse} />
          <View style={styles.table}>
            <CommonTable data={[]} columns={TABLE_COLUMNS} loading HeaderComponent={HeaderComponent} emptyText="No stocks to show" />
          </View>
        </View>
      ) : error || !data ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error ? 'Failed to load report. Please try again.' : 'No data available.'}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaLabel}>Expiry Date</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaValue}>{expiryDate || '—'}</Text>
            </View>
          </View>

          {/* Summary Section */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Today</Text>
              <Text style={[styles.summaryValue, { color: todayColor }]} numberOfLines={1}>{formatCurrencySigned(pl1day)}</Text>
              <Text style={[styles.summaryPct, { color: todayPctColor }]}>{formatPctSigned(pl1daypercent)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>5 Days</Text>
              <Text style={[styles.summaryValue, { color: fiveDayColor }]} numberOfLines={1}>{formatCurrencySigned(pl5day)}</Text>
              <Text style={[styles.summaryPct, { color: fiveDayPctColor }]}>{formatPctSigned(pl5daypercent)}</Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <CommonTable
              data={rows}
              columns={TABLE_COLUMNS}
              HeaderComponent={HeaderComponent}
              RowComponent={PPLRow}
              emptyText="No stocks to show"
              rowStyle={styles.tableRowStyle}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(FnoProfitPerLotScreen);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: f(20, 28) },
  emptyText: { fontSize: f(13, 15), fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  content: { flex: 1, minHeight: 0 },

  // Metadata Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: f(16, 24),
    paddingTop: f(2, 6),
    paddingBottom: f(8, 12),
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: f(6, 8) },
  metaLabel: { fontSize: f(11, 12.5), fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  metaValue: { fontSize: f(11.5, 13), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: f(16, 24),
    marginBottom: f(12, 16),
    backgroundColor: '#FFFFFF',
    borderRadius: f(10, 14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingVertical: f(10, 16),
  },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: {
    fontSize: f(10, 11),
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    marginBottom: f(4, 6),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: { fontSize: f(18, 22), fontFamily: 'Inter_700Bold', lineHeight: f(24, 28) },
  summaryPct: { fontSize: f(12, 14), fontFamily: 'Inter_600SemiBold', marginTop: f(2, 4) },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', alignSelf: 'stretch', marginVertical: 4 },

  // Table wrapper
  table: { flex: 1, minHeight: 0 },
  tableRowStyle: { minHeight: f(50, 60), paddingVertical: f(6, 10) },

  // Table cells
  cell: { justifyContent: 'center', minWidth: 0 },
  cellSymbol: { minWidth: 0, paddingLeft: 0, paddingRight: f(4, 8) },
  cellEnd: { alignItems: 'flex-end', minWidth: 0, paddingLeft: f(4, 8), paddingRight: 0 },
  headWrap: { flex: 1, minWidth: 0, justifyContent: 'flex-end' },
  headLine: { flexDirection: 'row', alignItems: 'flex-end', minWidth: 0 },
  headCell: { flexDirection: 'row', alignItems: 'center', minWidth: 0, paddingRight: f(4, 8) },
  headCellRight: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: f(4, 8) },
  headLabel: { flexShrink: 1, fontSize: f(10, 12), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase' },
  headLabelRight: { letterSpacing: 0 },
  headLabelActive: { color: '#64748B' },
  headArrow: { fontSize: f(8, 11), lineHeight: f(13, 16), color: '#64748B', marginRight: f(2, 3) },
  pointer: { cursor: 'pointer' },

  symbolText: { fontSize: f(11.5, 13.5), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  lotText: { fontSize: f(10, 11.5), lineHeight: f(14, 16), fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 1 },
  cmpPrice: { fontSize: f(11.5, 13.5), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  cmpChange: { fontSize: f(10, 11.5), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', marginTop: 3, textAlign: 'right' },
  pplValue: { fontSize: f(11.5, 13.5), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', textAlign: 'right' },

  // Multi-level header for "Profit Per Lot"
  pplGroupSlot: { flexShrink: 1, flexBasis: 0, minWidth: 0, marginBottom: f(3, 5), flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  pplGroupLabel: {
    fontSize: f(9, 10.5),
    lineHeight: f(12, 14),
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
