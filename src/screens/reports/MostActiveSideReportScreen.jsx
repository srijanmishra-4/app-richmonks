import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import StrongWeakFilter, { useStrongWeakFilter } from '@/components/reports/StrongWeakFilter';
import {
  MOST_ACTIVE_OPTIONS_COLUMNS,
  MostActiveOptionsHeader,
  MostActiveOptionsRow,
} from '@/components/reports/mostActiveOptionsTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { MONTHLY_EXPIRY_OPTIONS, paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const SOCKET_EVENTS = {
  call: 'GET_MOST_ACTIVE_CALL_STOCKS_MONTHLY',
  put: 'GET_MOST_ACTIVE_PUT_STOCKS_MONTHLY',
};

function parseExpiry(raw) {
  const filters = {
    expiry_state: resolveChoice(raw, 'expiry_state', MONTHLY_EXPIRY_OPTIONS, 'near'),
  };
  return { filters, serialized: filters };
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'opt'}-${item?.strike ?? ''}-${item?.category ?? ''}-${index}`;
}

function MostActiveSideReportScreen({ title, optionType }) {
  const styles = useFluidStyles(createStyles);
  const routeParams = useLocalSearchParams();
  const rawParams = {
    expiry_state: paramString(routeParams.expiry_state).trim(),
  };
  const initial = parseExpiry(rawParams).filters;
  const [expiry, setExpiry] = useState(initial.expiry_state);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const expiryRef = useRef(expiry);
  useEffect(() => {
    expiryRef.current = expiry;
  }, [expiry]);
  const stateKey = queryKey({ expiry_state: expiry });
  const pushParams = useReportQuery(rawParams, parseExpiry, stateKey, (filters) => {
    expiryRef.current = filters.expiry_state;
    setExpiry(filters.expiry_state);
  });

  const fetchReport = useCallback(({ silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const event = SOCKET_EVENTS[optionType] || SOCKET_EVENTS.call;
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest(event, {})
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
          console.log(`[${title}] Socket fetch error:`, err?.message);
          if (!silent) {
            setError(true);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, [optionType, title]);

  useEffect(() => {
    fetchReport();
    return () => {
      genRef.current += 1;
    };
  }, [fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport({ silent: true }), [fetchReport]));

  const handleExpiryChange = useCallback((next) => {
    if (next === expiryRef.current) return;
    expiryRef.current = next;
    setExpiry(next);
    pushParams({ expiry_state: next });
  }, [pushParams]);

  const activeGroup = expiry === 'next' ? result?.next : result?.near;
  const sourceRows = Array.isArray(activeGroup?.data) ? activeGroup.data : null;
  const cdate = activeGroup?.cdate ?? '';
  const { value: strength, onChange: setStrength, rows: visibleRows } = useStrongWeakFilter(sourceRows);

  const RowComponent = useCallback((props) => (
    <MostActiveOptionsRow {...props} optionType={optionType} expiry={expiry} />
  ), [optionType, expiry]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label={title} timestamp={cdate} />

      <View style={styles.controlsRow}>
        <ExpiryDropdownComponent value={expiry} onSelect={handleExpiryChange} />
        <StrongWeakFilter value={strength} onChange={setStrength} style={styles.strengthFilter} />
      </View>

      <View style={styles.table}>
        <CommonTable
          data={visibleRows}
          columns={MOST_ACTIVE_OPTIONS_COLUMNS}
          loading={loading}
          HeaderComponent={MostActiveOptionsHeader}
          RowComponent={RowComponent}
          keyExtractor={rowKey}
          emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(MostActiveSideReportScreen);

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: f(16, 28),
    paddingTop: f(4, 10),
    paddingBottom: f(10, 16),
    gap: f(8, 14),
  },
  strengthFilter: { marginLeft: 'auto' },
  table: { flex: 1, minHeight: 0 },
});
