import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable, { TableHeaderCell } from '@/components/CommonTable';
import ExpiryDropdownComponent from '@/components/ExpiryDropdownComponent';
import ScreenHeader from '@/components/ScreenHeader';
import StrongWeakFilter, { useStrongWeakFilter } from '@/components/reports/StrongWeakFilter';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const COL = { symbol: 1.1, price: 0.92, period: 1.12, oi: 1.05 };

const OPTION_TYPES = [
  { value: 'future', label: 'Futures' },
  { value: 'call', label: 'Call' },
  { value: 'put', label: 'Put' },
];

const OI_TYPES = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'value', label: 'Value' },
];

const OI_QUANTITY_ONLY = [{ value: 'quantity', label: 'Quantity' }];

const PERIODS = [
  { value: 'day', label: '1 Day' },
  { value: 'day5', label: '5 Day' },
  { value: 'mom', label: 'MOM' },
];

const EXPIRY_STATES = [{ value: 'near' }, { value: 'next' }];

function paramString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value == null ? '' : String(value);
}

function resolveParam(params, key, options, fallback) {
  const raw = paramString(params?.[key]).trim().toLowerCase();
  if (!raw) return fallback;
  return options.some((item) => item.value === raw) ? raw : fallback;
}

function periodFields(period) {
  const prefix = period === 'day5' ? 'day5' : period === 'mom' ? 'mom' : 'day';
  return { price: `${prefix}_price`, price_change: `${prefix}_price_change` };
}

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatGrouped(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }
  if (isNaN(parseFloat(str))) return String(val);
  const parts = str.split('.');
  const dec = parts.length > 1 ? `.${parts[1]}` : '';
  return `${sign}${groupDigits(parts[0])}${dec}`;
}

function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const grouped = formatGrouped(val);
  return grouped === '—' ? '—' : `₹${grouped}`;
}

function formatPct(val) {
  if (val == null || val === '') return '';
  const clean = String(val).trim().replace(/%/g, '').trim();
  const num = Number(clean);
  if (!Number.isFinite(num)) return String(val);
  const body = clean.replace(/^[+-]/, '');
  if (num > 0) return `+${body}%`;
  if (num < 0) return `-${body}%`;
  return `${body}%`;
}

function pctColor(text) {
  if (!text) return NEUTRAL;
  if (text.startsWith('+')) return GREEN;
  if (text.startsWith('-')) return RED;
  return NEUTRAL;
}

function formatStrike(val) {
  if (val == null || val === '' || val === '—') return 'SP : —';
  const n = Number(String(val).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n)) return `SP : ${val}`;
  return `SP : ${n.toLocaleString('en-IN')}`;
}

function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rowKey(item, index) {
  return `${item?.symbol ?? 'row'}-${item?.strike_pr ?? ''}-${index}`;
}

function oiPayload(filters) {
  const payload = { options: filters.option_type, period: filters.period, expiry_state: filters.expiry_state };
  if (filters.option_type !== 'future') payload.vtype = filters.oi_type;
  return payload;
}

const Dropdown = memo(function Dropdown({ label, value, options, onSelect }) {
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
    <View style={styles.selectWrap}>
      {label ? <Text style={styles.selectLabel}>{label}</Text> : null}
      <View ref={anchorRef} collapsable={false}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} style={[styles.selectBtn, open ? styles.selectOpen : null, Platform.OS === 'web' ? styles.pointer : null]}>
          <Text style={styles.selectValue} numberOfLines={1}>{current?.label ?? '—'}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <View collapsable={false} onTouchEnd={() => setOpen(false)} style={[styles.menuBackdrop, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]} />
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

function OiChangesHeader({ sort, onSort, fields, periodLabel }) {
  return (
    <>
      <TableHeaderCell label="Symbol" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} />
      <View style={[styles.headStack, { flex: COL.price }]}>
        <TableHeaderCell label="Price" align="right" style={styles.headLine} />
        <TableHeaderCell label="Change" align="right" sortKey="price_change" getValue={(row) => sortNumber(row?.price_change)} sort={sort} onSort={onSort} style={styles.headLine} />
      </View>
      <View style={[styles.headStack, { flex: COL.period }]}>
        <TableHeaderCell label={`${periodLabel} Price`} align="right" style={styles.headLine} />
        <TableHeaderCell label="Change" align="right" sortKey={fields.price_change} getValue={(row) => sortNumber(row?.[fields.price_change])} sort={sort} onSort={onSort} style={styles.headLine} />
      </View>
      <View style={[styles.headStack, { flex: COL.oi }]}>
        <TableHeaderCell label="OI" align="right" style={styles.headLine} />
        <TableHeaderCell label="Δ OI" align="right" sortKey="change_in_oi" getValue={(row) => sortNumber(row?.change_in_oi)} sort={sort} onSort={onSort} style={styles.headLine} />
      </View>
    </>
  );
}

const OiChangesRow = memo(function OiChangesRow({ data, fields, showStrike }) {
  if (!data) return null;
  const priceChange = formatPct(data.price_change);
  const periodChange = formatPct(data?.[fields.price_change]);
  const oiChange = formatPct(data.change_in_oi);
  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
        {showStrike ? <Text style={styles.strike} numberOfLines={1}>{formatStrike(data.strike_pr)}</Text> : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.price }]}>
        <Text style={styles.price} numberOfLines={1}>{formatMoney(data.price)}</Text>
        {priceChange ? <Text style={[styles.change, { color: pctColor(priceChange) }]} numberOfLines={1}>{priceChange}</Text> : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.period }]}>
        <Text style={styles.price} numberOfLines={1}>{formatMoney(data?.[fields.price])}</Text>
        {periodChange ? <Text style={[styles.change, { color: pctColor(periodChange) }]} numberOfLines={1}>{periodChange}</Text> : null}
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.oi }]}>
        <Text style={styles.oi} numberOfLines={1}>{formatGrouped(data.oi)}</Text>
        <Text style={[styles.change, { color: pctColor(oiChange) }]} numberOfLines={1}>{oiChange || '—'}</Text>
      </View>
    </>
  );
});

function initialFilters(params) {
  const option_type = resolveParam(params, 'option_type', OPTION_TYPES, 'future');
  return {
    option_type,
    oi_type: option_type === 'future' ? 'quantity' : resolveParam(params, 'oi_type', OI_TYPES, 'quantity'),
    period: resolveParam(params, 'period', PERIODS, 'day'),
    expiry_state: resolveParam(params, 'expiry_state', EXPIRY_STATES, 'near'),
  };
}

function filtersKey(filters) {
  return `${filters.option_type}|${filters.oi_type}|${filters.period}|${filters.expiry_state}`;
}

function OiChangesReportScreen() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const optionParam = paramString(params.option_type).trim();
  const oiParam = paramString(params.oi_type).trim();
  const periodParam = paramString(params.period).trim();
  const expiryParam = paramString(params.expiry_state).trim();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const { option_type, oi_type, period, expiry_state } = filters;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const loadPendingRef = useRef(true);
  const filtersRef = useRef(filters);
  const pushedRef = useRef([]);

  // URL -> state. Params we pushed ourselves are acknowledged and skipped so an
  // older push landing late can't revert a newer selection.
  useEffect(() => {
    const fromUrl = initialFilters({ option_type: optionParam, oi_type: oiParam, period: periodParam, expiry_state: expiryParam });
    const key = filtersKey(fromUrl);
    const pushedIndex = pushedRef.current.indexOf(key);
    if (pushedIndex !== -1) {
      pushedRef.current.splice(0, pushedIndex + 1);
    } else if (key !== filtersKey(filtersRef.current)) {
      filtersRef.current = fromUrl;
      loadPendingRef.current = true;
      setFilters(fromUrl);
      setLoading(true);
      setError(false);
    }
    if (optionParam !== fromUrl.option_type || oiParam !== fromUrl.oi_type || periodParam !== fromUrl.period || expiryParam !== fromUrl.expiry_state) {
      navigation.setParams(fromUrl);
    }
  }, [navigation, optionParam, oiParam, periodParam, expiryParam]);

  // Callers that change filters set `loading` themselves. A silent refresh that
  // supersedes a pending load inherits it, so its failure still clears the skeleton.
  const fetchReport = useCallback((nextFilters, { silent = false } = {}) => {
    const gen = ++genRef.current;
    const ownsLoading = !silent || loadPendingRef.current;
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_OI_CHANGES', oiPayload(nextFilters))
        .then((res) => {
          if (gen !== genRef.current) return null;
          loadPendingRef.current = false;
          setResult(res && typeof res === 'object' ? res : {});
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[OI Changes] Socket fetch error:', err?.message);
          if (ownsLoading) {
            loadPendingRef.current = false;
            setError(true);
            setResult(null);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return task;
  }, []);

  useEffect(() => {
    fetchReport(filters);
    return () => { genRef.current += 1; };
  }, [filters, fetchReport]);

  useRegisterRefresh(useCallback(() => fetchReport(filtersRef.current, { silent: true }), [fetchReport]));

  const fields = useMemo(() => periodFields(period), [period]);
  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? '1 Day';
  const showStrike = option_type !== 'future';
  const oiOptions = option_type === 'future' ? OI_QUANTITY_ONLY : OI_TYPES;
  const sourceRows = Array.isArray(result?.data) ? result.data : null;
  const { value: remark, onChange: setRemark, clear: clearRemark, rows: visibleRows } = useStrongWeakFilter(sourceRows, { enabled: showStrike });

  const columns = useMemo(() => [
    { flex: COL.symbol, align: 'left', lines: showStrike ? 2 : 1 },
    { flex: COL.price, align: 'right', lines: 2 },
    { flex: COL.period, align: 'right', lines: 2 },
    { flex: COL.oi, align: 'right', lines: 2 },
  ], [showStrike]);

  const HeaderComponent = useCallback(({ sort, onSort }) => (
    <OiChangesHeader sort={sort} onSort={onSort} fields={fields} periodLabel={periodLabel} />
  ), [fields, periodLabel]);

  const RowComponent = useCallback((props) => (
    <OiChangesRow {...props} fields={fields} showStrike={showStrike} />
  ), [fields, showStrike]);

  const updateFilters = useCallback((patch) => {
    const prev = filtersRef.current;
    const next = { ...prev, ...patch };
    if (next.option_type === 'future') next.oi_type = 'quantity';
    if (filtersKey(next) === filtersKey(prev)) return;
    filtersRef.current = next;
    pushedRef.current.push(filtersKey(next));
    loadPendingRef.current = true;
    setFilters(next);
    setLoading(true);
    setError(false);
    navigation.setParams(next);
  }, [navigation]);

  const onOptionType = useCallback((value) => {
    if (value === 'future') clearRemark();
    updateFilters({ option_type: value });
  }, [clearRemark, updateFilters]);

  const onOiType = useCallback((value) => updateFilters({ oi_type: value }), [updateFilters]);
  const onPeriod = useCallback((value) => updateFilters({ period: value }), [updateFilters]);
  const onExpiry = useCallback((value) => updateFilters({ expiry_state: value }), [updateFilters]);

  const timestamp = typeof result?.timestamp === 'string' && result.timestamp ? result.timestamp : '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="OI Changes" timestamp={timestamp} />
      <View style={styles.controls}>
        <Dropdown label="Option Type" value={option_type} options={OPTION_TYPES} onSelect={onOptionType} />
        <Dropdown label="OI Type" value={oi_type} options={oiOptions} onSelect={onOiType} />
        <Dropdown label="Period" value={period} options={PERIODS} onSelect={onPeriod} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <ExpiryDropdownComponent value={expiry_state} onSelect={onExpiry} />
        </View>
        {showStrike ? <StrongWeakFilter value={remark} onChange={setRemark} /> : null}
      </View>
      <View style={styles.table}>
        <CommonTable data={visibleRows} columns={columns} loading={loading} HeaderComponent={HeaderComponent} RowComponent={RowComponent} keyExtractor={rowKey} emptyText={error ? 'Failed to load report. Please try again.' : 'No data to show'} rowStyle={styles.row} />
      </View>
    </SafeAreaView>
  );
}

export default memo(OiChangesReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  pointer: { cursor: 'pointer' },
  controls: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  selectWrap: { flex: 1, minWidth: 0 },
  selectLabel: { marginBottom: 4, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', gap: 4 },
  selectOpen: { borderColor: '#0071A9' },
  selectValue: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  menu: { position: 'absolute', zIndex: 2, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 4 },
  menuItem: { paddingHorizontal: 10, paddingVertical: 9 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: '#0071A9' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8 },
  metaLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 6 },
  table: { flex: 1, minHeight: 0 },
  row: { alignItems: 'flex-start', paddingVertical: 8 },
  headStack: { minWidth: 0, justifyContent: 'flex-end' },
  headLine: { flex: 0, alignSelf: 'stretch' },
  cell: { minWidth: 0, justifyContent: 'center', paddingRight: 4 },
  cellEnd: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 4 },
  symbol: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  strike: { marginTop: 4, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#64748B' },
  price: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  oi: { fontSize: 10, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  change: { marginTop: 4, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
});
