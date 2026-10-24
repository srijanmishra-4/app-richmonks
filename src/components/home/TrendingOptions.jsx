import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';

import { socketRequest } from '@/utils/socket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import TrendingTable from '@/components/home/TrendingTable';
import { SymbolLink, SymbolWithLogo, useShowSymbolLogo } from '@/components/SymbolLogo';
import { openOptionProfile } from '@/utils/instrumentProfile';
import { useFluidStyles } from '@/utils/responsive';

// ─── Constants & Configuration ──────────────────────────────────────────────────

const BLUE_ACCENT = '#0071A9';
const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const OPTIONS_REPORTS = [
  { id: 'abv_wap', label: 'Above 10% from WAP' },
  { id: 'crossing_yes_high', label: "Crossing Yesterday's High" },
  { id: 'crossing_yes_low', label: "Crossing 20% From Yesterday's Low" },
  { id: 'breaching_yes_high', label: "Breaching 20% From Yesterday's High" },
  { id: 'abv_high_3_days', label: 'Above 3 Days High' },
];

// abv_wap and blw_wap do not send key/value. Every other report does.
const REPORT_DEFAULT_KEY = {
  abv_wap: 'WAP',
  blw_wap: 'WAP',
  vol_buster: 'Volume Buster',
  crossing_yes_low: "Yesterday's Low",
  breaching_yes_high: "Yesterday's High",
  crossing_yes_high: "Yesterday's High",
  abv_high_3_days: 'High 3day',
};

// ─── Formatters ─────────────────────────────────────────────────────────────────

function formatIndianNumber(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) { sign = '-'; str = str.slice(1).trim(); }
  else if (str.startsWith('+')) { str = str.slice(1).trim(); }
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
  const str = String(val).trim();
  const num = parseFloat(str.replace(/%/g, '').trim());
  if (isNaN(num)) return str;
  const formattedNum = Math.abs(num).toFixed(2);
  if (num > 0) return `+${formattedNum}%`;
  if (num < 0) return `-${formattedNum}%`;
  return '0.00%';
}

// ─── Component ──────────────────────────────────────────────────────────────────

function mapOptionRow(item) {
  const hasValue = item.value != null && item.value !== '';
  return {
    symbol: item.symbol || '—',
    strike_pr: item.strike_pr,
    key: item.key || '',
    value: hasValue ? item.value : item.wap,
    option_price: item.option_price,
    option_price_change: item.option_price_change,
  };
}

import { useBreakpoint } from '@/hooks/useBreakpoint';

function TrendingOptions() {
  const { isDesktop } = useBreakpoint();
  const showLogo = useShowSymbolLogo();
  const styles = useFluidStyles(createStyles);
  const [optionType, setOptionType] = useState('CE');
  const [selectedReport, setSelectedReport] = useState('abv_wap');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const optionRef = useRef(optionType);
  const selectedRef = useRef(selectedReport);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  optionRef.current = optionType;
  selectedRef.current = selectedReport;

  // REC_TRENDING_OPTIONS does not include the report id, and every in-flight
  // listener receives the same event. Keep a single request in flight and apply
  // the payload only when it still belongs to the latest tap.
  const fetchReport = useCallback((reportId) => {
    const option = optionRef.current;
    const gen = ++genRef.current;
    setRows([]);
    setLoading(true);
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_TRENDING_OPTIONS', { report: reportId, option })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const list = Array.isArray(res?.data) ? res.data : [];
          setRows(list.map(mapOptionRow));
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[TrendingOptions] Socket fetch error:', err?.message);
          setRows([]);
          setLoading(false);
          return null;
        });
    });
    queueRef.current = task.then(() => { }, () => { });
    return task;
  }, []);

  // First load. Call/Put and report taps call fetchReport themselves so the
  // skeleton starts in the same press, before the previous payload can land.
  useEffect(() => {
    fetchReport(selectedRef.current);
  }, [fetchReport]);

  const handleSelectReport = useCallback((reportId) => {
    setSelectedReport(reportId);
    fetchReport(reportId);
  }, [fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(selectedRef.current), [fetchReport]));

  // Toggle Call / Put
  const handleToggle = (type) => {
    if (type === optionType) return;
    optionRef.current = type;
    setOptionType(type);
    fetchReport(selectedRef.current);
  };

  const isCallSelected = optionType === 'CE';
  const dynamicKey = rows.find((row) => row?.key)?.key || REPORT_DEFAULT_KEY[selectedReport] || 'WAP';

  const handleViewMore = () => {
    router.push({
      pathname: '/home/trending-options',
      params: {
        report: selectedRef.current,
        option_type: optionRef.current,
      },
    });
  };

  // Columns: Report | Symbol | key (level) | CMP
  const columns = [
    { key: 'report', header: 'Report', flex: 1.3, align: 'left' },
    {
      key: 'symbol', header: 'Symbol', flex: 0.95, align: 'left', render: (row) => {
        if (!row) return null;
        return (
          <SymbolLink label={`Open ${row.symbol} option profile`} onPress={() => openOptionProfile({ symbol: row.symbol, strike: row.strike_pr, optionType })}>
            <SymbolWithLogo symbol={row.symbol} showLogo={showLogo}>
              <Text style={[styles.symbolText, isDesktop && styles.desktopSymbolText]} numberOfLines={1}>{row.symbol}</Text>
              <Text style={[styles.strikeText, isDesktop && styles.desktopStrikeText]} numberOfLines={1}>{`SP : ${Number(row.strike_pr).toLocaleString('en-IN')}`}</Text>
            </SymbolWithLogo>
          </SymbolLink>
        );
      }
    },
    {
      key: 'dynamic', header: dynamicKey, flex: 0.82, align: 'right', render: (row) => {
        if (!row) return null;
        return <Text style={[styles.wapText, isDesktop && styles.desktopWapText]} numberOfLines={1}>{formatIndianNumber(row.value)}</Text>;
      }
    },
    {
      key: 'cmp', header: 'CMP', flex: 0.88, align: 'right', render: (row) => {
        if (!row) return null;
        const pc = formatPriceChange(row.option_price_change);
        const color = pc.startsWith('+') ? GREEN : pc.startsWith('-') ? RED : NEUTRAL;
        return (
          <>
            <Text style={[styles.cmpPriceText, isDesktop && styles.desktopCmpPriceText]} numberOfLines={1}>{formatIndianNumber(row.option_price)}</Text>
            {pc ? <Text style={[styles.cmpChangeText, isDesktop && styles.desktopCmpChangeText, { color }]} numberOfLines={1}>{pc}</Text> : null}
          </>
        );
      }
    },
  ];

  const getRowData = useCallback((reportId) => {
    const idx = OPTIONS_REPORTS.findIndex((r) => r.id === reportId);
    return rows[idx] || null;
  }, [rows]);

  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      {/* ─── Header: Title & Call/Put Toggle ─────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDesktop && styles.desktopTitle]}>Trending Options</Text>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => handleToggle('CE')} style={[styles.pillBtn, isCallSelected ? styles.pillActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: isCallSelected }} accessibilityLabel="Call Options">
            <Text style={[styles.pillText, isDesktop && styles.desktopPillText, isCallSelected ? styles.pillTextActive : styles.pillTextInactive]}>Call</Text>
          </Pressable>
          <Pressable onPress={() => handleToggle('PE')} style={[styles.pillBtn, !isCallSelected ? styles.pillActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: !isCallSelected }} accessibilityLabel="Put Options">
            <Text style={[styles.pillText, isDesktop && styles.desktopPillText, !isCallSelected ? styles.pillTextActive : styles.pillTextInactive]}>Put</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Table ───────────────────────────────────────────────────────────── */}
      <TrendingTable columns={columns} reports={OPTIONS_REPORTS} selectedReport={selectedReport} onSelectReport={handleSelectReport} getRowData={getRowData} loading={loading} isOption showSymbolLogo={showLogo} />

      {/* ─── View More ───────────────────────────────────────────────────────── */}
      <Pressable onPress={handleViewMore} style={[styles.viewMoreBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityLabel="View More Trending Options">
        <Text style={styles.viewMoreBtnText}>View More →</Text>
      </Pressable>
    </View>
  );
}

export default memo(TrendingOptions);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const createStyles = (f) => ({
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  desktopContainer: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: f(18), fontFamily: 'Inter_700Bold', color: '#0F172A' },
  desktopTitle: { fontSize: f(17, 23) },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: BLUE_ACCENT, borderWidth: 1, borderColor: BLUE_ACCENT },
  pillInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  pillText: { fontSize: f(11.5), fontFamily: 'Inter_600SemiBold' },
  desktopPillText: { fontSize: f(11.5, 14) },
  pillTextActive: { color: '#FFFFFF' },
  pillTextInactive: { color: '#64748B', fontFamily: 'Inter_500Medium' },
  symbolText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'left' },
  desktopSymbolText: { fontSize: f(12, 15) },
  strikeText: { alignSelf: 'stretch', fontSize: f(10.5), fontFamily: 'Inter_500Medium', color: '#64748B', marginTop: 1, textAlign: 'left' },
  desktopStrikeText: { fontSize: f(10.5, 13) },
  wapText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  desktopWapText: { fontSize: f(12, 15) },
  cmpPriceText: { alignSelf: 'stretch', fontSize: f(12), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'right' },
  desktopCmpPriceText: { fontSize: f(12, 15) },
  cmpChangeText: { alignSelf: 'stretch', fontSize: f(11), fontFamily: 'Inter_600SemiBold', marginTop: 1, textAlign: 'right' },
  desktopCmpChangeText: { fontSize: f(11, 13) },
  viewMoreBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  viewMoreBtnText: { fontSize: f(14, 16), fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
});
