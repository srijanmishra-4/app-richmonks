import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';

import { socketRequest } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import TrendingTable from '@/components/home/TrendingTable';
import { SymbolLink, SymbolWithLogo, useShowSymbolLogo } from '@/components/SymbolLogo';
import { openFutureProfile } from '@/utils/instrumentProfile';
import { useFluidStyles } from '@/utils/responsive';

// ─── Constants & Configuration ──────────────────────────────────────────────────

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const POSITIVE_REPORTS = [
  { id: 'cr_2_day_low', label: 'Crossing 2% From Low' },
  { id: 'abv_intraday_high', label: 'Above Intraday High' },
  { id: 'abv_yesterday_high', label: "Above Yesterday's High" },
  { id: 'abv_prev_week_high', label: "Above Previous Week's High" },
  { id: 'abv_prev_month_high', label: "Above Previous Month's High" },
];

const NEGATIVE_REPORTS = [
  { id: 'br_2_day_high', label: 'Breaking 2% From High' },
  { id: 'blw_intraday_low', label: 'Below Intraday Low' },
  { id: 'blw_yesterday_low', label: "Below Yesterday's Low" },
  { id: 'blw_prev_week_low', label: "Below Previous Week's Low" },
  { id: 'blw_prev_month_low', label: "Below Previous Month's Low" },
];

// Fallback headers if server has not responded yet
const REPORT_DEFAULT_KEY = {
  abv_wap: 'Wap',
  blw_wap: 'Wap',
  abv_intraday_high: 'Intraday High',
  blw_intraday_low: 'Intraday Low',
  abv_yesterday_high: 'Yesterday High',
  blw_yesterday_low: "Yesterday's Low",
  abv_prev_week_high: 'Prev Week High',
  blw_prev_week_low: 'Prev Week Low',
  abv_prev_month_high: 'Prev Month High',
  blw_prev_month_low: 'Prev Month Low',
  top_gainers: 'Wap',
  top_losers: 'Wap',
  cr_2_day_low: 'Day Low',
  br_2_day_high: 'Day High',
  algo_positive_trends: 'Future Tp',
  algo_negative_trends: 'Future Tp',
};

// Initial state matching the design reference for immediate pixel-perfect rendering
const INITIAL_DATA_BY_REPORT = {
  cr_2_day_low: {
    key: 'Day Low',
    stocks: [
      { symbol: 'GODFRYPHLP', value: 1932, price: 1985, price_change: '+0.90%' },
      { symbol: 'SBIN', value: 812, price: 820.5, price_change: '+1.05%' },
      { symbol: 'RELIANCE', value: 2412, price: 2438, price_change: '+0.78%' },
      { symbol: 'TCS', value: 3015, price: 3065, price_change: '+1.66%' },
      { symbol: 'INFY', value: 1421, price: 1439, price_change: '+1.27%' },
    ],
  },
};

import { useBreakpoint } from '@/hooks/useBreakpoint';

// ─── Formatters ─────────────────────────────────────────────────────────────────

function formatIndianNumber(val) {
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

  const num = parseFloat(str);
  if (isNaN(num)) return String(val);

  const parts = str.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : null;

  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = `${grouped},${lastThree}`;
  }

  const formatted = decPart !== null ? `${intPart}.${decPart}` : intPart;
  return `${sign}₹${formatted}`;
}

function formatPriceChange(val) {
  if (val == null || val === '') return '';
  let str = String(val).trim();
  let clean = str.replace(/[%]/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return str;

  const formattedNum = Math.abs(num).toFixed(2);
  if (num > 0) {
    return `+${formattedNum}%`;
  } else if (num < 0) {
    return `-${formattedNum}%`;
  }
  return '0.00%';
}

function normalizeResponse(payload) {
  if (!payload) return null;
  let key = payload.key || payload.header || '';
  let list = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else if (Array.isArray(payload.data)) {
    list = payload.data;
  } else if (Array.isArray(payload.result)) {
    list = payload.result;
  } else if (Array.isArray(payload.stocks)) {
    list = payload.stocks;
  } else if (Array.isArray(payload.list)) {
    list = payload.list;
  }

  if (!key && list.length > 0 && list[0]?.key) {
    key = list[0].key;
  }

  const stocks = list.map((item) => ({
    symbol: item.symbol || item.name || item.stock_name || '—',
    price: item.price ?? item.cmp ?? item.close ?? '—',
    price_change: item.price_change ?? item.change_percent ?? item.percent_change ?? item.pChange ?? item.change ?? '',
    key: item.key || key || '',
    value: item.value ?? item.level ?? item.val ?? '—',
  }));

  return {
    key,
    stocks,
    report: payload.report,
    cdate: payload.cdate ?? '',
    expiryState: payload.expiryState ?? '',
    expiryDate: payload.expiryDate ?? '',
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────

function TrendingStocks() {
  const { isDesktop } = useBreakpoint();
  const showLogo = useShowSymbolLogo();
  const styles = useFluidStyles(createStyles);
  const [filter, setFilter] = useState('positive'); // 'positive' | 'negative'
  const [selectedReport, setSelectedReport] = useState('cr_2_day_low');
  const [reportCache, setReportCache] = useState(INITIAL_DATA_BY_REPORT);
  const [loading, setLoading] = useState(true);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const loadingRef = useRef(true);

  const isPositiveSelected = filter === 'positive';
  const reportsList = isPositiveSelected ? POSITIVE_REPORTS : NEGATIVE_REPORTS;

  // Ignore broadcasts while a report request is in flight, so a faster previous
  // response cannot paint over the report the user just tapped.
  useSocketEvent('REC_MARKET_INSIGHTS', (result, error, raw) => {
    if (loadingRef.current) return;
    const data = result ?? raw;
    if (data) {
      const normalized = normalizeResponse(data);
      if (normalized) {
        const rep = normalized.report || selectedReport;
        setReportCache((prev) => ({ ...prev, [rep]: normalized }));
      }
    }
  });

  // One request at a time. REC_MARKET_INSIGHTS does not echo the report id, so
  // overlapping listeners would resolve with whichever response arrived first.
  const fetchReport = useCallback((reportId) => {
    const rep = reportId || 'cr_2_day_low';
    const gen = ++genRef.current;
    loadingRef.current = true;
    setLoading(true);
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_MARKET_INSIGHTS', { report: rep })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const normalized = res ? normalizeResponse(res) : null;
          if (normalized) {
            setReportCache((prev) => ({ ...prev, [rep]: normalized }));
          }
          loadingRef.current = false;
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[TrendingStocks] Socket fetch error:', err?.message);
          loadingRef.current = false;
          setLoading(false);
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, []);

  // First load only. Report taps start the request immediately.
  useEffect(() => {
    fetchReport(selectedReport);
    // selectedReport is read once on mount; later taps call fetchReport directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchReport]);

  const handleSelectReport = useCallback((reportId) => {
    setSelectedReport(reportId);
    fetchReport(reportId);
  }, [fetchReport]);

  // Register screen pull-to-refresh
  useRegisterRefresh(useCallback(() => fetchReport(selectedReport), [fetchReport, selectedReport]));

  // Toggle Positive / Negative
  const handleToggle = (nextFilter) => {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
    const targetReports = nextFilter === 'positive' ? POSITIVE_REPORTS : NEGATIVE_REPORTS;
    const currentReports = filter === 'positive' ? POSITIVE_REPORTS : NEGATIVE_REPORTS;
    const currentIndex = currentReports.findIndex((r) => r.id === selectedReport);
    const nextReportId = targetReports[currentIndex >= 0 ? currentIndex : 0].id;
    setSelectedReport(nextReportId);
    fetchReport(nextReportId);
  };

  // Current report's data
  const currentData = reportCache[selectedReport];
  const dynamicKey = currentData?.key || REPORT_DEFAULT_KEY[selectedReport] || 'Level';
  const currentStocks = currentData?.stocks || [];

  // Build columns config for the shared table
  const columns = [
    { key: 'report', header: 'Report', flex: 1.2, align: 'left' },
    { key: 'symbol', header: 'Symbol', flex: 0.95, align: 'left', render: (row) => row ? (
      <SymbolLink label={`Open ${row.symbol} profile`} onPress={() => openFutureProfile({ symbol: row.symbol, expiry: currentData?.expiryState })}>
        <SymbolWithLogo symbol={row.symbol} showLogo={showLogo}>
          <Text style={[styles.symbolText, isDesktop && styles.symbolTextDesktop]} numberOfLines={1}>{row.symbol}</Text>
        </SymbolWithLogo>
      </SymbolLink>
    ) : null },
    { key: 'dynamic', header: dynamicKey, flex: 0.82, align: 'right', render: (row) => row ? <Text style={[styles.levelText, isDesktop && styles.levelTextDesktop]} numberOfLines={1}>{formatIndianNumber(row.value)}</Text> : null },
    { key: 'cmp', header: 'CMP', flex: 0.88, align: 'right', render: (row) => {
      if (!row) return null;
      const pc = formatPriceChange(row.price_change);
      const isPos = pc.startsWith('+');
      const isNeg = pc.startsWith('-');
      const color = isPos ? GREEN : isNeg ? RED : NEUTRAL;
      return (
        <>
          <Text style={[styles.cmpPriceText, isDesktop && styles.cmpPriceTextDesktop]} numberOfLines={1}>{formatIndianNumber(row.price)}</Text>
          {pc ? <Text style={[styles.cmpChangeText, isDesktop && styles.cmpChangeTextDesktop, { color }]} numberOfLines={1}>{pc}</Text> : null}
        </>
      );
    }},
  ];

  const getRowData = useCallback((reportId) => {
    const idx = reportsList.findIndex((r) => r.id === reportId);
    return currentStocks[idx] || null;
  }, [reportsList, currentStocks]);

  const handleViewMore = () => {
    router.push({
      pathname: '/home/trending-stocks',
      params: { report: selectedReport },
    });
  };

  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      {/* ─── Header: Title & Toggle Buttons ─────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Trending Stocks</Text>

        <View style={styles.toggleRow}>
          {/* Positive Button */}
          <Pressable onPress={() => handleToggle('positive')} style={[styles.pillBtn, isPositiveSelected ? styles.pillPositiveActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: isPositiveSelected }} accessibilityLabel="Positive Trending Stocks">
            <Text style={[styles.pillText, isDesktop && styles.pillTextDesktop, isPositiveSelected ? styles.pillTextActive : styles.pillTextInactive]}>Positive</Text>
          </Pressable>

          {/* Negative Button */}
          <Pressable onPress={() => handleToggle('negative')} style={[styles.pillBtn, !isPositiveSelected ? styles.pillNegativeActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: !isPositiveSelected }} accessibilityLabel="Negative Trending Stocks">
            <Text style={[styles.pillText, isDesktop && styles.pillTextDesktop, !isPositiveSelected ? styles.pillTextActive : styles.pillTextInactive]}>Negative</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Table Structure ─────────────────────────────────────────────────── */}
      <TrendingTable columns={columns} reports={reportsList} selectedReport={selectedReport} onSelectReport={handleSelectReport} getRowData={getRowData} loading={loading} isOption={false} showSymbolLogo={showLogo} />

      {/* ─── View More Action (Matches FnoProfitMeter View Report) ──────────── */}
      <Pressable onPress={handleViewMore} style={[styles.viewMoreBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityLabel="View More Trending Stocks">
        <Text style={styles.viewMoreBtnText}>View More →</Text>
      </Pressable>
    </View>
  );
}

export default memo(TrendingStocks);

// ─── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (f) => ({
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  desktopContainer: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: f(18), fontFamily: 'Inter_700Bold', color: '#0F172A' },
  titleDesktop: { fontSize: f(17, 23) },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillPositiveActive: { backgroundColor: '#16A34A', borderWidth: 1, borderColor: '#16A34A' },
  pillNegativeActive: { backgroundColor: '#DC2626', borderWidth: 1, borderColor: '#DC2626' },
  pillInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  pillText: { fontSize: f(11.5), fontFamily: 'Inter_600SemiBold' },
  pillTextDesktop: { fontSize: f(11.5, 14) },
  pillTextActive: { color: '#FFFFFF' },
  pillTextInactive: { color: '#64748B', fontFamily: 'Inter_500Medium' },
  symbolText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'left' },
  symbolTextDesktop: { fontSize: f(12, 15) },
  levelText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  levelTextDesktop: { fontSize: f(12, 15) },
  cmpPriceText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'right' },
  cmpPriceTextDesktop: { fontSize: f(12, 15) },
  cmpChangeText: { alignSelf: 'stretch', fontSize: f(11), fontFamily: 'Inter_600SemiBold', marginTop: 1, textAlign: 'right' },
  cmpChangeTextDesktop: { fontSize: f(11, 13) },
  viewMoreBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  viewMoreBtnText: { fontSize: f(14, 16), fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
});
