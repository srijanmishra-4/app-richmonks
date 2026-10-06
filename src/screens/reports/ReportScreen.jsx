import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonMetaRow, usePulse } from '@/components/skeleton/SkeletonBars';
import { FUTURE_TABLE_COLUMNS, FutureHeader, FutureRow } from '@/components/reports/futureTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

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

// Add a report here to reuse this screen at /home/reports/<slug>.
export const REPORTS = {
  future: {
    title: 'Future',
    event: 'GET_MARKET_DASHBOARD',
    tabs: [
      { id: 'bullish', label: 'Feeling Bullish' },
      { id: 'bearish', label: 'Feeling Bearish' },
    ],
    defaultTab: 'bullish',
    payload: (tab) => ({ reportType: tab === 'bearish' ? 'bearish' : 'bullish' }),
    HeaderComponent: FutureHeader,
    RowComponent: FutureRow,
    columns: FUTURE_TABLE_COLUMNS,
    rowStyle: { paddingVertical: 8 },
    emptyText: 'No futures to show',
  },
};

function ReportTabs({ tabs, active, onChange }) {
  if (!tabs?.length) return null;
  const wrapTone = TAB_TONE[active];
  return (
    <View style={styles.tabsWrap}>
      <View style={[styles.tabs, wrapTone?.wrap]}>
        {tabs.map((item) => {
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

function ReportScreen({ slug }) {
  const config = REPORTS[slug];
  const [tab, setTab] = useState(config?.defaultTab ?? null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(!!config);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const fetchReport = useCallback((reportType, { silent = false } = {}) => {
    if (!config?.event) return Promise.resolve();
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest(config.event, config.payload(reportType))
        .then((res) => {
          if (gen !== genRef.current) return null;
          setResult(res ?? null);
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log(`[${config.title || 'Report'}] Socket fetch error:`, err?.message);
          if (!silent) {
            setError(true);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, [config]);

  useEffect(() => {
    if (!config || !tab) {
      setLoading(false);
      return undefined;
    }
    fetchReport(tab);
    return () => { genRef.current += 1; };
  }, [config, tab, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(tabRef.current, { silent: true }), [fetchReport]));

  const handleTab = useCallback((next) => {
    if (next === tabRef.current) return;
    setTab(next);
  }, []);

  const rows = Array.isArray(result?.data) ? result.data : [];
  const expiryDate = result?.expiry_date ?? '';
  const cdate = result?.cdate ?? '';
  const title = config?.title || 'Report';
  const pulse = usePulse(loading && !!config);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label={title} />

      <ReportTabs tabs={config?.tabs} active={tab} onChange={handleTab} />

      {!config ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>This report is not available yet.</Text>
        </View>
      ) : loading ? (
        <View style={styles.content}>
          <SkeletonMetaRow pulse={pulse} />
          <View style={styles.table}>
            <CommonTable data={[]} loading columns={config.columns} HeaderComponent={config.HeaderComponent} rowStyle={config.rowStyle} />
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
            {cdate ? <Text style={styles.metaDate}>{cdate}</Text> : null}
          </View>
          <View style={styles.table}>
            <CommonTable data={rows} columns={config.columns} HeaderComponent={config.HeaderComponent} RowComponent={config.RowComponent} emptyText={config.emptyText || 'No data to show'} rowStyle={config.rowStyle} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(ReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  pointer: { cursor: 'pointer' },
  tabsWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  tabs: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', backgroundColor: '#EEF2F6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8 },
  tabLabel: { fontSize: 12.5, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold' },
  tabLabelIdle: { color: '#94A3B8' },
  tabLine: { marginTop: 7, height: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  content: { flex: 1, minHeight: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  metaLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  metaValue: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  metaDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  table: { flex: 1, minHeight: 0 },
});
