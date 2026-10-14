import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { CalendarIcon } from '@/components/ReportIconComponent';
import {
  MARKET_INTERNALS_COLUMNS,
  MarketInternalsHeader,
  MarketInternalsRow,
} from '@/components/reports/marketInternalsTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { onSocketEvent, socketRequest } from '@/utils/socket';

function rowKey(item, index) {
  return `${item?.title ?? 'metric'}-${index}`;
}

function MarketInternalsReportScreen() {
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
      return socketRequest('GET_MARKET_INTERNALS', {})
        .then((res) => {
          if (gen !== genRef.current) return null;
          const data = res?.result ?? res ?? null;
          setResult(data);
          setError(false);
          setLoading(false);
          return data;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[Market Internals] Socket fetch error:', err?.message);
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
    fetchReport();
    const unsubscribe = onSocketEvent('REC_MARKET_INTERNALS', (liveResult, liveErr) => {
      if (liveErr || !liveResult) return;
      const data = liveResult?.result ?? liveResult;
      setResult(data);
      setLoading(false);
      setError(false);
    });
    return () => {
      genRef.current += 1;
      unsubscribe();
    };
  }, [fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport({ silent: true }), [fetchReport]));

  const timestamp = result?.timestamp ?? '';
  const rows = Array.isArray(result?.data) ? result.data : [];

  const headerRight = useMemo(() => (
    <View style={styles.headerRight}>
      {timestamp ? <Text style={styles.headerTimestamp} numberOfLines={1}>{timestamp}</Text> : null}
    </View>
  ), [timestamp]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Market Internals" headerDropdown={headerRight} />
      <View style={styles.table}>
        <CommonTable
          data={rows}
          columns={MARKET_INTERNALS_COLUMNS}
          loading={loading}
          HeaderComponent={MarketInternalsHeader}
          RowComponent={MarketInternalsRow}
          keyExtractor={rowKey}
          emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'}
          rowStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(MarketInternalsReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTimestamp: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#64748B' },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: 8 },
});
