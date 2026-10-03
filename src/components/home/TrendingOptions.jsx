import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { socketRequest } from '@/utils/socket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import TrendingTable from '@/components/home/TrendingTable';

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
  return {
    symbol: item.symbol || '—',
    strike_pr: item.strike_pr,
    wap: item.wap,
    option_price: item.option_price,
    option_price_change: item.option_price_change,
  };
}

function TrendingOptions() {
  const [optionType, setOptionType] = useState('CE');
  const [selectedReport, setSelectedReport] = useState('abv_wap');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const optionRef = useRef(optionType);
  const selectedRef = useRef(selectedReport);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const payloadRef = useRef(null);
  optionRef.current = optionType;
  selectedRef.current = selectedReport;

  // REC_TRENDING_OPTIONS does not include the report id, and every in-flight
  // listener receives the same event. Keep a single request in flight and apply
  // the payload only when it still belongs to the latest tap.
  const fetchReport = useCallback((reportId) => {
    const option = optionRef.current;
    const gen = ++genRef.current;
    payloadRef.current = null;
    setRows([]);
    setLoading(true);
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_TRENDING_OPTIONS', { report: reportId, option })
        .then((res) => {
          if (gen !== genRef.current) return null;
          payloadRef.current = res && typeof res === 'object' ? res : null;
          const list = Array.isArray(res?.data) ? res.data : [];
          setRows(list.map(mapOptionRow));
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[TrendingOptions] Socket fetch error:', err?.message);
          payloadRef.current = null;
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

  const handleViewMore = () => {
    const res = payloadRef.current;
    router.push({
      pathname: '/trending-options',
      params: {
        report: selectedRef.current,
        option: optionRef.current,
        result: JSON.stringify({
          cdate: res?.cdate ?? '',
          expiryState: res?.expiryState ?? '',
          expiryDate: res?.expiryDate ?? '',
          data: Array.isArray(res?.data) ? res.data : [],
        }),
      },
    });
  };

  // Columns: Report | Symbol | WAP | CMP
  const columns = [
    { key: 'report', header: 'Report', flex: 1.3, align: 'left' },
    {
      key: 'symbol', header: 'Symbol', flex: 0.95, align: 'left', render: (row) => {
        if (!row) return null;
        return (
          <>
            <Text style={styles.symbolText} numberOfLines={1}>{row.symbol}</Text>
            <Text style={styles.strikeText} numberOfLines={1}>{`SP : ${Number(row.strike_pr).toLocaleString('en-IN')}`}</Text>
          </>
        );
      }
    },
    {
      key: 'dynamic', header: 'WAP', flex: 0.82, align: 'right', render: (row) => {
        if (!row) return null;
        return <Text style={styles.wapText} numberOfLines={1}>{formatIndianNumber(row.wap)}</Text>;
      }
    },
    {
      key: 'cmp', header: 'CMP', flex: 0.88, align: 'right', render: (row) => {
        if (!row) return null;
        const pc = formatPriceChange(row.option_price_change);
        const color = pc.startsWith('+') ? GREEN : pc.startsWith('-') ? RED : NEUTRAL;
        return (
          <>
            <Text style={styles.cmpPriceText} numberOfLines={1}>{formatIndianNumber(row.option_price)}</Text>
            {pc ? <Text style={[styles.cmpChangeText, { color }]} numberOfLines={1}>{pc}</Text> : null}
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
    <View style={styles.container}>
      {/* ─── Header: Title & Call/Put Toggle ─────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Trending Options</Text>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => handleToggle('CE')} style={[styles.pillBtn, isCallSelected ? styles.pillActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: isCallSelected }} accessibilityLabel="Call Options">
            <Text style={[styles.pillText, isCallSelected ? styles.pillTextActive : styles.pillTextInactive]}>Call</Text>
          </Pressable>
          <Pressable onPress={() => handleToggle('PE')} style={[styles.pillBtn, !isCallSelected ? styles.pillActive : styles.pillInactive, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityState={{ selected: !isCallSelected }} accessibilityLabel="Put Options">
            <Text style={[styles.pillText, !isCallSelected ? styles.pillTextActive : styles.pillTextInactive]}>Put</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Table ───────────────────────────────────────────────────────────── */}
      <TrendingTable columns={columns} reports={OPTIONS_REPORTS} selectedReport={selectedReport} onSelectReport={handleSelectReport} getRowData={getRowData} loading={loading} isOption />

      {/* ─── View More ───────────────────────────────────────────────────────── */}
      <Pressable onPress={handleViewMore} style={[styles.viewMoreBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityLabel="View More Trending Options">
        <Text style={styles.viewMoreBtnText}>View More →</Text>
      </Pressable>
    </View>
  );
}

export default memo(TrendingOptions);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: BLUE_ACCENT, borderWidth: 1, borderColor: BLUE_ACCENT },
  pillInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  pillText: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },
  pillTextActive: { color: '#FFFFFF' },
  pillTextInactive: { color: '#64748B', fontFamily: 'Inter_500Medium' },
  symbolText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  strikeText: { fontSize: 10.5, fontFamily: 'Inter_500Medium', color: '#64748B', marginTop: 1 },
  wapText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  cmpPriceText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  cmpChangeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  viewMoreBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  viewMoreBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
});
