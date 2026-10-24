import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Pressable, TextInput, FlatList, Platform, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchIcon } from '@/components/icons/NavIcons';
import { ListFilterIcon } from '@/components/icons/CommonIcons';
import { useCommonData } from '@/context/CommonDataContext';
import { SkeletonBar, SkeletonListRows, usePulse } from '@/components/skeleton/SkeletonBars';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { cdnApi, watchlistApi } from '@/utils/api';
import WatchlistSparkline from '@/components/watchlist/WatchlistSparkline';
import { socketRequest } from '@/utils/socket';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import BottomSlideOn from '@/components/BottomSlideOn';
import { LineGraph } from '@/components/LineGraph';
import AddWatchlistScreen from '@/screens/watchlist/AddWatchlistScreen';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';
const ACCENT = '#0071A9';
const LOGO_SIZE = 22;

const TABS = [
  { key: 'futures', label: 'My Futures', load: watchlistApi.futures, profile: '/watchlist/futures-profile' },
  { key: 'options', label: 'My Options', load: watchlistApi.options, profile: '/watchlist/options-profile' },
  { key: 'industry', label: 'Industry', profile: '/watchlist/industry-profile' },
];

const EMPTY_COPY = {
  futures: { title: 'Your futures watchlist is empty', body: 'Tap + to track a contract.', cta: 'Add Futures' },
  options: { title: 'Your options watchlist is empty', body: 'Tap + to track a strike.', cta: 'Add Options' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  return `${intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatPrice(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return '—';
  const [intPart, dec] = Math.abs(num).toFixed(2).split('.');
  return `${num < 0 ? '-' : ''}₹${groupDigits(intPart)}.${dec}`;
}

function parseSigned(val) {
  if (val == null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,()%\s]/g, ''));
  if (!Number.isFinite(num)) return null;
  if (typeof val === 'string' && val.includes('-') && num > 0) return -num;
  return num;
}

function formatChange(item) {
  const absNum = parseSigned(item?.price_change_value);
  const pctNum = parseSigned(item?.price_change);
  const pct = pctNum == null ? '' : `${pctNum > 0 ? '+' : pctNum < 0 ? '-' : ''}${Math.abs(pctNum).toFixed(2)}%`;
  if (absNum == null) return pct;
  const [intPart, dec] = Math.abs(absNum).toFixed(2).split('.');
  const body = `${absNum > 0 ? '+' : absNum < 0 ? '-' : ''}${groupDigits(intPart)}.${dec}`;
  return pct ? `${body} (${pct})` : body;
}

function formatExpiry(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str.includes('-')) return str;
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const day = parseInt(parts[0].length === 4 ? parts[2] : parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (!Number.isFinite(day) || monthIdx < 0 || monthIdx > 11) return str;
  return `${day} ${MONTHS[monthIdx]}`;
}

function parseResult(payload) {
  const result = payload?.result && typeof payload.result === 'object' ? payload.result : payload;
  return { cdate: result?.cdate ?? '', data: Array.isArray(result?.data) ? result.data : [] };
}

function matchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const symbol = String(item?.symbol ?? '').toLowerCase();
  const script = String(item?.script ?? '').toLowerCase();
  return symbol.startsWith(q) || script.startsWith(q);
}

function formatStrike(value) {
  if (value == null || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(num) || num === 0) return '';
  return Number.isInteger(num) ? String(num) : String(num);
}

function profileActionLabel(kind) {
  return kind === 'options' ? 'Option Profile' : 'Stock Profile';
}

function slideOnMeta(item, kind) {
  if (!item) return [];
  const expiry = formatExpiry(item.expiry_dt);
  if (kind === 'futures') return ['FUT', expiry].filter(Boolean);
  if (kind === 'options') {
    const strike = formatStrike(item.strike_pr);
    const type = String(item.option_type ?? '').trim().toUpperCase();
    const side = type && type !== 'XX' ? type : '';
    return [strike, side, expiry].filter(Boolean);
  }
  return expiry ? [expiry] : [];
}

function logoSymbol(item) {
  const symbol = String(item?.symbol ?? '').trim();
  if (symbol) return symbol;
  return String(item?.script ?? '').trim().split(/\s+/)[0] || '';
}

function PlusIcon({ size = 18, color = '#0F172A', weight = 1.8 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size - 4, height: weight, borderRadius: weight, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: weight, height: size - 4, borderRadius: weight, backgroundColor: color }} />
    </View>
  );
}

function EmptyWatchlist({ kind, onAdd }) {
  const copy = EMPTY_COPY[kind] ?? EMPTY_COPY.futures;
  return (
    <View style={emptyStyles.wrap}>
      <Pressable
        onPress={onAdd}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        style={({ pressed }) => [emptyStyles.ring, pressed ? emptyStyles.pressed : null, Platform.OS === 'web' ? styles.pointer : null]}
      >
        <View style={emptyStyles.halo}>
          <View style={emptyStyles.core}>
            <PlusIcon size={20} color="#FFFFFF" weight={2.4} />
          </View>
        </View>
      </Pressable>
      <Text style={emptyStyles.title}>{copy.title}</Text>
      <Text style={emptyStyles.body}>{copy.body}</Text>
    </View>
  );
}

function CloseIcon({ size = 14, color = '#94A3B8' }) {
  const bar = { position: 'absolute', width: size - 2, height: 1.6, borderRadius: 1, backgroundColor: color };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}


function WatchlistHeader({ query, onQueryChange, onAdd }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Watchlist</Text>
      <View style={styles.headerActions}>
        <View style={styles.searchBox}>
          <SearchIcon size={15} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search"
            placeholderTextColor="#94A3B8"
            autoCorrect={false}
            autoCapitalize="characters"
            style={[styles.searchInput, Platform.OS === 'web' ? styles.searchInputWeb : null]}
          />
        </View>
        <Pressable
          onPress={onAdd}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add to Watchlist"
          style={[styles.addBtn, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <PlusIcon />
        </Pressable>
      </View>
    </View>
  );
}

function WatchlistTabs({ active, onChange }) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.tab, Platform.OS === 'web' ? styles.pointer : null]}>
            <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}>{tab.label}</Text>
            {selected ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function WatchlistLogo({ symbol, title }) {
  const [failed, setFailed] = useState(false);
  const label = String(title || symbol || '').trim();
  if (!symbol || failed) {
    return (
      <View style={styles.logoFallback}>
        <Text style={styles.logoInitials} allowFontScaling={false}>{label.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: cdnApi(symbol) }}
      style={styles.logo}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={`${label} logo`}
    />
  );
}

function WatchlistRowSkeleton({ pulse }) {
  return (
    <View style={styles.row}>
      <View style={styles.symbolCol}>
        <SkeletonBar pulse={pulse} width={LOGO_SIZE} height={LOGO_SIZE} style={styles.logoSkeleton} />
        <View style={styles.symbolText}>
          <SkeletonBar pulse={pulse} width="72%" height={12} />
          <SkeletonBar pulse={pulse} width={48} height={9} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.graphSlot}>
        <SkeletonBar pulse={pulse} width={64} height={24} />
      </View>
      <View style={styles.priceWrap}>
        <View style={styles.priceCol}>
          <SkeletonBar pulse={pulse} width={72} height={12} />
          <SkeletonBar pulse={pulse} width={56} height={9} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.removeBtn}>
          <SkeletonBar pulse={pulse} width={12} height={12} />
        </View>
      </View>
    </View>
  );
}

function InstrumentMeta({ item, kind }) {
  const expiry = formatExpiry(item.expiry_dt);
  if (kind === 'futures') {
    return (
      <View style={styles.meta}>
        <Text style={styles.date}>FUT</Text>
        {expiry ? <Text style={styles.dateEnd} numberOfLines={1}>{expiry}</Text> : null}
      </View>
    );
  }
  if (kind === 'options') {
    const strike = formatStrike(item.strike_pr);
    const type = String(item.option_type ?? '').trim().toUpperCase();
    const side = type && type !== 'XX' ? type : '';
    if (!strike && !side && !expiry) return null;
    return (
      <View style={styles.meta}>
        {strike ? <Text style={styles.date}>{strike}</Text> : null}
        {side ? <Text style={styles.date}>{side}</Text> : null}
        {expiry ? <Text style={styles.dateEnd} numberOfLines={1}>{expiry}</Text> : null}
      </View>
    );
  }
  return expiry ? <Text style={styles.dateStacked} numberOfLines={1}>{expiry}</Text> : null;
}

// ─── Shared report body (used in both SlideOn metrics + desktop accordion) ──────
function buildReportMetrics(result, kind) {
  if (!result) return [];
  const isOption = kind === 'options';
  const rows = [];
  if (isOption && result.trigger_point != null && result.trigger_point !== '') rows.push({ label: 'TP', value: String(result.trigger_point) });
  if (result.wap != null && result.wap !== '') rows.push({ label: 'WAP', value: String(result.wap) });
  if (result.volume != null && result.volume !== '') rows.push({ label: 'Volume', value: String(result.volume) });
  const hasHigh = result.high != null && result.high !== '';
  const hasLow = result.low != null && result.low !== '';
  if (hasHigh || hasLow) rows.push({ label: "Today's High / Low", value: [hasLow ? result.low : '', hasHigh ? result.high : ''].filter(Boolean).join(' — ') });
  const has5H = result.high_5_days != null && result.high_5_days !== '';
  const has5L = result.low_5_days != null && result.low_5_days !== '';
  if (has5H || has5L) rows.push({ label: '5-Day High / Low', value: [has5L ? result.low_5_days : '', has5H ? result.high_5_days : ''].filter(Boolean).join(' — ') });
  if (result.oi != null && result.oi !== '') rows.push({ label: 'OI', value: String(result.oi) });
  if (result.chg_in_oi != null && result.chg_in_oi !== '') rows.push({ label: 'Change in OI', value: String(result.chg_in_oi) });
  return rows;
}

function mapGraphData(data5Days) {
  if (!Array.isArray(data5Days) || data5Days.length === 0) return [];
  return data5Days.map((pt) => ({ price: pt?.price, price_change: pt?.price_change, price_change_value: pt?.price_change_value, cdate: pt?.cdate, time: pt?.time }));
}

function ReportBody({ metrics, graphData, onAction, actionLabel }) {
  return (
    <View style={reportStyles.body}>
      {metrics.length > 0 ? (
        <View style={reportStyles.metrics}>
          {metrics.map((row) => (
            <View key={row.label} style={reportStyles.metricRow}>
              <Text style={reportStyles.metricLabel} numberOfLines={1}>{row.label}</Text>
              <Text style={reportStyles.metricValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {graphData.length > 1 ? <View style={reportStyles.graph}><LineGraph data={graphData} height={125} captureOnStart /></View> : null}
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} style={[reportStyles.action, Platform.OS === 'web' ? styles.pointer : null]}>
          <Text style={reportStyles.actionText} numberOfLines={1}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const reportStyles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  metrics: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', paddingTop: 12, paddingHorizontal: 10 },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  metricLabel: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_400Regular', color: '#334155' },
  metricValue: { flexShrink: 0, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right', fontVariant: ['tabular-nums'] },
  graph: { marginTop: 10 },
  action: { marginTop: 8, marginHorizontal: 16, height: 36, borderRadius: 8, backgroundColor: '#0071A9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  actionText: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});

const WatchlistRow = memo(function WatchlistRow({ item, kind, onRemove, onPress, onSymbolPress, isExpanded, reportState, isRemoving }) {
  const change = formatChange(item);
  const changeNum = parseSigned(item?.price_change_value) ?? parseSigned(item?.price_change);
  const changeColor = changeNum > 0 ? GREEN : changeNum < 0 ? RED : NEUTRAL;
  const symbol = logoSymbol(item);

  return (
    <View>
      <Pressable onPress={() => onPress?.(item)} disabled={isRemoving} style={[styles.row, Platform.OS === 'web' ? styles.pointer : null, isExpanded ? styles.rowExpanded : null, isRemoving ? styles.rowRemoving : null]}>
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onSymbolPress?.(item); }}
          disabled={!symbol || isRemoving}
          accessibilityRole="button"
          accessibilityLabel={kind === 'options' ? `Open ${symbol} option profile` : `Open ${symbol} profile`}
          style={[styles.symbolCol, kind === 'options' ? styles.symbolColOptions : null, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <WatchlistLogo key={symbol || 'logo'} symbol={symbol} title={symbol || item.script} />
          <View style={styles.symbolText}>
            <Text style={styles.script} numberOfLines={1}>{symbol || '—'}</Text>
            <InstrumentMeta item={item} kind={kind} />
          </View>
        </Pressable>
        <View style={styles.graphSlot}>
          <WatchlistSparkline id={item.id || item.script} graph={item.graph} change={changeNum} />
        </View>
        <View style={[styles.priceWrap, kind === 'options' ? styles.priceWrapOptions : null]}>
          <View style={styles.priceCol}>
            <Text style={styles.price} numberOfLines={1}>{formatPrice(item.price)}</Text>
            {change ? <Text style={[styles.change, { color: changeColor }]} numberOfLines={1}>{change}</Text> : null}
          </View>
          {kind === 'industry' ? null : isRemoving ? (
            <View style={styles.removeBtn}><ActivityIndicator size="small" color="#94A3B8" /></View>
          ) : (
            <Pressable onPress={(e) => { e.stopPropagation?.(); onRemove(item); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove from watchlist" style={[styles.removeBtn, Platform.OS === 'web' ? styles.pointer : null]}>
              <CloseIcon />
            </Pressable>
          )}
        </View>
      </Pressable>
      {isExpanded && reportState ? (
        reportState.loading ? (
          <View style={reportStyles.body}><ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 16 }} /></View>
        ) : reportState.error ? (
          <View style={reportStyles.body}><Text style={styles.emptyText}>Failed to load report.</Text></View>
        ) : reportState.result ? (
          <ReportBody metrics={reportState.metrics} graphData={reportState.graphData} actionLabel={profileActionLabel(kind)} onAction={reportState.onProfile} />
        ) : null
      ) : null}
    </View>
  );
});

function itemKey(item, kind) {
  return `${kind}:${item?.id ?? ''}:${item?.symbol ?? ''}:${item?.strike_pr ?? ''}:${item?.option_type ?? ''}:${item?.expiry_dt ?? ''}`;
}

function buildSocketPayload(item, kind) {
  const symbol = String(item?.symbol ?? '').trim();
  const expiry_dt = String(item?.expiry_dt ?? '').trim();
  const option_type = kind === 'options' ? String(item?.option_type ?? 'XX').trim() : 'XX';
  const strike_pr = kind === 'options' ? (parseFloat(String(item?.strike_pr ?? '0').replace(/,/g, '')) || 0) : 0;
  return { symbol, expiry_dt, option_type, strike_pr };
}

export default function WatchlistScreen({ isSidebar = false }) {
  const snackbar = useSnackbar();
  const { isLaptop } = useBreakpoint();
  const isDesktopSidebar = isSidebar && isLaptop;
  const [tab, setTab] = useState('futures');
  const [query, setQuery] = useState('');
  const [lists, setLists] = useState({ futures: [], options: [], industry: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  // Report state
  const [expandedKey, setExpandedKey] = useState(null);
  const expandedKeyRef = useRef(expandedKey);
  expandedKeyRef.current = expandedKey;
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportItem, setReportItem] = useState(null);
  const [slideOnVisible, setSlideOnVisible] = useState(false);
  const [addingType, setAddingType] = useState(null);
  const { industries, nearExpiry, strikePricesAndPrices } = useCommonData();
  const [industryId, setIndustryId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMenuTop, setFilterMenuTop] = useState(0);
  const filterOpenRef = useRef(false);
  filterOpenRef.current = filterOpen;
  const filterTriggerRef = useRef(null);
  const filterMenuRef = useRef(null);
  const filterRectsRef = useRef({ trigger: null, menu: null });
  const reportGenRef = useRef(0);
  const removingRef = useRef(new Set());
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const listsRef = useRef(lists);
  const genRef = useRef(0);
  const tabRef = useRef(tab);
  listsRef.current = lists;
  tabRef.current = tab;
  const industryReady = Object.keys(strikePricesAndPrices ?? {}).length > 0;
  const showLoading = tab === 'industry' ? !industryReady : loading;
  const pulse = usePulse(showLoading);
  const load = useCallback(async (type, { silent = false } = {}) => {
    const spec = TABS.find((item) => item.key === type) ?? TABS[0];
    const gen = ++genRef.current;
    if (type === 'industry') { setError(false); setLoading(false); setRefreshing(false); return; }
    if (!silent) setLoading(true);
    setError(false);
    try {
      const payload = parseResult(await spec.load());
      if (gen !== genRef.current) return;
      setLists((prev) => ({ ...prev, [type]: payload.data }));
    } catch (err) {
      if (gen !== genRef.current) return;
      setError(true);
      if (silent) snackbar.show(err.message);
    } finally {
      if (gen === genRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [snackbar.show]);

  // A silent refresh on focus waits out the pop animation so the list doesn't re-render mid-transition.
  useFocusEffect(useCallback(() => {
    if ((listsRef.current[tab] ?? []).length === 0) { load(tab); return undefined; }
    const timer = setTimeout(() => load(tab, { silent: true }), 400);
    return () => clearTimeout(timer);
  }, [load, tab]));
  useRegisterRefresh(useCallback(() => load(tab, { silent: true }), [load, tab]));

  // Collapse accordion on tab change
  useEffect(() => { setExpandedKey(null); setReportResult(null); setReportItem(null); setFilterOpen(false); }, [tab]);

  const industryOptions = useMemo(() => {
    const list = [{ id: null, label: 'All Industries' }];
    if (Array.isArray(industries)) industries.forEach((ind) => { if (ind?.industry) list.push({ id: ind.id, label: ind.industry }); });
    return list;
  }, [industries]);
  const selectedIndustry = industryOptions.find((opt) => opt.id === industryId) || industryOptions[0];

  const industrySet = useMemo(() => {
    if (industryId == null || !Array.isArray(industries)) return null;
    const ind = industries.find((i) => i.id === industryId);
    if (!ind || !Array.isArray(ind.symbols)) return null;
    return new Set(ind.symbols.map((s) => String(s).trim().toUpperCase()));
  }, [industryId, industries]);

  const allIndustryRows = useMemo(() => Object.entries(strikePricesAndPrices ?? {}).map(([symbol, info]) => ({
    id: symbol,
    symbol,
    script: symbol,
    price: info?.price,
    price_change: info?.price_change,
    graph: info?.graph,
    expiry_dt: nearExpiry,
  })).sort((a, b) => a.symbol.localeCompare(b.symbol)), [strikePricesAndPrices, nearExpiry]);

  const industryRows = useMemo(() => (
    industrySet ? allIndustryRows.filter((item) => industrySet.has(item.symbol.trim().toUpperCase())) : allIndustryRows
  ), [allIndustryRows, industrySet]);

  const toggleFilter = useCallback(() => {
    if (filterOpenRef.current) { setFilterOpen(false); return; }
    filterTriggerRef.current?.measureInWindow((x, y, w, h) => {
      filterRectsRef.current.trigger = { x, y, w, h };
      setFilterOpen(true);
    });
  }, []);

  const measureFilterMenu = useCallback(() => {
    filterMenuRef.current?.measureInWindow((x, y, w, h) => { filterRectsRef.current.menu = { x, y, w, h }; });
  }, []);

  // While the menu is open, the root claims any outside touch so it only closes the menu and never reaches the row below.
  const handleRootTouchCapture = useCallback((e) => {
    if (!filterOpenRef.current) return false;
    const { pageX, pageY } = e.nativeEvent;
    const { trigger, menu } = filterRectsRef.current;
    const inside = [trigger, menu].some((r) => r && pageX >= r.x && pageX <= r.x + r.w && pageY >= r.y && pageY <= r.y + r.h);
    if (inside) return false;
    setFilterOpen(false);
    return true;
  }, []);

  const rows = tab === 'industry' ? industryRows : (lists[tab] ?? []);
  const filtered = useMemo(() => (query.trim() ? rows.filter((item) => matchesQuery(item, query)) : rows), [rows, query]);

  const visible = useMemo(() => {
    if (!sortField) return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortField === 'symbol') {
        const sa = String(a.symbol || a.script || '').toLowerCase();
        const sb = String(b.symbol || b.script || '').toLowerCase();
        return sortOrder === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      if (sortField === 'price') {
        const pa = parseSigned(a.price) ?? 0;
        const pb = parseSigned(b.price) ?? 0;
        return sortOrder === 'asc' ? pa - pb : pb - pa;
      }
      return 0;
    });
    return sorted;
  }, [filtered, sortField, sortOrder]);

  const toggleSort = useCallback((field) => {
    if (sortField !== field) { setSortField(field); setSortOrder('asc'); }
    else if (sortOrder === 'asc') setSortOrder('desc');
    else { setSortField(null); setSortOrder('asc'); }
  }, [sortField, sortOrder]);

  const spec = TABS.find((item) => item.key === tab) ?? TABS[0];

  const openProfile = useCallback((item) => {
    router.push({
      pathname: spec.profile,
      params: {
        id: item.id ?? '', script: item.script ?? '', symbol: item.symbol ?? '',
        expiry_dt: item.expiry_dt ?? '', price: String(item.price ?? ''),
        price_change: String(item.price_change ?? ''), price_change_value: String(item.price_change_value ?? ''),
        option_type: item.option_type ?? '', strike_pr: String(item.strike_pr ?? ''),
      },
    });
  }, [spec.profile]);

  const removeItem = useCallback(async (item) => {
    const kind = tab;
    if (kind === 'industry') return;
    if (!item?.id) { snackbar.show('Unable to remove this instrument.'); return; }
    if (removingRef.current.has(item.id)) return;
    removingRef.current.add(item.id);
    setRemovingIds(new Set(removingRef.current));
    try {
      await (kind === 'options' ? watchlistApi.removeOption(item.id) : watchlistApi.removeFuture(item.id));
      setLists((prev) => ({ ...prev, [kind]: (prev[kind] ?? []).filter((row) => row.id !== item.id) }));
      if (itemKey(item, kind) === expandedKeyRef.current) {
        setExpandedKey(null);
        setReportResult(null);
        setReportItem(null);
      }
      // Refreshing a tab the user already left would invalidate that tab's in-flight load.
      if (tabRef.current === kind) load(kind, { silent: true });
    } catch (err) {
      snackbar.show(err.message);
    } finally {
      removingRef.current.delete(item.id);
      setRemovingIds(new Set(removingRef.current));
    }
  }, [snackbar.show, tab, load]);

  // ─── Report fetch ──────────────────────────────────────────────────────────
  const fetchReport = useCallback(async (item, kind) => {
    const gen = ++reportGenRef.current;
    setReportLoading(true);
    setReportError(false);
    setReportResult(null);
    setReportItem(item);
    try {
      const result = await socketRequest('GET_WATCHLIST_REPORT_DATA', buildSocketPayload(item, kind));
      if (gen !== reportGenRef.current) return;
      setReportResult(result ?? null);
    } catch {
      if (gen !== reportGenRef.current) return;
      setReportError(true);
    } finally {
      if (gen === reportGenRef.current) setReportLoading(false);
    }
  }, []);

  const handleRowPress = useCallback((item) => {
    const key = itemKey(item, tab);
    if (isDesktopSidebar) {
      if (expandedKeyRef.current === key) { setExpandedKey(null); setReportResult(null); setReportItem(null); return; }
      setExpandedKey(key);
      fetchReport(item, tab);
    } else {
      setExpandedKey(null);
      setReportItem(item);
      setSlideOnVisible(true);
      fetchReport(item, tab);
    }
  }, [tab, isDesktopSidebar, fetchReport]);

  const closeSlideOn = useCallback(() => setSlideOnVisible(false), []);
  const clearSlideOn = useCallback(() => { setReportResult(null); setReportItem(null); }, []);

  // ─── SlideOn props for mobile ──────────────────────────────────────────────
  const slideOnMetrics = useMemo(() => buildReportMetrics(reportResult, tab), [reportResult, tab]);
  const slideOnGraph = useMemo(() => mapGraphData(reportResult?.data_5_days), [reportResult]);
  const slideOnTitle = useMemo(() => (reportItem ? logoSymbol(reportItem) : ''), [reportItem]);
  const slideOnMetaParts = useMemo(() => slideOnMeta(reportItem, tab), [reportItem, tab]);
  const slideOnPrice = reportResult?.price != null ? formatPrice(reportResult.price) : (reportItem ? formatPrice(reportItem.price) : '');
  const slideOnChangeNum = parseSigned(reportResult?.price_change) ?? parseSigned(reportItem?.price_change);
  const slideOnChange = reportResult?.price_change != null ? `${slideOnChangeNum > 0 ? '+' : slideOnChangeNum < 0 ? '-' : ''}${Math.abs(slideOnChangeNum ?? 0).toFixed(2)}%` : formatChange(reportItem);
  const slideOnPositive = slideOnChangeNum != null ? slideOnChangeNum > 0 : null;
  const slideOnProfileAction = useCallback(() => { closeSlideOn(); if (reportItem) openProfile(reportItem); }, [closeSlideOn, reportItem, openProfile]);

  // ─── Desktop accordion report state for each row ─────────────────────────
  const getReportState = useCallback((item) => {
    const key = itemKey(item, tab);
    if (expandedKey !== key) return null;
    return {
      loading: reportLoading,
      error: reportError,
      result: reportResult,
      metrics: buildReportMetrics(reportResult, tab),
      graphData: mapGraphData(reportResult?.data_5_days),
      onProfile: () => openProfile(item),
    };
  }, [expandedKey, tab, reportLoading, reportError, reportResult, openProfile]);

  const openAdd = useCallback(() => {
    const type = tab === 'options' ? 'options' : 'futures';
    if (isDesktopSidebar) { setFilterOpen(false); setAddingType(type); return; }
    router.push({ pathname: '/watchlist/add', params: { type } });
  }, [isDesktopSidebar, tab]);

  const listExtra = useMemo(() => ({ expandedKey, removingIds }), [expandedKey, removingIds]);
  const hasQuery = query.trim().length > 0;

  const closeAdd = useCallback(({ added } = {}) => {
    const type = addingType;
    setAddingType(null);
    if (added && type) load(type, { silent: (listsRef.current[type] ?? []).length > 0 });
  }, [addingType, load]);

  const ContainerComponent = isSidebar ? View : SafeAreaView;
  const containerProps = isSidebar ? { style: styles.sidebarRoot } : { style: styles.root, edges: ['top'] };

  if (isDesktopSidebar && addingType) {
    return (
      <View style={styles.sidebarRoot}>
        <AddWatchlistScreen embedded type={addingType} onClose={closeAdd} />
      </View>
    );
  }

  return (
    <ContainerComponent {...containerProps} onStartShouldSetResponderCapture={handleRootTouchCapture}>
      <WatchlistHeader
        query={query}
        onQueryChange={setQuery}
        onAdd={openAdd}
      />
      <WatchlistTabs active={tab} onChange={setTab} />

      {tab === 'industry' ? (
        <View style={styles.filterRow} onLayout={(e) => setFilterMenuTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Pressable
            ref={filterTriggerRef}
            onPress={toggleFilter}
            accessibilityRole="button"
            accessibilityLabel="Filter by Industry"
            accessibilityState={{ expanded: filterOpen }}
            style={[styles.filterBtn, filterOpen ? styles.filterBtnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}
          >
            <ListFilterIcon size={16} color={ACCENT} />
            <Text style={styles.filterText} numberOfLines={1}>{selectedIndustry.label}</Text>
            <Text style={styles.filterCaret}>{filterOpen ? '▴' : '▾'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tableHeaderRow}>
        <Pressable
          onPress={() => toggleSort('symbol')}
          style={[styles.symbolCol, tab === 'options' ? styles.symbolColOptions : null, styles.symbolHeader, Platform.OS === 'web' ? styles.pointer : null]}
          accessibilityRole="button"
          accessibilityLabel="Sort by Symbol"
        >
          <Text style={[styles.tableHeaderText, sortField === 'symbol' && styles.tableHeaderTextActive]}>Symbol</Text>
        </Pressable>
        <View style={styles.graphSlot} />
        <Pressable
          onPress={() => toggleSort('price')}
          style={[styles.priceWrap, tab === 'options' ? styles.priceWrapOptions : null, Platform.OS === 'web' ? styles.pointer : null]}
          accessibilityRole="button"
          accessibilityLabel="Sort by CMP"
        >
          <Text style={[styles.tableHeaderText, sortField === 'price' && styles.tableHeaderTextActive]}>CMP</Text>
          {tab !== 'industry' ? <View style={styles.headerRemoveSpacer} /> : null}
        </Pressable>
      </View>

      {showLoading ? (
        <View style={styles.list} accessibilityState={{ busy: true }}>
          <SkeletonListRows count={10} pulse={pulse} RowComponent={WatchlistRowSkeleton} />
        </View>
      ) : error && tab !== 'industry' ? (
        <View style={styles.center}><Text style={styles.emptyText}>Failed to load watchlist. Please try again.</Text></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item, index) => String(item?.id ?? `${item?.script ?? 'row'}-${index}`)}
          renderItem={({ item }) => {
            const key = itemKey(item, tab);
            return <WatchlistRow item={item} kind={tab} onRemove={removeItem} onPress={handleRowPress} onSymbolPress={openProfile} isExpanded={isDesktopSidebar && expandedKey === key} reportState={isDesktopSidebar ? getReportState(item) : null} isRemoving={removingIds.has(item?.id)} />;
          }}
          extraData={listExtra}
          style={styles.list}
          contentContainerStyle={visible.length === 0 ? styles.emptyList : styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={hasQuery || tab === 'industry' ? (
            <View style={styles.center}><Text style={styles.emptyText}>{hasQuery ? 'No matching instruments.' : 'No instruments in this industry.'}</Text></View>
          ) : (
            <EmptyWatchlist kind={tab} onAdd={openAdd} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab, { silent: true }); }} tintColor={ACCENT} colors={[ACCENT]} />}
        />
      )}

      {/* Mobile SlideOn */}
      {!isDesktopSidebar ? (
        <BottomSlideOn
          visible={slideOnVisible}
          onClose={closeSlideOn}
          onDismissed={clearSlideOn}
          isWatchlist
          logo={reportItem ? cdnApi(logoSymbol(reportItem)) : null}
          title={slideOnTitle}
          meta={slideOnMetaParts}
          price={slideOnPrice}
          change={slideOnChange}
          changePct={null}
          positive={slideOnPositive}
          metrics={reportLoading ? [] : slideOnMetrics}
          graph={reportLoading ? null : slideOnGraph.length > 1 ? <LineGraph data={slideOnGraph} height={125} captureOnStart /> : null}
          actionLabel={reportLoading ? null : profileActionLabel(tab)}
          onAction={slideOnProfileAction}
        />
      ) : null}

      {tab === 'industry' && filterOpen ? (
        <View ref={filterMenuRef} onLayout={measureFilterMenu} style={[styles.filterMenu, { top: filterMenuTop + 4 }]}>
          <FlatList
            data={industryOptions}
            keyExtractor={(opt, index) => `${opt.id ?? 'all'}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: opt }) => {
              const active = opt.id === industryId;
              return (
                <Pressable
                  onPress={() => { setFilterOpen(false); setIndustryId(opt.id); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterItem, active ? styles.filterItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}
                >
                  <Text style={[styles.filterItemText, active ? styles.filterItemTextActive : null]} numberOfLines={1}>{opt.label}</Text>
                </Pressable>
              );
            }}
            style={styles.filterList}
          />
        </View>
      ) : null}

      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  sidebarRoot: { flex: 1, backgroundColor: '#FFFFFF', height: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 12 },
  title: { flexShrink: 0, fontSize: 20, lineHeight: 26, fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.3 },
  headerActions: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, minWidth: 0, marginLeft: 6, padding: 0, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#0F172A', borderWidth: 0 },
  searchInputWeb: { outlineStyle: 'none', outlineWidth: 0 },
  addBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },

  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  symbolHeader: { paddingLeft: LOGO_SIZE + 14 },
  headerRemoveSpacer: { width: 24, marginLeft: 4 },
  tableHeaderText: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_500Medium', color: '#64748B' },
  tableHeaderTextActive: { color: ACCENT, fontFamily: 'Inter_600SemiBold' },

  filterRow: { alignItems: 'center', paddingTop: 12 },
  filterBtn: { width: '80%', height: 40, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  filterBtnOpen: { borderColor: '#CBD5E1', backgroundColor: '#F1F5F9' },
  filterText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  filterCaret: { fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#64748B' },
  filterMenu: { position: 'absolute', left: '10%', width: '80%', zIndex: 20, elevation: 6, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  filterList: { maxHeight: 300 },
  filterItem: { paddingHorizontal: 16, paddingVertical: 13 },
  filterItemActive: { backgroundColor: '#F8FAFC' },
  filterItemText: { fontSize: 12.5, lineHeight: 17, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  filterItemTextActive: { color: ACCENT, fontFamily: 'Inter_600SemiBold' },

  pointer: { cursor: 'pointer' },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabLabel: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#64748B' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold', color: ACCENT },
  tabIndicator: { height: 2, width: '72%', marginTop: 10, borderRadius: 1, backgroundColor: ACCENT },
  tabIndicatorSpacer: { height: 2, marginTop: 10 },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  rowExpanded: { backgroundColor: '#F8FAFC', borderBottomWidth: 0 },
  rowRemoving: { opacity: 0.5 },
  symbolCol: { flex: 1.3, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingRight: 12, gap: 14 },
  symbolColOptions: { flex: 1.5 },
  symbolText: { flex: 1, minWidth: 0 },
  graphSlot: { width: 72, alignItems: 'center', justifyContent: 'center' },
  priceWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: 12 },
  priceWrapOptions: { flex: 0.9, paddingLeft: 8 },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoFallback: { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  logoInitials: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: '#64748B' },
  logoSkeleton: { borderRadius: 5 },
  script: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, maxWidth: '100%' },
  date: { flexShrink: 0, fontSize: 11, lineHeight: 15, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  dateEnd: { flexShrink: 1, fontSize: 11, lineHeight: 15, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  dateStacked: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 1 },
  priceCol: { flexShrink: 1, minWidth: 0, alignItems: 'flex-end' },
  price: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  change: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 1 },
  removeBtn: { width: 24, height: 32, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 4 },
});

const emptyStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 24, paddingBottom: 48 },
  ring: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0, 113, 169, 0.28)' },
  halo: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 113, 169, 0.08)' },
  core: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_600SemiBold', color: '#0F172A', letterSpacing: -0.1, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 12.5, lineHeight: 17, fontFamily: 'Inter_400Regular', color: '#64748B', textAlign: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
});
