import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonSummaryCard, usePulse } from '@/components/skeleton/SkeletonBars';
import { STOCK_RANK_COLUMNS, StockRankHeader, StockRankRow } from '@/components/reports/stockRankTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatCurrencySigned(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return '—';
  const formatted = groupDigits(String(Math.abs(Math.round(num))));
  if (num < 0) return `-₹${formatted}`;
  if (num > 0) return `+₹${formatted}`;
  return '₹0';
}

function formatPctSigned(val) {
  if (val == null || val === '') return '';
  const num = parseFloat(String(val));
  if (!Number.isFinite(num)) return '';
  if (num === 0) return '0%';
  if (num > 0) return `+${num}%`;
  return `${num}%`;
}

function valueColor(val) {
  if (val == null || val === '') return NEUTRAL;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,%\s]/g, ''));
  if (!Number.isFinite(num) || num === 0) return NEUTRAL;
  return num > 0 ? GREEN : RED;
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'stock'}-${item?.rank ?? index}`;
}

function RankedStocksReportScreen({ title, event }) {
  const styles = useFluidStyles(createStyles);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);

  const fetchReport = useCallback(({ silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest(event)
        .then((res) => {
          if (gen !== genRef.current) return null;
          setResult(res ?? null);
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log(`[${title}] Socket fetch error:`, err?.message);
          if (!silent) {
            setError(true);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, [event, title]);

  useEffect(() => {
    fetchReport();
    return () => {
      genRef.current += 1;
    };
  }, [fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport({ silent: true }), [fetchReport]));

  const rows = Array.isArray(result?.data) ? result.data : [];
  const cdate = result?.cdate ?? '';
  const oneDayPpl = result?.oneDayPpl ?? null;
  const oneDayPplPercent = result?.oneDayPplPercent ?? '';
  const fiveDayPpl = result?.fiveDayPpl ?? null;
  const fiveDayPplPercent = result?.fiveDayPplPercent ?? '';
  const oneDayColor = valueColor(oneDayPpl);
  const fiveDayColor = valueColor(fiveDayPpl);
  const oneDayPctColor = valueColor(parseFloat(oneDayPplPercent));
  const fiveDayPctColor = valueColor(parseFloat(fiveDayPplPercent));
  const pulse = usePulse(loading && !result);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label={title} timestamp={cdate} />
      {loading && !result ? (
        <SkeletonSummaryCard pulse={pulse} />
      ) : result ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>1 Day</Text>
            <Text style={[styles.summaryValue, { color: oneDayColor }]} numberOfLines={1}>{formatCurrencySigned(oneDayPpl)}</Text>
            <Text style={[styles.summaryPct, { color: oneDayPctColor }]}>{formatPctSigned(oneDayPplPercent)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>5 Days</Text>
            <Text style={[styles.summaryValue, { color: fiveDayColor }]} numberOfLines={1}>{formatCurrencySigned(fiveDayPpl)}</Text>
            <Text style={[styles.summaryPct, { color: fiveDayPctColor }]}>{formatPctSigned(fiveDayPplPercent)}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.table}>
        <CommonTable
          data={rows}
          columns={STOCK_RANK_COLUMNS}
          loading={loading}
          HeaderComponent={StockRankHeader}
          RowComponent={StockRankRow}
          keyExtractor={rowKey}
          emptyText={error ? 'Failed to load report. Please try again.' : 'No stocks to show'}
          rowStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(RankedStocksReportScreen);

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
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
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: f(8, 12) },
});
