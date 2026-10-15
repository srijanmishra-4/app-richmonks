import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import CallPutDropdown from '@/components/reports/CallPutDropdown';
import StrongWeakFilter, { useStrongWeakFilter } from '@/components/reports/StrongWeakFilter';
import {
  MOST_ACTIVE_OPTIONS_COLUMNS,
  MostActiveOptionsHeader,
  MostActiveOptionsRow,
} from '@/components/reports/mostActiveOptionsTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { MONTHLY_EXPIRY_OPTIONS, paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { socketRequest } from '@/utils/socket';

const SOCKET_EVENTS = {
  call: 'GET_MOST_ACTIVE_CALL_STOCKS_MONTHLY',
  put: 'GET_MOST_ACTIVE_PUT_STOCKS_MONTHLY',
};

const OPTION_TYPES = [{ value: 'call' }, { value: 'put' }];

function parseMostActive(raw) {
  const filters = {
    option_type: resolveChoice(raw, 'option_type', OPTION_TYPES, 'call'),
    expiry_state: resolveChoice(raw, 'expiry_state', MONTHLY_EXPIRY_OPTIONS, 'near'),
  };
  return { filters, serialized: filters };
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'opt'}-${item?.strike ?? ''}-${item?.category ?? ''}-${index}`;
}

function MostActiveOptionsReportScreen() {
  const routeParams = useLocalSearchParams();
  const rawParams = {
    option_type: paramString(routeParams.option_type).trim(),
    expiry_state: paramString(routeParams.expiry_state).trim(),
  };
  const initial = parseMostActive(rawParams).filters;
  const [optionType, setOptionType] = useState(initial.option_type);
  const [expiry, setExpiry] = useState(initial.expiry_state);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const optionTypeRef = useRef(optionType);
  const expiryRef = useRef(expiry);
  useEffect(() => {
    optionTypeRef.current = optionType;
    expiryRef.current = expiry;
  }, [optionType, expiry]);
  const stateKey = queryKey({ option_type: optionType, expiry_state: expiry });
  const pushParams = useReportQuery(rawParams, parseMostActive, stateKey, (filters) => {
    optionTypeRef.current = filters.option_type;
    expiryRef.current = filters.expiry_state;
    setOptionType(filters.option_type);
    setExpiry(filters.expiry_state);
  });

  const fetchReport = useCallback((type, { silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const event = SOCKET_EVENTS[type] || SOCKET_EVENTS.call;
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
          console.log('[Most Active Options] Socket fetch error:', err?.message);
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
    fetchReport(optionType);
    return () => {
      genRef.current += 1;
    };
  }, [optionType, fetchReport]);

  useRegisterRefresh(
    useCallback(() => fetchReport(optionTypeRef.current, { silent: true }), [fetchReport])
  );

  const handleOptionTypeChange = useCallback((next) => {
    if (next === optionTypeRef.current) return;
    optionTypeRef.current = next;
    setOptionType(next);
    pushParams({ option_type: next, expiry_state: expiryRef.current });
  }, [pushParams]);

  const handleExpiryChange = useCallback((next) => {
    if (next === expiryRef.current) return;
    expiryRef.current = next;
    setExpiry(next);
    pushParams({ option_type: optionTypeRef.current, expiry_state: next });
  }, [pushParams]);

  const activeGroup = expiry === 'next' ? result?.next : result?.near;
  const sourceRows = Array.isArray(activeGroup?.data) ? activeGroup.data : null;
  const cdate = activeGroup?.cdate ?? '';
  const { value: strength, onChange: setStrength, rows: visibleRows } = useStrongWeakFilter(sourceRows);

  const RowComponent = useCallback((props) => (
    <MostActiveOptionsRow {...props} optionType={optionType} />
  ), [optionType]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Most Active Options" timestamp={cdate} />

      <View style={styles.firstRow}>
        <ExpiryDropdownComponent value={expiry} onSelect={handleExpiryChange} />
      </View>

      <View style={styles.secondRow}>
        <CallPutDropdown
          value={optionType}
          onChange={handleOptionTypeChange}
        />
        <StrongWeakFilter value={strength} onChange={setStrength} />
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

export default memo(MostActiveOptionsReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  firstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  table: { flex: 1, minHeight: 0 },
});
