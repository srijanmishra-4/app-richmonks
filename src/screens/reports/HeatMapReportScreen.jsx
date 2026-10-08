import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, Dimensions, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import { SortAscIcon, SortDescIcon, SortNoneIcon, FilterIcon, FlipIcon, SearchIcon, ClockIcon } from '@/components/ReportIconComponent';
import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import { useCommonData } from '@/context/CommonDataContext';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { socketRequest } from '@/utils/socket';
import { useFs, useScaledStyles } from '@/utils/responsive';

const PRIMARY = '#0071A9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const BORDER = '#E2E8F0';
const GREEN = '#16A34A';
const RED = '#DC2626';

const REPORT_TABS = [
  { id: 'topGainersLosers', label: 'Top Gainers Losers' },
  { id: 'weeklyRolling', label: 'Weekly Rolling' },
  { id: 'sinceExpiry', label: 'Since Expiry' },
];

const NUM_COLUMNS = 4;
const GRID_H_PAD = 10;
const TILE_GAP = 2;
const TILE_HEIGHT = 74;
const ROW_HEIGHT = TILE_HEIGHT + TILE_GAP;
const TAB_H_PAD = 8;
const TAB_GAP = 8;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatExpiryDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (match) {
    const month = MONTHS[Number(match[2]) - 1];
    return month ? `${Number(match[3])} ${month}` : str;
  }
  return str;
}

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatPrice(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const parts = String(num).split('.');
  const intPart = groupDigits(parts[0]);
  return parts.length > 1 ? `₹${intPart}.${parts[1]}` : `₹${intPart}`;
}

function formatChange(val, pct) {
  if (val == null && pct == null) return { amount: '', pct: '' };
  const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,]/g, ''));
  const numPct = typeof pct === 'number' ? pct : parseFloat(String(pct).replace(/%/g, ''));
  const isNegative = (Number.isFinite(numVal) && numVal < 0) || (Number.isFinite(numPct) && numPct < 0);
  const sign = isNegative ? '-' : '+';
  let valStr = '';
  if (Number.isFinite(numVal)) {
    const absVal = Math.abs(numVal);
    const parts = String(absVal).split('.');
    const intPart = groupDigits(parts[0]);
    valStr = `${sign} ₹${parts.length > 1 ? `${intPart}.${parts[1]}` : intPart}`;
  } else if (val != null && val !== '') {
    valStr = String(val);
  }
  let pctStr = '';
  if (Number.isFinite(numPct)) {
    pctStr = `(${sign}${Math.abs(numPct)}%)`;
  } else if (pct != null && pct !== '') {
    pctStr = `(${pct}%)`;
  }
  return { amount: valStr, pct: pctStr };
}

function formatGridData(dataList, numColumns = 4) {
  if (!dataList || !dataList.length) return [];
  const remainder = dataList.length % numColumns;
  if (remainder === 0) return dataList;
  const paddingCount = numColumns - remainder;
  const padded = [...dataList];
  for (let i = 0; i < paddingCount; i++) {
    padded.push({ _empty: true, _key: `empty-${i}` });
  }
  return padded;
}

function textUnits(value, fontSize, ratio) {
  return String(value ?? '').length * fontSize * ratio;
}

function fittedSize(value, fontSize, minScale, maxWidth, ratio) {
  if (!fontSize || !maxWidth) return null;
  const needed = textUnits(value, fontSize, ratio);
  if (needed <= maxWidth) return null;
  const next = Math.max(fontSize * minScale, (fontSize * maxWidth) / needed);
  const rounded = Math.round(next * 2) / 2;
  return rounded < fontSize ? rounded : null;
}

function sizedText(base, size, color) {
  const colorStyle = { color };
  return size == null ? [base, colorStyle] : [base, colorStyle, { fontSize: size }];
}

function buildHeatTiles(list, metrics) {
  const padded = formatGridData(list, NUM_COLUMNS);
  const seen = new Map();
  return padded.map((item, index) => {
    if (item._empty) return item;
    const price = formatPrice(item.price);
    const { pct } = formatChange(item.price_change_value, item.price_change_percent);
    const changeText = pct.replace(/^\((.*)\)$/, '$1');
    const textColor = item.font_color || TEXT;
    const base = item.symbol || `tile-${index}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const lineWidth = Math.max(28, metrics.textWidth - 2);
    return {
      key: count === 0 ? String(base) : `${base}#${count}`,
      symbol: item.symbol,
      price,
      changeText,
      bg: item.bg_color || BORDER,
      textColor,
      changeColor: item.font_color || (changeText.startsWith('-') ? RED : GREEN),
      label: `${item.symbol} ${price} ${changeText}`,
      symbolSize: fittedSize(item.symbol, metrics.symbol, 0.65, lineWidth, 0.74),
      priceSize: fittedSize(price, metrics.price, 0.65, lineWidth, 0.7),
      changeSize: fittedSize(changeText, metrics.change, 0.58, lineWidth, 0.68),
    };
  });
}

const ControlButton = memo(function ControlButton({ onPress, label, active, flash, children }) {
  const [pressed, setPressed] = useState(false);
  const releaseTimer = useRef(null);
  useEffect(() => () => clearTimeout(releaseTimer.current), []);
  const handlePressIn = () => {
    clearTimeout(releaseTimer.current);
    setPressed(true);
  };
  const handlePressOut = () => {
    if (!flash) {
      setPressed(false);
      return;
    }
    releaseTimer.current = setTimeout(() => setPressed(false), 120);
  };
  const pressedStyle = flash ? styles.ctrlBtnActive : styles.tilePressed;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.ctrlBtn, active ? styles.ctrlBtnActive : null, pressed ? pressedStyle : null, Platform.OS === 'web' ? styles.pointer : null]}
    >
      {children}
    </Pressable>
  );
});

const HeatMapTile = memo(function HeatMapTile({ item, text }) {
  if (item._empty) {
    return <View style={styles.tileOuter}><View style={[styles.tile, styles.tileEmpty]} /></View>;
  }
  return (
    <View style={styles.tileOuter}>
      <View accessible accessibilityLabel={item.label} style={[styles.tile, { backgroundColor: item.bg }]}>
        <Text style={sizedText(text.tileSymbol, item.symbolSize, item.textColor)} numberOfLines={1} allowFontScaling={false}>{item.symbol}</Text>
        <Text style={sizedText(text.tilePrice, item.priceSize, item.textColor)} numberOfLines={1} allowFontScaling={false}>{item.price}</Text>
        <Text style={sizedText(text.tileChange, item.changeSize, item.changeColor)} numberOfLines={1} allowFontScaling={false}>( {item.changeText} )</Text>
      </View>
    </View>
  );
});

const Dropdown = memo(function Dropdown({ label, value, options, onSelect }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const t = useScaledStyles(textStyles);
  const current = options.find((item) => item.value === value);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!options.length) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 92);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 3, width: menuWidth });
      setOpen(true);
    });
  }, [open, options.length]);

  return (
    <View style={styles.expiryWrap}>
      {label ? <Text style={t.metaLabel} maxFontSizeMultiplier={1.1}>{label}</Text> : null}
      <View ref={anchorRef} collapsable={false}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={label || 'Expiry'} accessibilityState={{ expanded: open }} style={[styles.expiryBtn, open ? styles.expiryBtnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}>
          <Text style={t.expiryValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{current?.label ?? '—'}</Text>
          <View style={open ? styles.chevronUp : styles.chevronDown}><ChevronRightIcon size={12} color={MUTED} /></View>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuBackdrop} onPress={() => setOpen(false)} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {options.map((item, index) => {
                const active = item.value === value;
                return (
                  <Pressable key={`${item.value}-${index}`} onPress={() => { setOpen(false); onSelect(item.value); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                    <Text style={[t.menuText, active ? styles.menuTextActive : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text>
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

function HeatMapReportScreen() {
  const { allExpiryDates, nearExpiry, nextExpiry } = useCommonData();
  const [selected_report, setSelectedReport] = useState('topGainersLosers');
  const [selected_expiry, setSelectedExpiry] = useState('near');
  const [search_query, setSearchQuery] = useState('');
  const [sort_state, setSortState] = useState('NONE');
  const [is_filter_active, setIsFilterActive] = useState(false);
  const [original, setOriginal] = useState([]);
  const [working, setWorking] = useState([]);
  const [timestamp, setTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const stateRef = useRef({ report: selected_report, expiry: selected_expiry });
  stateRef.current = { report: selected_report, expiry: selected_expiry };

  const expiryChoices = useMemo(() => {
    const list = (Array.isArray(allExpiryDates) ? allExpiryDates : []).filter((item) => item?.expiry_state === 'near' || item?.expiry_state === 'next');
    if (list.length > 0) {
      list.sort((a, b) => String(a?.expiry_date ?? '').localeCompare(String(b?.expiry_date ?? '')));
      return list.map((item) => ({ value: item.expiry_state, label: formatExpiryDate(item.expiry_date) || item.expiry_date }));
    }
    const choices = [];
    if (nearExpiry) choices.push({ value: 'near', label: formatExpiryDate(nearExpiry) || nearExpiry });
    if (nextExpiry) choices.push({ value: 'next', label: formatExpiryDate(nextExpiry) || nextExpiry });
    if (!choices.length) choices.push({ value: 'near', label: 'Near' }, { value: 'next', label: 'Next' });
    return choices;
  }, [allExpiryDates, nearExpiry, nextExpiry]);

  const fetchHeatMap = useCallback((expiry_state, report, { silent = false } = {}) => {
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_HEAT_MAP', { expiry_state, report })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const list = Array.isArray(res?.data) ? res.data : [];
          setOriginal(list);
          setTimestamp(typeof res?.timestamp === 'string' ? res.timestamp : '');
          setError(false);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[HeatMap] Socket fetch error:', err?.message);
          if (!silent) {
            setError(true);
            setLoading(false);
          }
          return null;
        });
    });
    queueRef.current = task.then(() => { }, () => { });
    return task;
  }, []);

  useEffect(() => {
    fetchHeatMap(selected_expiry, selected_report);
    return () => { genRef.current += 1; };
  }, [selected_expiry, selected_report, fetchHeatMap]);

  useRegisterRefresh(useCallback(() => fetchHeatMap(stateRef.current.expiry, stateRef.current.report, { silent: true }), [fetchHeatMap]));

  const filtered = useMemo(() => {
    const q = search_query.trim().toLowerCase();
    if (!q) return original;
    return original.filter((item) => String(item?.symbol ?? '').toLowerCase().startsWith(q));
  }, [original, search_query]);

  useEffect(() => {
    if (sort_state === 'ASC') {
      setWorking([...filtered].sort((a, b) => String(a?.symbol ?? '').localeCompare(String(b?.symbol ?? ''))));
    } else if (sort_state === 'DESC') {
      setWorking([...filtered].sort((a, b) => String(b?.symbol ?? '').localeCompare(String(a?.symbol ?? ''))));
    } else {
      setWorking([...filtered]);
    }
  }, [filtered, sort_state]);

  const handleSort = useCallback(() => {
    setSortState((prev) => {
      if (prev === 'NONE') return 'ASC';
      if (prev === 'ASC') return 'DESC';
      return 'NONE';
    });
  }, []);

  const handleFlip = useCallback(() => {
    setWorking((prev) => [...prev].reverse());
  }, []);

  const handleReportTab = useCallback((nextReport) => {
    if (nextReport === stateRef.current.report) return;
    setSelectedReport(nextReport);
  }, []);

  const handleExpiryChange = useCallback((nextExpiryState) => {
    if (nextExpiryState === stateRef.current.expiry) return;
    setSelectedExpiry(nextExpiryState);
  }, []);

  const scale = useFs();
  const t = useScaledStyles(textStyles);

  const gridData = useMemo(() => {
    const width = Dimensions.get('window').width;
    const raw = textStyles(scale);
    const textWidth = Math.max(40, (width - 2 * (GRID_H_PAD - TILE_GAP / 2)) / NUM_COLUMNS - TILE_GAP - 8);
    return buildHeatTiles(working, {
      textWidth,
      symbol: raw.tileSymbol.fontSize,
      price: raw.tilePrice.fontSize,
      change: raw.tileChange.fontSize,
    });
  }, [working, scale]);

  const tabLabelSizes = useMemo(() => {
    const width = Dimensions.get('window').width;
    const fontSize = textStyles(scale).tabLabel.fontSize;
    const buttonWidth = (width - TAB_H_PAD * 2 - TAB_GAP * (REPORT_TABS.length - 1)) / REPORT_TABS.length;
    const textWidth = Math.max(24, buttonWidth - 14);
    const longest = REPORT_TABS.reduce((best, tab) => (tab.label.length > best.label.length ? tab : best));
    const sharedSize = fittedSize(longest.label, fontSize, 0.78, textWidth, 0.5);
    const sizes = {};
    REPORT_TABS.forEach((tab) => {
      sizes[tab.id] = sharedSize;
    });
    return sizes;
  }, [scale]);

  const renderTile = useCallback(({ item }) => <HeatMapTile item={item} text={t} />, [t]);

  const keyExtractor = useCallback((_, index) => String(index), []);

  const getRowLayout = useCallback((_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }), []);

  const queryActive = search_query.trim().length > 0;
  const emptyList = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={t.emptyText} maxFontSizeMultiplier={1.1}>{queryActive ? 'No matching stocks found.' : 'No data available.'}</Text>
    </View>
  ), [queryActive, t]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Heat Map Report" />
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={t.metaLabel} maxFontSizeMultiplier={1.1}>Expiry Date</Text>
          <Dropdown value={selected_expiry} options={expiryChoices} onSelect={handleExpiryChange} />
        </View>
        {timestamp ? <View style={styles.timeWrap}><Text style={t.timestamp} numberOfLines={1} maxFontSizeMultiplier={1.1}>{timestamp}</Text><ClockIcon size={12} color={MUTED} /></View> : null}
      </View>
      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={SUBTLE} />
          <TextInput style={[t.searchInput, Platform.OS === 'web' ? styles.noOutline : null]} maxFontSizeMultiplier={1.1} placeholder="Search symbol" placeholderTextColor={SUBTLE} value={search_query} onChangeText={setSearchQuery} autoCapitalize="characters" autoCorrect={false} />
        </View>
        <ControlButton onPress={() => setIsFilterActive((prev) => !prev)} label="Filter" active={is_filter_active}>
          <FilterIcon size={18} color={is_filter_active ? PRIMARY : MUTED} />
        </ControlButton>
        <ControlButton onPress={handleSort} label="Sort" active={sort_state !== 'NONE'}>
          {sort_state === 'ASC' ? <SortAscIcon size={18} color={PRIMARY} /> : sort_state === 'DESC' ? <SortDescIcon size={18} color={PRIMARY} /> : <SortNoneIcon size={18} color={MUTED} />}
        </ControlButton>
        <ControlButton onPress={handleFlip} label="Flip" flash>
          <FlipIcon size={18} color={MUTED} />
        </ControlButton>
      </View>
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          {REPORT_TABS.map((item) => {
            const selected = item.id === selected_report;
            const labelSize = tabLabelSizes[item.id];
            return (
              <Pressable key={item.id} onPress={() => handleReportTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.tab, selected ? styles.tabActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                <Text style={[t.tabLabel, selected ? styles.tabLabelActive : styles.tabLabelIdle, labelSize ? { fontSize: labelSize, lineHeight: Math.round(labelSize * 1.3 * 2) / 2 } : null]} numberOfLines={1} allowFontScaling={false}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={PRIMARY} />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={t.emptyText} maxFontSizeMultiplier={1.1}>Failed to load heat map. Please try again.</Text>
        </View>
      ) : (
        <FlatList
          data={gridData}
          keyExtractor={keyExtractor}
          renderItem={renderTile}
          getItemLayout={getRowLayout}
          numColumns={NUM_COLUMNS}
          style={styles.grid}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={8}
          windowSize={3}
          ListEmptyComponent={emptyList}
        />
      )}
    </SafeAreaView>
  );
}

export default memo(HeatMapReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  pointer: { cursor: 'pointer' },
  noOutline: { outlineStyle: 'none', outlineWidth: 0 },
  tabsWrap: { paddingHorizontal: TAB_H_PAD, paddingBottom: 12 },
  tabs: { flexDirection: 'row', gap: TAB_GAP },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 7, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  tabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  tabLabelIdle: { color: MUTED },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8 },
  metaLeft: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryWrap: { flexDirection: 'row', alignItems: 'center' },
  expiryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 30, minWidth: 80, paddingHorizontal: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, backgroundColor: '#FFFFFF', gap: 6 },
  expiryBtnOpen: { borderColor: PRIMARY },
  chevronDown: { transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 9 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuTextActive: { color: PRIMARY },
  controlsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, gap: 8 },
  searchBox: { flex: 1, flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 10, gap: 8 },
  ctrlBtn: { width: 40, height: 40, flexShrink: 0, flexGrow: 0, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnActive: { backgroundColor: '#E0F2FE', borderColor: PRIMARY },
  grid: { flex: 1 },
  gridContent: { paddingHorizontal: GRID_H_PAD - TILE_GAP / 2, paddingBottom: 16 },
  rowWrapper: { marginHorizontal: 0 },
  tileOuter: { flex: 1, padding: TILE_GAP / 2 },
  tile: { alignSelf: 'stretch', height: TILE_HEIGHT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
  tilePressed: { opacity: 0.8 },
  tileEmpty: { backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
});

const textStyles = (fs) => ({
  tabLabel: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(9, 10, 11), lineHeight: fs(12, 13, 14), fontFamily: 'Inter_500Medium', includeFontPadding: false },
  metaLabel: { fontSize: fs(12), lineHeight: fs(16), fontFamily: 'Inter_500Medium', color: MUTED },
  timestamp: { flexShrink: 1, fontSize: fs(11), lineHeight: fs(15), fontFamily: 'Inter_500Medium', color: MUTED },
  expiryValue: { fontSize: fs(13), lineHeight: fs(17), fontFamily: 'Inter_600SemiBold', color: TEXT },
  menuText: { fontSize: fs(12), lineHeight: fs(16), fontFamily: 'Inter_500Medium', color: TEXT },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontSize: fs(13), fontFamily: 'Inter_400Regular', color: TEXT },
  tileSymbol: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(11, 10, 12), lineHeight: fs(15, 13, 17), fontFamily: 'Inter_500Medium', includeFontPadding: false },
  tilePrice: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(10, 9, 11), lineHeight: fs(12, 11, 14), fontFamily: 'Inter_500Medium', includeFontPadding: false, fontVariant: ['tabular-nums'] },
  tileChange: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(9.5, 8.5, 10), lineHeight: fs(12, 11, 13), fontFamily: 'Inter_500Medium', includeFontPadding: false, fontVariant: ['tabular-nums'] },
  emptyText: { fontSize: fs(13), fontFamily: 'Inter_500Medium', color: SUBTLE, textAlign: 'center' },
});
