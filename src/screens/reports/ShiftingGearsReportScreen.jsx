import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import { SHIFTING_GEARS_COLUMNS, ShiftingGearsHeader, ShiftingGearsRow } from '@/components/reports/shiftingGearsTable';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { MONTHLY_EXPIRY_OPTIONS, paramString, queryKey, resolveChoice, useReportQuery } from '@/utils/reportParams';
import { socketRequest } from '@/utils/socket';

const PRIMARY = '#0071A9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

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

const OPTION_VALUES = [{ value: '5' }, { value: '20' }, { value: '100' }, { value: '200' }];

function parseShifting(raw) {
  const filters = {
    expiry_state: resolveChoice(raw, 'expiry_state', MONTHLY_EXPIRY_OPTIONS, 'near'),
    report_type: resolveChoice(raw, 'report_type', REPORT_TYPES, 'above'),
    option: Number(resolveChoice(raw, 'option', OPTION_VALUES, '5')),
  };
  return {
    filters,
    serialized: { expiry_state: filters.expiry_state, report_type: filters.report_type, option: String(filters.option) },
  };
}

function shiftingParams(state) {
  return { expiry_state: state.expiry_state, report_type: state.reportType, option: String(state.option) };
}

const ReportTypeDropdown = memo(function ReportTypeDropdown({ value, onSelect }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const current = REPORT_TYPES.find((item) => item.value === value);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 120);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 4, width: menuWidth });
      setOpen(true);
    });
  }, [open]);

  return (
    <View style={styles.typeWrap}>
      <Text style={styles.typeLabel}>Report Type</Text>
      <View ref={anchorRef} collapsable={false}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Report Type" accessibilityState={{ expanded: open }} style={[styles.typeBtn, open ? styles.typeBtnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}>
          <Text style={styles.typeValue} numberOfLines={1}>{current?.label ?? '—'}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <View collapsable={false} onTouchEnd={() => setOpen(false)} style={[styles.menuBackdrop, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {REPORT_TYPES.map((item) => {
                const active = item.value === value;
                return (
                  <Pressable key={item.value} onPress={() => { setOpen(false); onSelect(item.value); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                    <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
});

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
  const routeParams = useLocalSearchParams();
  const rawParams = {
    expiry_state: paramString(routeParams.expiry_state).trim(),
    report_type: paramString(routeParams.report_type).trim(),
    option: paramString(routeParams.option).trim(),
  };
  const initial = parseShifting(rawParams).filters;
  const [expiry_state, setExpiryState] = useState(initial.expiry_state);
  const [reportType, setReportType] = useState(initial.report_type);
  const [option, setOption] = useState(initial.option);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const stateRef = useRef({ expiry_state, reportType, option });
  useEffect(() => {
    stateRef.current = { expiry_state, reportType, option };
  }, [expiry_state, reportType, option]);
  const stateKey = queryKey(shiftingParams({ expiry_state, reportType, option }));
  const pushParams = useReportQuery(rawParams, parseShifting, stateKey, (filters) => {
    const next = { expiry_state: filters.expiry_state, reportType: filters.report_type, option: filters.option };
    stateRef.current = next;
    setExpiryState(next.expiry_state);
    setReportType(next.reportType);
    setOption(next.option);
  });

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

  const publish = useCallback((next) => {
    stateRef.current = next;
    setExpiryState(next.expiry_state);
    setReportType(next.reportType);
    setOption(next.option);
    pushParams(shiftingParams(next));
  }, [pushParams]);

  const handleExpiryChange = useCallback((next) => {
    if (next === stateRef.current.expiry_state) return;
    publish({ ...stateRef.current, expiry_state: next });
  }, [publish]);

  const handleReportType = useCallback((next) => {
    if (next === stateRef.current.reportType) return;
    publish({ ...stateRef.current, reportType: next });
  }, [publish]);

  const handleOption = useCallback((next) => {
    if (next === stateRef.current.option) return;
    publish({ ...stateRef.current, option: next });
  }, [publish]);

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
        <ReportTypeDropdown value={reportType} onSelect={handleReportType} />
        <ExpiryDropdownComponent value={expiry_state} onSelect={handleExpiryChange} />
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
  metaRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  typeWrap: { flexShrink: 1, alignItems: 'stretch', minWidth: 136 },
  typeLabel: { marginBottom: 4, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  typeBtn: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, backgroundColor: '#FFFFFF', gap: 4 },
  typeBtnOpen: { borderColor: PRIMARY },
  typeValue: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: TEXT },
  caret: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_500Medium', color: MUTED },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 9 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: TEXT },
  menuTextActive: { color: PRIMARY, fontFamily: 'Inter_600SemiBold' },
  durationWrap: { paddingHorizontal: 16, paddingBottom: 18 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationBtn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  durationBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  durationLabel: { fontSize: 11, lineHeight: 14, fontFamily: 'Inter_500Medium', color: MUTED, textAlign: 'center' },
  durationLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  table: { flex: 1, minHeight: 0 },
  row: { paddingVertical: 8 },
});
