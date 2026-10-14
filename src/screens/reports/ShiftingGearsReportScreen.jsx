import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import { SHIFTING_GEARS_COLUMNS, ShiftingGearsHeader, ShiftingGearsRow } from '@/components/reports/shiftingGearsTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const PRIMARY = '#0071A9';
const MUTED = '#64748B';

const REPORT_TYPES = [
  { value: 'above', label: 'Above High' },
  { value: 'below', label: 'Below Low' },
];

const DURATIONS = [
  { value: 5, label: '5 Days' },
  { value: 20, label: '20 Days' },
  { value: 100, label: '100 Days' },
  { value: 200, label: '200 Days' },
];

function levelField(reportType, option) {
  const prefix = reportType === 'above' ? 'High' : 'Low';
  return `${prefix}${option}Days`;
}

function levelLabel(reportType, option) {
  const prefix = reportType === 'above' ? 'HIGH' : 'LOW';
  return `${prefix}\n${option} DAYS`;
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'row'}-${item?.rank ?? index}`;
}

function ShiftingGearsReportScreen() {
  const [expiry_state, setExpiryState] = useState('near');
  const [reportType, setReportType] = useState('above');
  const [option, setOption] = useState(5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const stateRef = useRef({ expiry_state, reportType, option });
  stateRef.current = { expiry_state, reportType, option };

  const fetchReport = useCallback((params, { silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_KEY_REVERSALS', { expiry_state: params.expiry_state, reportType: params.reportType, report: 'high_low', option: params.option })
        .then((res) => {
          if (gen !== genRef.current) return null;
          setResult(res ?? null);
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[Shifting Gears] Socket fetch error:', err?.message);
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
    fetchReport({ expiry_state, reportType, option });
    return () => { genRef.current += 1; };
  }, [expiry_state, reportType, option, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(stateRef.current, { silent: true }), [fetchReport]));

  const handleExpiryChange = useCallback((next) => {
    if (next === stateRef.current.expiry_state) return;
    setExpiryState(next);
  }, []);

  const handleReportType = useCallback((next) => {
    if (next === stateRef.current.reportType) return;
    setReportType(next);
  }, []);

  const handleOption = useCallback((next) => {
    if (next === stateRef.current.option) return;
    setOption(next);
  }, []);

  const currentLevelField = useMemo(() => levelField(reportType, option), [reportType, option]);
  const currentLevelLabel = useMemo(() => levelLabel(reportType, option), [reportType, option]);

  const HeaderComponent = useCallback(({ sort, onSort }) => (
    <ShiftingGearsHeader sort={sort} onSort={onSort} levelField={currentLevelField} levelLabel={currentLevelLabel} />
  ), [currentLevelField, currentLevelLabel]);

  const RowComponent = useCallback((props) => (
    <ShiftingGearsRow {...props} levelField={currentLevelField} />
  ), [currentLevelField]);

  const rows = Array.isArray(result?.data) ? result.data : [];
  const timestamp = typeof result?.timestamp === 'string' && result.timestamp ? result.timestamp : '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Shifting Gears" timestamp={timestamp} />
      <View style={styles.metaRow}>
        <ExpiryDropdownComponent value={expiry_state} onSelect={handleExpiryChange} />
      </View>
      <View style={styles.toggleWrap}>
        <View style={styles.toggleRow}>
          {REPORT_TYPES.map((item) => {
            const selected = item.value === reportType;
            return (
              <Pressable key={item.value} onPress={() => handleReportType(item.value)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.toggleBtn, selected ? styles.toggleBtnActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                <Text style={[styles.toggleLabel, selected ? styles.toggleLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.durationWrap}>
        <View style={styles.durationRow}>
          {DURATIONS.map((item) => {
            const selected = item.value === option;
            return (
              <Pressable key={item.value} onPress={() => handleOption(item.value)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.durationBtn, selected ? styles.durationBtnActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                <Text style={[styles.durationLabel, selected ? styles.durationLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.table}>
        <CommonTable
          data={rows}
          columns={SHIFTING_GEARS_COLUMNS}
          loading={loading}
          HeaderComponent={HeaderComponent}
          RowComponent={RowComponent}
          keyExtractor={rowKey}
          emptyText={error ? 'Failed to load report. Please try again.' : 'No stocks to show'}
          rowStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(ShiftingGearsReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  pointer: { cursor: 'pointer' },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
  toggleWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  toggleRow: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', backgroundColor: '#EEF2F6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  toggleBtnActive: { backgroundColor: PRIMARY },
  toggleLabel: { fontSize: 12.5, lineHeight: 17, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  toggleLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  durationWrap: { paddingHorizontal: 16, paddingBottom: 18 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationBtn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  durationBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  durationLabel: { fontSize: 11, lineHeight: 14, fontFamily: 'Inter_500Medium', color: MUTED, textAlign: 'center' },
  durationLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: 8 },
});
