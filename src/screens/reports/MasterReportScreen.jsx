import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { formatExpiryDate } from '@/components/ExpiryDropdownComponent';
import {
  MASTER_REPORT_COLUMNS,
  MasterReportHeader,
  MasterReportRow,
  masterReportRowStyle,
} from '@/components/reports/masterReportTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const EXPIRY_LABEL = {
  near: 'Near',
  next: 'Next',
  far: 'Far',
  weeklyNear: 'Weekly Near',
  weeklyNext: 'Weekly Next',
  weeklyFar: 'Weekly Far',
};

function rowKey(item, index) {
  return `${item?.symbol ?? 'stock'}-${item?.rank ?? index}-${index}`;
}

function textValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function unwrapReport(res) {
  if (Array.isArray(res?.data)) return res;
  if (res?.result) return res.result;
  return res ?? null;
}

function MasterReportScreen() {
  const styles = useFluidStyles(createStyles);
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
      return socketRequest('GET_MASTER_REPORT')
        .then((res) => {
          if (gen !== genRef.current) return null;
          setResult(unwrapReport(res));
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[Master Report] Socket fetch error:', err?.message);
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

  useRegisterRefresh(useCallback(() => fetchReport({ silent: true }), [fetchReport]));

  const rows = Array.isArray(result?.data) ? result.data : [];
  const cdate = result?.cdate ?? '';
  const expiryState = textValue(result?.expiry_state);
  const meta = useMemo(() => {
    const status = textValue(result?.market_status);
    const expiryLabel = EXPIRY_LABEL[expiryState] || expiryState;
    const expiryDate = formatExpiryDate(result?.expiry_date);
    return [status, expiryLabel, expiryDate].filter(Boolean).join('  ·  ');
  }, [result, expiryState]);

  const RowComponent = useCallback((props) => (
    <MasterReportRow {...props} expiry={expiryState || 'near'} />
  ), [expiryState]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Master Report" timestamp={cdate} />
      {meta ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>{meta}</Text>
        </View>
      ) : null}
      <View style={styles.table}>
        <CommonTable
          data={rows}
          columns={MASTER_REPORT_COLUMNS}
          loading={loading}
          HeaderComponent={MasterReportHeader}
          RowComponent={RowComponent}
          keyExtractor={rowKey}
          getRowStyle={masterReportRowStyle}
          emptyText={error ? 'Failed to load report. Please try again.' : 'No stocks to show'}
          rowStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(MasterReportScreen);

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  metaRow: {
    paddingHorizontal: f(16, 28),
    paddingBottom: f(6, 10),
  },
  metaText: {
    fontSize: f(12, 14),
    lineHeight: f(16, 18),
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: f(8, 12) },
});
