import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import StockRankDropdown from '@/components/reports/StockRankDropdown';
import { STOCK_RANK_COLUMNS, StockRankHeader, StockRankRow } from '@/components/reports/stockRankTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const SOCKET_EVENTS = {
  all: 'GET_STOCK_RANKING_ALL',
  top20: 'GET_STOCK_RANKING_TOP_20',
  bottom20: 'GET_STOCK_RANKING_BOTTOM_20',
};

const RANK_FILTERS = [{ value: 'all' }, { value: 'top20' }, { value: 'bottom20' }];

function parseStockRank(raw) {
  const filter = resolveChoice(raw, 'filter', RANK_FILTERS, 'all');
  return { filters: { filter }, serialized: { filter } };
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'stock'}-${item?.rank ?? index}`;
}

function StockRankReportScreen() {
  const styles = useFluidStyles(createStyles);
  const routeParams = useLocalSearchParams();
  const rawParams = { filter: paramString(routeParams.filter).trim() };
  const [filter, setFilter] = useState(() => parseStockRank(rawParams).filters.filter);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  const stateKey = queryKey({ filter });
  const pushParams = useReportQuery(rawParams, parseStockRank, stateKey, (filters) => {
    filterRef.current = filters.filter;
    setFilter(filters.filter);
  });

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
    filterRef.current = next;
    setFilter(next);
    pushParams({ filter: next });
  }, [pushParams]);

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

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: f(16, 28),
    paddingTop: f(2, 6),
    paddingBottom: f(6, 12),
  },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: f(8, 12) },
});
