import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import CallPutStrongWeakFilterButton, { useCallPutStrengthFilter } from '@/components/reports/CallPutStrongWeakFilterButton';
import IndustryDropdown from '@/components/reports/IndustryDropdown';
import {
  CALL_PUT_VALUE_COLUMNS,
  CallPutFilterContext,
  CallPutValueHeader,
  CallPutValueRow,
} from '@/components/reports/callPutValueTable';
import { useCommonData } from '@/context/CommonDataContext';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { MONTHLY_EXPIRY_OPTIONS, industryIdFromParam, paramString, queryKey, resolveChoice, useCanonicalIndustryId, useReportQuery } from '@/utils/reportParams';
import { socketRequest } from '@/utils/socket';

function callPutParams(expiry, industryId) {
  return { expiry_state: expiry, industry_id: industryId == null ? 'all' : String(industryId) };
}

function parseCallPut(raw) {
  const filters = {
    expiry_state: resolveChoice(raw, 'expiry_state', MONTHLY_EXPIRY_OPTIONS, 'near'),
    industry_id: industryIdFromParam(raw.industry_id),
  };
  return { filters, serialized: callPutParams(filters.expiry_state, filters.industry_id) };
}
function CallPutValueReportScreen() {
  const { industries } = useCommonData();
  const routeParams = useLocalSearchParams();
  const rawParams = {
    expiry_state: paramString(routeParams.expiry_state).trim(),
    industry_id: paramString(routeParams.industry_id).trim(),
  };
  const initial = parseCallPut(rawParams).filters;
  const [expiry, setExpiry] = useState(initial.expiry_state);
  const [industryId, setIndustryId] = useState(initial.industry_id);
  const selectionRef = useRef({ expiry, industryId });
  useEffect(() => {
    selectionRef.current = { expiry, industryId };
  }, [expiry, industryId]);
  const stateKey = queryKey(callPutParams(expiry, industryId));
  const pushParams = useReportQuery(rawParams, parseCallPut, stateKey, (filters) => {
    selectionRef.current = { expiry: filters.expiry_state, industryId: filters.industry_id };
    setExpiry(filters.expiry_state);
    setIndustryId(filters.industry_id);
  });
  useCanonicalIndustryId(industryId, setIndustryId, industries);
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
      return socketRequest('GET_CALL_PUT_NEAR', {})
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
          console.log('[Call/Put Value] Socket fetch error:', err?.message);
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
    return () => {
      genRef.current += 1;
    };
  }, [fetchReport]);

  useRegisterRefresh(
    useCallback(() => fetchReport({ silent: true }), [fetchReport])
  );

  const handleExpiry = useCallback((next) => {
    if (next === selectionRef.current.expiry) return;
    const updated = { ...selectionRef.current, expiry: next };
    selectionRef.current = updated;
    setExpiry(next);
    pushParams(callPutParams(updated.expiry, updated.industryId));
  }, [pushParams]);

  const handleIndustry = useCallback((next) => {
    if (next === selectionRef.current.industryId) return;
    const updated = { ...selectionRef.current, industryId: next };
    selectionRef.current = updated;
    setIndustryId(next);
    pushParams(callPutParams(updated.expiry, updated.industryId));
  }, [pushParams]);

  const activeGroup = expiry === 'next' ? result?.next : result?.near;
  const cdate = activeGroup?.cdate ?? '';
  const industrySet = useMemo(() => {
    if (industryId == null || !Array.isArray(industries)) return null;
    const ind = industries.find((i) => i.id === industryId);
    if (!ind || !Array.isArray(ind.symbols)) return null;
    return new Set(ind.symbols.map((s) => String(s).trim().toUpperCase()));
  }, [industryId, industries]);

  const groupRows = activeGroup?.data;
  const baseRows = useMemo(() => {
    const rows = Array.isArray(groupRows) ? groupRows : [];
    if (!industrySet) return rows;
    return rows.filter((item) => industrySet.has(String(item?.symbol ?? '').trim().toUpperCase()));
  }, [groupRows, industrySet]);

  const { value: strengthFilter, onChange: setStrengthFilter, rows: visibleRows } = useCallPutStrengthFilter(baseRows);

  // Keyed by symbol so switching expiry updates the same rows instead of remounting them.
  const rowKeys = useMemo(() => {
    const map = new Map();
    const seen = new Map();
    if (Array.isArray(groupRows)) {
      groupRows.forEach((row) => {
        const symbol = String(row?.symbol ?? 'item');
        const count = seen.get(symbol) ?? 0;
        seen.set(symbol, count + 1);
        map.set(row, count ? `${symbol}#${count}` : symbol);
      });
    }
    return map;
  }, [groupRows]);

  const rowKey = useCallback((item, index) => rowKeys.get(item) ?? `item-${index}`, [rowKeys]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Call / Put Value" timestamp={cdate} />

      <View style={styles.metaRow}>
        <ExpiryDropdownComponent value={expiry} onSelect={handleExpiry} />
        <IndustryDropdown value={industryId} onChange={handleIndustry} style={styles.industry} />
      </View>

      <View style={styles.filterRow}>
        <CallPutStrongWeakFilterButton value={strengthFilter} onChange={setStrengthFilter} />
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText} numberOfLines={1}>OI Value in Lacs</Text>
      </View>

      <View style={styles.table}>
        <CallPutFilterContext.Provider value={strengthFilter}>
          <CommonTable
            data={visibleRows}
            columns={CALL_PUT_VALUE_COLUMNS}
            loading={loading}
            HeaderComponent={CallPutValueHeader}
            RowComponent={CallPutValueRow}
            keyExtractor={rowKey}
            emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'}
          />
        </CallPutFilterContext.Provider>
      </View>
    </SafeAreaView>
  );
}

export default memo(CallPutValueReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  industry: { flex: 1, maxWidth: undefined },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    flexShrink: 1,
  },
  table: { flex: 1, minHeight: 0 },
});
