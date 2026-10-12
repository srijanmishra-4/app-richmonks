import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SHIFTING_GEARS_COLUMNS, ShiftingGearsHeader, ShiftingGearsRow } from '@/components/reports/shiftingGearsTable';
import { ClockIcon } from '@/components/ReportIconComponent';
import { useCommonData } from '@/context/CommonDataContext';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const PRIMARY = '#0071A9';
const MUTED = '#64748B';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatExpiryDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (!match) return '—';
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return '—';
  return `${Number(match[3])} ${month}`;
}

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

const ExpiryDropdown = memo(function ExpiryDropdown({ value, options, onSelect }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const current = options.find((item) => item.value === value);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!options.length) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 96);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 4, width: menuWidth });
      setOpen(true);
    });
  }, [open, options.length]);

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Expiry" accessibilityState={{ expanded: open }} style={[styles.expiryBtn, open ? styles.expiryBtnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}>
        <Text style={styles.expiryValue} numberOfLines={1}>{current?.label ?? '—'}</Text>
        <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuBackdrop} onPress={() => setOpen(false)} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {options.map((item, index) => {
                const active = item.value === value;
                return (
                  <Pressable key={`${item.value}-${index}`} onPress={() => { setOpen(false); onSelect(item.value); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                    <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>{item.label}</Text>
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

function rowKey(item, index) {
  return `${item?.symbol ?? 'row'}-${item?.rank ?? index}`;
}

function ShiftingGearsReportScreen() {
  const { allExpiryDates } = useCommonData();
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

  const expiryChoices = useMemo(() => {
    const list = (Array.isArray(allExpiryDates) ? allExpiryDates : []).filter((item) => item?.expiry_state === 'near' || item?.expiry_state === 'next');
    list.sort((a, b) => String(a?.expiry_date ?? '').localeCompare(String(b?.expiry_date ?? '')));
    return list.map((item) => ({ value: item.expiry_state, label: formatExpiryDate(item.expiry_date) }));
  }, [allExpiryDates]);

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
      <ScreenHeader label="Shifting Gears" />
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.metaLabel}>Expiry</Text>
          <ExpiryDropdown value={expiry_state} options={expiryChoices} onSelect={handleExpiryChange} />
        </View>
        {timestamp ? (
          <View style={styles.timeWrap}>
            <Text style={styles.timestamp} numberOfLines={1}>{timestamp}</Text>
            <ClockIcon size={12} color={MUTED} />
          </View>
        ) : null}
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
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
  metaLeft: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  timeWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  timestamp: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: MUTED },
  expiryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  expiryBtnOpen: { borderColor: PRIMARY },
  expiryValue: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_500Medium', color: MUTED },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  menu: { position: 'absolute', zIndex: 2, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 4 },
  menuItem: { paddingHorizontal: 10, paddingVertical: 9 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: PRIMARY },
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
