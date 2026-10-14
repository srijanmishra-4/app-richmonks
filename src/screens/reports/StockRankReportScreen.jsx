import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import StockRankDropdown from '@/components/reports/StockRankDropdown';
import { STOCK_RANK_COLUMNS, StockRankHeader, StockRankRow } from '@/components/reports/stockRankTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const SOCKET_EVENTS = {
  all: 'GET_STOCK_RANKING_ALL',
  top20: 'GET_STOCK_RANKING_TOP_20',
  bottom20: 'GET_STOCK_RANKING_BOTTOM_20',
};

function rowKey(item, index) {
  return `${item?.symbol ?? 'stock'}-${item?.rank ?? index}`;
}

function StockRankReportScreen() {
  const [filter, setFilter] = useState('all');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchReport = useCallback((type, { silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const event = SOCKET_EVENTS[type] || SOCKET_EVENTS.all;
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
          console.log('[Stock Rank] Socket fetch error:', err?.message);
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
    fetchReport(filter);
    return () => {
      genRef.current += 1;
    };
  }, [filter, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(filterRef.current, { silent: true }), [fetchReport]));

  const handleFilterChange = useCallback((next) => {
    if (next === filterRef.current) return;
    setFilter(next);
  }, []);

  const rows = Array.isArray(result?.data) ? result.data : [];
  const cdate = result?.cdate ?? '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Stock Rank" timestamp={cdate} />
      <View style={styles.metaRow}>
        <StockRankDropdown value={filter} onChange={handleFilterChange} />
      </View>
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

export default memo(StockRankReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
  },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: 8 },
});
