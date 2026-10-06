import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable, { TableHeaderCell } from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import { socketRequest } from '@/utils/socket';

// ─── Design Tokens ──────────────────────────────────────────────────────────────

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

// ─── Column Flex Weights ────────────────────────────────────────────────────────

const COL = { symbol: 1.1, cmp: 1, today: 1, fiveDays: 1 };

// ─── Formatting Utilities (project conventions — Indian comma grouping) ─────────

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
  if (!data) return null;
  const pc = formatPriceChangePct(data.price_change);
  const pcColor = pc.startsWith('+') ? GREEN : pc.startsWith('-') ? RED : NEUTRAL;
  const todayColor = valueColor(data.today);
  const fiveDaysColor = valueColor(data['5_days']);

  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <Text style={styles.symbolText} numberOfLines={1}>{data.symbol || '—'}</Text>
        <Text style={styles.lotText} numberOfLines={1}>({data.lot ?? '—'})</Text>
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

function PPLHeader({ sort, onSort }) {
  return (
    <>
      <TableHeaderCell label={'SYMBOL\n(LOT)'} flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} />
      <TableHeaderCell label="CMP" flex={COL.cmp} align="right" sortKey="price" getValue={(row) => sortNumber(row?.price)} sort={sort} onSort={onSort} />
      <View style={[styles.pplHeaderGroup, { flex: COL.today + COL.fiveDays }]}>
        <Text style={styles.pplGroupLabel}>PROFIT PER LOT</Text>
        <View style={styles.pplSubRow}>
          <TableHeaderCell label="Today" flex={COL.today} align="right" sortKey="today" getValue={(row) => sortNumber(row?.today)} sort={sort} onSort={onSort} />
          <TableHeaderCell label="5 Days" flex={COL.fiveDays} align="right" sortKey="5_days" getValue={(row) => sortNumber(row?.['5_days'])} sort={sort} onSort={onSort} />
        </View>
      </View>
    </>
  );
}

// ─── Screen Component ───────────────────────────────────────────────────────────

function FnoProfitPerLotScreen() {
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="FNO Profit Per Lot" />

      {loading ? (
        <View style={styles.loader}><RMLoader /></View>
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
            {cdate ? <Text style={styles.metaDate}>{cdate}</Text> : null}
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
            <CommonTable data={rows} HeaderComponent={HeaderComponent} RowComponent={PPLRow} emptyText="No stocks to show" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(FnoProfitPerLotScreen);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },

  // Loading / Empty
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },

  // Content
  content: { flex: 1 },

  // Metadata Row
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  metaValue: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  metaDate: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#94A3B8' },

  // Summary
  summaryRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 18, fontFamily: 'Inter_700Bold', lineHeight: 24 },
  summaryPct: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', alignSelf: 'stretch', marginVertical: 4 },

  // Table wrapper
  table: { flex: 1, minHeight: 0 },

  // Table cells (used by RowComponent)
  cell: { justifyContent: 'center', paddingRight: 4 },
  cellEnd: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 4 },
  symbolText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  lotText: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 1 },
  cmpPrice: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  cmpChange: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_500Medium', marginTop: 4, textAlign: 'right' },
  pplValue: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },

  // Multi-level header for "Profit Per Lot"
  pplHeaderGroup: { alignItems: 'center' },
  pplGroupLabel: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  pplSubRow: { flexDirection: 'row', width: '100%' },
});
