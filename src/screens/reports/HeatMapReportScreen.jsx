import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Dimensions, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import BottomSlideOn from '@/components/BottomSlideOn';
import ExpiryDropdownComponent, { useExpiryOptions } from '@/components/ExpiryDropdownComponent';
import HeatmapFilterSlideOnComponent from '@/components/reports/HeatmapFilterSlideOnComponent';
import LineGraph from '@/components/LineGraph';
import { cdnApi } from '@/utils/api';
import { FilterIcon, FlipIcon, SearchIcon } from '@/components/ReportIconComponent';
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

const SORT_OPTIONS = [
  { key: 'NONE', label: 'None' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'chg_in_oi_1d', label: 'OI change 1 Day' },
  { key: 'chg_in_oi_5d', label: 'OI Change 5 Days' },
  { key: 'chg_in_oi_10d', label: 'OI Change 10 Days' },
  { key: 'chg_in_oi_expiry', label: 'OI Change Since Expiry' },
];

const NUM_COLUMNS = 4;
const GRID_H_PAD = 10;
const TILE_GAP = 2;
const TILE_HEIGHT = 74;
const ROW_HEIGHT = TILE_HEIGHT + TILE_GAP;
const TAB_H_PAD = 8;
const TAB_GAP = 8;

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
  const seen = new Map();
  return (list || []).map((item, index) => {
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
      data: item,
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

const HeatMapTile = memo(function HeatMapTile({ item, text, onSelect }) {
  if (item._empty) {
    return <View style={styles.tileOuter}><View style={[styles.tile, styles.tileEmpty]} /></View>;
  }
  return (
    <Pressable onPress={() => onSelect(item.data)} accessibilityRole="button" accessibilityLabel={item.label} style={[styles.tileOuter, Platform.OS === 'web' ? styles.pointer : null]}>
      <View style={[styles.tile, { backgroundColor: item.bg }]}>
        <Text style={sizedText(text.tileSymbol, item.symbolSize, item.textColor)} numberOfLines={1} allowFontScaling={false}>{item.symbol}</Text>
        <Text style={sizedText(text.tilePrice, item.priceSize, item.textColor)} numberOfLines={1} allowFontScaling={false}>{item.price}</Text>
        <Text style={sizedText(text.tileChange, item.changeSize, item.changeColor)} numberOfLines={1} allowFontScaling={false}>( {item.changeText} )</Text>
      </View>
    </Pressable>
  );
});

const hasValue = (val) => val != null && val !== '';

function rangeText(low, high) {
  return hasValue(low) && hasValue(high) ? `${formatPrice(low)} - ${formatPrice(high)}` : null;
}

// Maps a GET_HEAT_MAP row to the generic BottomSlideOn props; metrics missing from the row are skipped.
function buildTileDetail(item, expiry) {
  const { amount, pct } = formatChange(item.price_change_value, item.price_change_percent);
  const stock = item.stock_data || {};
  const metrics = [
    { label: 'WAP', value: hasValue(stock.wap) ? formatPrice(stock.wap) : null },
    { label: 'Vol (in Lacs)', value: hasValue(stock.volume) ? `${stock.volume}L` : null },
    { label: "Today's Range", value: rangeText(stock.low_today, stock.high_today) },
    { label: '5 Days Range', value: rangeText(stock.low_5_day, stock.high_5_day) },
  ].filter((row) => hasValue(row.value)).map((row) => ({ label: row.label, value: String(row.value) }));
  // LineGraph reads price_change for point colours and cdate/time for its tooltip.
  const graph = (Array.isArray(item.graph_data) ? item.graph_data : []).map((pt) => {
    const [cdate, time] = String(pt?.cdate ?? '').split(' ');
    return { price: pt?.price, price_change: pt?.price_chg, cdate, time };
  });
  return {
    logo: item.symbol ? cdnApi(item.symbol) : null,
    title: item.symbol,
    subtitle: expiry,
    price: formatPrice(item.price),
    change: amount,
    changePct: pct,
    positive: amount || pct ? !`${amount}${pct}`.includes('-') : null,
    metrics,
    graph,
  };
}

// Profile page not built yet.
const noop = () => {};

function HeatMapReportScreen() {
  const { industries } = useCommonData();
  const [selected_report, setSelectedReport] = useState('topGainersLosers');
  const [selected_expiry, setSelectedExpiry] = useState('near');
  const [search_query, setSearchQuery] = useState('');
  const [sort_key, setSortKey] = useState('NONE');
  const [industry_id, setIndustryId] = useState(null);
  const [original, setOriginal] = useState([]);
  const [is_flipped, setIsFlipped] = useState(false);
  const [timestamp, setTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected_tile, setSelectedTile] = useState(null);
  const [sheet_open, setSheetOpen] = useState(false);
  const [filter_sheet_open, setFilterSheetOpen] = useState(false);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const stateRef = useRef({ report: selected_report, expiry: selected_expiry });
  stateRef.current = { report: selected_report, expiry: selected_expiry };

  const expiryChoices = useExpiryOptions();

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

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleReportTab = useCallback((nextReport) => {
    if (nextReport === stateRef.current.report) return;
    setIsFlipped(false);
    setSelectedReport(nextReport);
  }, []);

  const handleExpiryChange = useCallback((nextExpiryState) => {
    if (nextExpiryState === stateRef.current.expiry) return;
    setIsFlipped(false);
    setSelectedExpiry(nextExpiryState);
  }, []);

  // Industry symbol Set for filtering
  const industrySet = useMemo(() => {
    if (industry_id == null || !Array.isArray(industries)) return null;
    const ind = industries.find((i) => i.id === industry_id);
    if (!ind || !Array.isArray(ind.symbols)) return null;
    return new Set(ind.symbols);
  }, [industry_id, industries]);

  const scale = useFs();
  const t = useScaledStyles(textStyles);

  const allTiles = useMemo(() => {
    const width = Dimensions.get('window').width;
    const raw = textStyles(scale);
    const textWidth = Math.max(40, (width - 2 * (GRID_H_PAD - TILE_GAP / 2)) / NUM_COLUMNS - TILE_GAP - 8);
    return buildHeatTiles(original, {
      textWidth,
      symbol: raw.tileSymbol.fontSize,
      price: raw.tilePrice.fontSize,
      change: raw.tileChange.fontSize,
    });
  }, [original, scale]);

  const filtered = useMemo(() => {
    const q = search_query.trim().toLowerCase();
    let list = allTiles;
    if (q) list = list.filter((item) => String(item?.symbol ?? '').toLowerCase().startsWith(q));
    if (industrySet) list = list.filter((item) => !item._empty && industrySet.has(item.symbol));
    return list;
  }, [allTiles, search_query, industrySet]);

  const working = useMemo(() => {
    let list = filtered;
    if (sort_key === 'symbol') {
      list = [...filtered].sort((a, b) => String(a?.symbol ?? '').localeCompare(String(b?.symbol ?? '')));
    } else if (sort_key !== 'NONE') {
      list = [...filtered].sort((a, b) => {
        const va = Number(a?.data?.[sort_key] ?? a?.[sort_key]) || 0;
        const vb = Number(b?.data?.[sort_key] ?? b?.[sort_key]) || 0;
        return vb - va;
      });
    }
    return is_flipped ? [...list].reverse() : list;
  }, [filtered, sort_key, is_flipped]);

  const gridData = useMemo(() => formatGridData(working, NUM_COLUMNS), [working]);



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

  const handleTileSelect = useCallback((item) => {
    setSelectedTile(item);
    setSheetOpen(true);
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const clearSelectedTile = useCallback(() => setSelectedTile(null), []);

  const openFilterSheet = useCallback(() => setFilterSheetOpen(true), []);
  const closeFilterSheet = useCallback(() => setFilterSheetOpen(false), []);
  const handleApplyFilterSort = useCallback(({ sort, industry, type }) => {
    if (type === 'sort') {
      setSortKey(sort);
    } else if (type === 'filter') {
      setIndustryId(industry);
    } else {
      if (sort !== undefined) setSortKey(sort);
      if (industry !== undefined) setIndustryId(industry);
    }
    setFilterSheetOpen(false);
  }, []);
  const handleResetFilterSort = useCallback((type) => {
    if (type === 'sort') {
      setSortKey('NONE');
    } else if (type === 'filter') {
      setIndustryId(null);
    } else {
      setSortKey('NONE');
      setIndustryId(null);
    }
  }, []);

  // Follow the latest socket row for the open symbol so silent refreshes stay in sync.
  const tileDetail = useMemo(() => {
    if (!selected_tile) return null;
    const live = original.find((item) => item?.symbol === selected_tile.symbol) || selected_tile;
    return buildTileDetail(live, expiryChoices.find((item) => item.value === selected_expiry)?.label);
  }, [selected_tile, original, expiryChoices, selected_expiry]);


  const filterActive = sort_key !== 'NONE' || industry_id != null;
  const queryActive = search_query.trim().length > 0;
  const emptyList = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={t.emptyText} maxFontSizeMultiplier={1.1}>{queryActive ? 'No matching stocks found.' : 'No data available.'}</Text>
    </View>
  ), [queryActive, t]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Heat Map Report" timestamp={timestamp} />
      <View style={styles.metaRow}>
        <ExpiryDropdownComponent value={selected_expiry} onSelect={handleExpiryChange} />
      </View>
      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={SUBTLE} />
          <TextInput style={[t.searchInput, Platform.OS === 'web' ? styles.noOutline : null]} maxFontSizeMultiplier={1.1} placeholder="Search symbol" placeholderTextColor={SUBTLE} value={search_query} onChangeText={setSearchQuery} autoCapitalize="characters" autoCorrect={false} />
        </View>
        <ControlButton onPress={openFilterSheet} label="Filter" active={filterActive}>
          <FilterIcon size={18} color={filterActive ? PRIMARY : MUTED} />
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
        gridData.length === 0 ? emptyList : (
        <ScrollView
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.gridWrap}>
            {gridData.map((item) => (
              <HeatMapTile key={item.key ?? item._key} item={item} text={t} onSelect={handleTileSelect} />
            ))}
          </View>
        </ScrollView>
        )
      )}
      <BottomSlideOn
        visible={sheet_open && !!tileDetail}
        onClose={closeSheet}
        onDismissed={clearSelectedTile}
        logo={tileDetail?.logo}
        title={tileDetail?.title}
        subtitle={tileDetail?.subtitle}
        price={tileDetail?.price}
        change={tileDetail?.change}
        changePct={tileDetail?.changePct}
        positive={tileDetail?.positive}
        metrics={tileDetail?.metrics}
        graph={tileDetail?.graph.length > 1 ? <LineGraph data={tileDetail.graph} height={125} captureOnStart /> : null}
        actionLabel="View Profile"
        onAction={noop}
      />
      <HeatmapFilterSlideOnComponent
        visible={filter_sheet_open}
        onClose={closeFilterSheet}
        appliedSort={sort_key}
        appliedIndustry={industry_id}
        industries={industries}
        sortOptions={SORT_OPTIONS}
        onApply={handleApplyFilterSort}
        onReset={handleResetFilterSort}
      />
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
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, gap: 8 },
  searchBox: { flex: 1, flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 10, gap: 8 },
  ctrlBtn: { width: 40, height: 40, flexShrink: 0, flexGrow: 0, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnActive: { backgroundColor: '#E0F2FE', borderColor: PRIMARY },
  grid: { flex: 1 },
  gridContent: { paddingHorizontal: GRID_H_PAD - TILE_GAP / 2, paddingBottom: 16 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tileOuter: { width: '25%', padding: TILE_GAP / 2 },
  tile: { alignSelf: 'stretch', height: TILE_HEIGHT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
  tilePressed: { opacity: 0.8 },
  tileEmpty: { backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
});

const textStyles = (fs) => ({
  tabLabel: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(9, 10, 11), lineHeight: fs(12, 13, 14), fontFamily: 'Inter_500Medium', includeFontPadding: false },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontSize: fs(13), fontFamily: 'Inter_400Regular', color: TEXT },
  tileSymbol: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(11, 10, 12), lineHeight: fs(15, 13, 17), fontFamily: 'Inter_500Medium', includeFontPadding: false },
  tilePrice: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(10, 9, 11), lineHeight: fs(12, 11, 14), fontFamily: 'Inter_500Medium', includeFontPadding: false, fontVariant: ['tabular-nums'] },
  tileChange: { alignSelf: 'stretch', textAlign: 'center', fontSize: fs(9.5, 8.5, 10), lineHeight: fs(12, 11, 13), fontFamily: 'Inter_500Medium', includeFontPadding: false, fontVariant: ['tabular-nums'] },
  emptyText: { fontSize: fs(13), fontFamily: 'Inter_500Medium', color: SUBTLE, textAlign: 'center' },
});
