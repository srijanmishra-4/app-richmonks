import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonMetaRow, usePulse } from '@/components/skeleton/SkeletonBars';
import { FUTURE_TABLE_COLUMNS, FutureHeader, FutureRow } from '@/components/reports/futureTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { useFluidStyles, useWideStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const TABS = [
  { id: 'bullish', label: 'Feeling Bullish' },
  { id: 'bearish', label: 'Feeling Bearish' },
];

const REPORT_TYPES = [{ value: 'bullish' }, { value: 'bearish' }];

function parseFuture(raw) {
  const report_type = resolveChoice(raw, 'report_type', REPORT_TYPES, 'bullish');
  return { filters: { report_type }, serialized: { report_type } };
}

const TAB_TONE = {
  bullish: {
    wrap: { backgroundColor: '#F3FAF5' },
    active: { backgroundColor: '#E5F6EA' },
    label: { color: '#15803D' },
    line: { backgroundColor: '#16A34A' },
  },
  bearish: {
    wrap: { backgroundColor: '#FDF6F6' },
    active: { backgroundColor: '#FCE8EC' },
    label: { color: '#BE123C' },
    line: { backgroundColor: '#E11D48' },
  },
};

function ReportTabs({ active, onChange }) {
  const styles = useWideStyles(createTabStyles);
  const wrapTone = TAB_TONE[active];
  return (
    <View style={styles.tabsWrap}>
      <View style={[styles.tabs, wrapTone?.wrap]}>
        {TABS.map((item) => {
          const selected = item.id === active;
          const tone = TAB_TONE[item.id];
          return (
            <Pressable key={item.id} onPress={() => onChange(item.id)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.tab, selected ? tone?.active : null, Platform.OS === 'web' ? styles.pointer : null]}>
              <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : styles.tabLabelIdle, selected ? tone?.label : null]}>{item.label}</Text>
              <View style={[styles.tabLine, selected ? tone?.line : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FutureReportScreen() {
  const styles = useFluidStyles(createStyles);
  const routeParams = useLocalSearchParams();
  const rawParams = { report_type: paramString(routeParams.report_type).trim() };
  const [tab, setTab] = useState(() => parseFuture(rawParams).filters.report_type);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  const stateKey = queryKey({ report_type: tab });
  const pushParams = useReportQuery(rawParams, parseFuture, stateKey, (filters) => {
    tabRef.current = filters.report_type;
    setTab(filters.report_type);
  });

  const fetchReport = useCallback((reportType, { silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_MARKET_DASHBOARD', { reportType: reportType === 'bearish' ? 'bearish' : 'bullish' })
        .then((res) => {
          if (gen !== genRef.current) return null;
          setResult(res ?? null);
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[Future] Socket fetch error:', err?.message);
          if (!silent) {
            setError(true);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, []);

  useEffect(() => {
    fetchReport(tab);
    return () => { genRef.current += 1; };
  }, [tab, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(tabRef.current, { silent: true }), [fetchReport]));

  const handleTab = useCallback((next) => {
    if (next === tabRef.current) return;
    tabRef.current = next;
    setTab(next);
    pushParams({ report_type: next });
  }, [pushParams]);

  const rows = Array.isArray(result?.data) ? result.data : [];
  const expiryDate = result?.expiry_date ?? '';
  const cdate = result?.cdate ?? '';
  const pulse = usePulse(loading);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Future" timestamp={cdate} />
      <ReportTabs active={tab} onChange={handleTab} />
      {loading ? (
        <View style={styles.content}>
          <SkeletonMetaRow pulse={pulse} showRight={false} style={styles.metaRow} />
          <View style={styles.table}>
            <CommonTable data={[]} loading columns={FUTURE_TABLE_COLUMNS} HeaderComponent={FutureHeader} rowStyle={styles.row} />
          </View>
        </View>
      ) : error || !result ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error ? 'Failed to load report. Please try again.' : 'No data available.'}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaLabel}>Expiry Date</Text>
              <Text style={styles.metaValue}>{expiryDate || '—'}</Text>
            </View>
          </View>
          <View style={styles.table}>
            <CommonTable data={rows} columns={FUTURE_TABLE_COLUMNS} HeaderComponent={FutureHeader} RowComponent={FutureRow} emptyText="No futures to show" rowStyle={styles.row} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(FutureReportScreen);

const createTabStyles = (f, s, wide) => ({
  pointer: { cursor: 'pointer' },
  tabsWrap: { ...(wide ? { alignItems: 'center' } : null), paddingHorizontal: f(16, 28), paddingTop: f(4, 10), paddingBottom: f(10, 16) },
  tabs: { flexDirection: 'row', borderRadius: f(10, 12), overflow: 'hidden', backgroundColor: '#EEF2F6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', ...(wide ? { alignSelf: 'center', width: '80%' } : null) },
  tab: wide ? { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: f(8, 12), paddingBottom: 0, paddingHorizontal: f(12, 18) } : { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8 },
  tabLabel: { fontSize: f(12.5, 14.5), lineHeight: f(17, 20), fontFamily: 'Inter_500Medium' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold' },
  tabLabelIdle: { color: '#94A3B8' },
  tabLine: { marginTop: f(7, 10), height: f(2, 3), alignSelf: 'stretch', backgroundColor: 'transparent' },
});

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  pointer: { cursor: 'pointer' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: f(24, 32) },
  emptyText: { fontSize: f(13, 15), fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  content: { flex: 1, minHeight: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: f(16, 28), paddingTop: f(2, 6), paddingBottom: f(10, 16) },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: f(16, 24) },
  metaLabel: { fontSize: f(11, 13), lineHeight: f(15, 17), fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  metaValue: { fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  table: { flex: 1, minHeight: 0 },
  row: { minHeight: f(50, 64), paddingVertical: f(8, 12) },
});
