import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import CallPutDropdown from '@/components/reports/CallPutDropdown';
import {
  MOST_ACTIVE_OPTIONS_COLUMNS,
  MostActiveOptionsHeader,
  MostActiveOptionsRow,
} from '@/components/reports/mostActiveOptionsTable';
import { ClockIcon } from '@/components/ReportIconComponent';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const SOCKET_EVENTS = {
  call: 'GET_MOST_ACTIVE_CALL_STOCKS_MONTHLY',
  put: 'GET_MOST_ACTIVE_PUT_STOCKS_MONTHLY',
};

function rowKey(item, index) {
  return `${item?.symbol ?? 'opt'}-${item?.strike ?? ''}-${item?.category ?? ''}-${index}`;
}

function MostActiveOptionsReportScreen() {
  const [optionType, setOptionType] = useState('call');
  const [expiry, setExpiry] = useState('near');
  const [strength, setStrength] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const optionTypeRef = useRef(optionType);
  optionTypeRef.current = optionType;

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
    setOptionType(next);
  }, []);

  const handleExpiryChange = useCallback((next) => {
    setExpiry(next);
  }, []);

  const handleStrengthChange = useCallback((next) => {
    setStrength((prev) => (prev === next ? null : next));
  }, []);

  const activeGroup = expiry === 'next' ? result?.next : result?.near;
  const sourceRows = Array.isArray(activeGroup?.data) ? activeGroup.data : [];
  const cdate = activeGroup?.cdate ?? '';

  const visibleRows = useMemo(() => {
    if (!strength) return sourceRows;
    const targetRemark = strength === 'Strong' ? 'S' : 'W';
    return sourceRows.filter((item) => item?.remark === targetRemark);
  }, [sourceRows, strength]);

  const RowComponent = useCallback((props) => (
    <MostActiveOptionsRow {...props} optionType={optionType} />
  ), [optionType]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Most Active Options" />

      <View style={styles.firstRow}>
        <ExpiryDropdownComponent value={expiry} onSelect={handleExpiryChange} />
        {cdate ? (
          <View style={styles.timeWrap}>
            <ClockIcon size={12} color="#64748B" />
            <Text style={styles.timestamp} numberOfLines={1}>{cdate}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.secondRow}>
        <CallPutDropdown
          value={optionType}
          onChange={handleOptionTypeChange}
        />
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => handleStrengthChange('Strong')}
            accessibilityRole="tab"
            accessibilityState={{ selected: strength === 'Strong' }}
            accessibilityLabel="Strong"
            style={[
              styles.toggleBtn,
              strength === 'Strong' ? styles.toggleBtnActive : null,
              Platform.OS === 'web' ? styles.pointer : null,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                strength === 'Strong' ? styles.toggleTextActive : null,
              ]}
            >
              Strong
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleStrengthChange('Weak')}
            accessibilityRole="tab"
            accessibilityState={{ selected: strength === 'Weak' }}
            accessibilityLabel="Weak"
            style={[
              styles.toggleBtn,
              strength === 'Weak' ? styles.toggleBtnActive : null,
              Platform.OS === 'web' ? styles.pointer : null,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                strength === 'Weak' ? styles.toggleTextActive : null,
              ]}
            >
              Weak
            </Text>
          </Pressable>
        </View>
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
  pointer: { cursor: 'pointer' },
  firstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EEF2F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  toggleBtnActive: {
    backgroundColor: '#0071A9',
    borderColor: '#0071A9',
  },
  toggleText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  toggleTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    flexShrink: 1,
  },
  table: { flex: 1, minHeight: 0 },
});
