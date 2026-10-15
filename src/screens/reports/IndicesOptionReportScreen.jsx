import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import CallPutStrongWeakFilterButton, { useCallPutStrengthFilter } from '@/components/reports/CallPutStrongWeakFilterButton';
import IndexDropdown from '@/components/reports/IndexDropdown';
import IndicesOptionTable from '@/components/reports/indicesOptionTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const WEEKLY_STATES = ['weeklyNear', 'weeklyNext', 'weeklyFar'];

function IndicesOptionReportScreen() {
  const insets = useSafeAreaInsets();
  const [symbol, setSymbol] = useState('NIFTY');
  const [expiry, setExpiry] = useState('near');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const currentParamsRef = useRef({ symbol, expiry });
  currentParamsRef.current = { symbol, expiry };

  const handleIndexChange = useCallback((newSymbol) => {
    if (newSymbol === symbol) return;
    setSymbol(newSymbol);
    if (newSymbol !== 'NIFTY' && WEEKLY_STATES.includes(expiry)) setExpiry('near');
  }, [symbol, expiry]);

  const handleExpiryChange = useCallback((newExpiry) => setExpiry(newExpiry), []);

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
        <CallPutStrongWeakFilterButton value={strengthFilter} onChange={setStrengthFilter} withNeutral={false} />
      </View>
      <View style={styles.table}>
        <IndicesOptionTable data={rows} filter={strengthFilter} loading={loading} symbol={symbol} expiry={expiry} onPositioned={handlePositioned} emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'} />
      </View>
    </View>
  );
}

export default memo(IndicesOptionReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12 },
  table: { flex: 1, minHeight: 0 },
});
