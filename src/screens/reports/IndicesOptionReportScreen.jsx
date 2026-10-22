import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import CallPutStrongWeakFilterButton, { useCallPutStrengthFilter } from '@/components/reports/CallPutStrongWeakFilterButton';
import IndexDropdown, { INDEX_OPTIONS } from '@/components/reports/IndexDropdown';
import IndicesOptionTable from '@/components/reports/indicesOptionTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { MONTHLY_EXPIRY_OPTIONS, WEEKLY_EXPIRY_OPTIONS, paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const WEEKLY_STATES = ['weeklyNear', 'weeklyNext', 'weeklyFar'];
const SYMBOL_OPTIONS = INDEX_OPTIONS.map((value) => ({ value }));
const EXPIRY_OPTIONS = [...MONTHLY_EXPIRY_OPTIONS, ...WEEKLY_EXPIRY_OPTIONS];

function parseIndices(raw) {
  const symbol = resolveChoice(raw, 'symbol', SYMBOL_OPTIONS, 'NIFTY');
  let expiry_state = resolveChoice(raw, 'expiry_state', EXPIRY_OPTIONS, 'near');
  if (symbol !== 'NIFTY' && WEEKLY_STATES.includes(expiry_state)) expiry_state = 'near';
  const filters = { symbol, expiry_state };
  return { filters, serialized: filters };
}

function IndicesOptionReportScreen() {
  const styles = useFluidStyles(createStyles);
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams();
  const rawParams = {
    symbol: paramString(routeParams.symbol).trim(),
    expiry_state: paramString(routeParams.expiry_state).trim(),
  };
  const initial = parseIndices(rawParams).filters;
  const [symbol, setSymbol] = useState(initial.symbol);
  const [expiry, setExpiry] = useState(initial.expiry_state);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const currentParamsRef = useRef({ symbol, expiry });
  useEffect(() => {
    currentParamsRef.current = { symbol, expiry };
  }, [symbol, expiry]);
  const stateKey = queryKey({ symbol, expiry_state: expiry });
  const pushParams = useReportQuery(rawParams, parseIndices, stateKey, (filters) => {
    currentParamsRef.current = { symbol: filters.symbol, expiry: filters.expiry_state };
    setSymbol(filters.symbol);
    setExpiry(filters.expiry_state);
  });

  const handleIndexChange = useCallback((newSymbol) => {
    if (newSymbol === symbol) return;
    const nextExpiry = newSymbol !== 'NIFTY' && WEEKLY_STATES.includes(expiry) ? 'near' : expiry;
    currentParamsRef.current = { symbol: newSymbol, expiry: nextExpiry };
    setSymbol(newSymbol);
    if (nextExpiry !== expiry) setExpiry(nextExpiry);
    pushParams({ symbol: newSymbol, expiry_state: nextExpiry });
  }, [symbol, expiry, pushParams]);

  const handleExpiryChange = useCallback((newExpiry) => {
    if (newExpiry === expiry) return;
    currentParamsRef.current = { symbol, expiry: newExpiry };
    setExpiry(newExpiry);
    pushParams({ symbol, expiry_state: newExpiry });
  }, [symbol, expiry, pushParams]);

  const handlePositioned = useCallback((positionedId) => {
    const { symbol: currentSymbol, expiry: currentExpiry } = currentParamsRef.current;
    if (positionedId !== `${currentSymbol}_${currentExpiry}`) return;
    setLoading(false);
  }, []);

  const fetchReport = useCallback(({ silent = false, reqSymbol = currentParamsRef.current.symbol, reqExpiry = currentParamsRef.current.expiry } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
      setResult(null);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_INDICES_OPTION_DATA_V2', { symbol: reqSymbol, expiryState: reqExpiry })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const data = res?.result ?? res ?? null;
          setResult(data);
          setError(false);
          const payload = data?.data;
          if (!Array.isArray(payload) || payload.length === 0) setLoading(false);
          return data;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[Indices Option] Socket fetch error:', err?.message);
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
    fetchReport({ reqSymbol: symbol, reqExpiry: expiry });
    return () => { genRef.current += 1; };
  }, [symbol, expiry, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport({ silent: true }), [fetchReport]));

  const rawRows = result?.data;
  const rows = useMemo(() => {
    if (!Array.isArray(rawRows)) return [];
    return [...rawRows].sort((a, b) => (Number(a?.strike) || 0) - (Number(b?.strike) || 0));
  }, [rawRows]);

  const { value: strengthFilter, onChange: setStrengthFilter } = useCallPutStrengthFilter(rows);

  const cdate = result?.cdate ?? '';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader label="Indices Option" timestamp={cdate} />
      <View style={styles.controlsRow}>
        <IndexDropdown value={symbol} onChange={handleIndexChange} />
        <ExpiryDropdownComponent value={expiry} onSelect={handleExpiryChange} withWeekly={symbol === 'NIFTY'} />
      </View>
      <View style={styles.filterRow}>
        <CallPutStrongWeakFilterButton value={strengthFilter} onChange={setStrengthFilter} withNeutral={false} style={styles.filterButton} />
      </View>
      <View style={styles.table}>
        <IndicesOptionTable data={rows} filter={strengthFilter} loading={loading} symbol={symbol} expiry={expiry} onPositioned={handlePositioned} emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'} />
      </View>
    </View>
  );
}

export default memo(IndicesOptionReportScreen);

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: f(16, 28), paddingTop: f(8, 14), paddingBottom: f(10, 14) },
  filterRow: { paddingHorizontal: f(16, 28), paddingBottom: f(10, 14) },
  filterButton: { width: '100%', justifyContent: 'space-between' },
  table: { flex: 1, minHeight: 0 },
});
