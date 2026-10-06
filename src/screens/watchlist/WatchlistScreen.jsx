import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Modal, Platform, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchIcon } from '@/components/icons/NavIcons';
import { SkeletonBar, SkeletonListRows, usePulse } from '@/components/skeleton/SkeletonBars';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { watchlistApi } from '@/utils/api';
import WatchlistSparkline from '@/components/watchlist/WatchlistSparkline';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';
const ACCENT = '#0071A9';

const TABS = [
  { key: 'futures', label: 'My Futures', load: watchlistApi.futures, profile: '/watchlist/futures-profile' },
  { key: 'options', label: 'My Options', load: watchlistApi.options, profile: '/watchlist/options-profile' },
  { key: 'industry', label: 'Industry', load: watchlistApi.industry, profile: '/watchlist/industry-profile' },
];

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
  return String(item?.script ?? '').toLowerCase().startsWith(q);
}

function PlusIcon({ size = 18, color = '#0F172A' }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size - 4, height: 1.8, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 1.8, height: size - 4, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

function MoreIcon({ size = 16, color = '#94A3B8' }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 2.5 }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
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
          <TextInput value={query} onChangeText={onQueryChange} placeholder="Search" placeholderTextColor="#94A3B8" autoCorrect={false} autoCapitalize="characters" style={styles.searchInput} />
        </View>
        <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add to Watchlist" style={[styles.addBtn, Platform.OS === 'web' ? styles.pointer : null]}>
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

function WatchlistRowSkeleton({ pulse }) {
  return (
    <View style={styles.row}>
      <View style={styles.symbolCol}>
        <SkeletonBar pulse={pulse} width="72%" height={12} />
        <SkeletonBar pulse={pulse} width={48} height={9} style={{ marginTop: 4 }} />
      </View>
      <SkeletonBar pulse={pulse} width={88} height={28} />
      <View style={styles.priceCol}>
        <SkeletonBar pulse={pulse} width={72} height={12} />
        <SkeletonBar pulse={pulse} width={56} height={9} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.moreBtn}>
        <SkeletonBar pulse={pulse} width={12} height={12} />
      </View>
    </View>
  );
}

const WatchlistRow = memo(function WatchlistRow({ item, onMore }) {
  const change = formatChange(item);
  const changeNum = parseSigned(item?.price_change_value) ?? parseSigned(item?.price_change);
  const changeColor = changeNum > 0 ? GREEN : changeNum < 0 ? RED : NEUTRAL;
  const expiry = formatExpiry(item.expiry_dt);

  return (
    <View style={styles.row}>
      <View style={styles.symbolCol}>
        <Text style={styles.script} numberOfLines={1}>{item.script || item.symbol || '—'}</Text>
        {expiry ? <Text style={styles.date} numberOfLines={1}>{expiry}</Text> : null}
      </View>
      <WatchlistSparkline id={item.id || item.script} graph={item.graph} change={changeNum} />
      <View style={styles.priceCol}>
        <Text style={styles.price} numberOfLines={1}>{formatPrice(item.price)}</Text>
        {change ? <Text style={[styles.change, { color: changeColor }]} numberOfLines={1}>{change}</Text> : null}
      </View>
      <Pressable onPress={() => onMore(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel="More" style={[styles.moreBtn, Platform.OS === 'web' ? styles.pointer : null]}>
        <MoreIcon />
      </Pressable>
    </View>
  );
});

export default function WatchlistScreen() {
  const snackbar = useSnackbar();
  const [tab, setTab] = useState('futures');
  const [query, setQuery] = useState('');
  const [lists, setLists] = useState({ futures: [], options: [], industry: [] });
  const [cdates, setCdates] = useState({ futures: '', options: '', industry: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const listsRef = useRef(lists);
  const genRef = useRef(0);
  listsRef.current = lists;
  const pulse = usePulse(loading);

  const load = useCallback(async (type, { silent = false } = {}) => {
    const spec = TABS.find((item) => item.key === type) ?? TABS[0];
    const gen = ++genRef.current;
    if (!silent) setLoading(true);
    setError(false);
    try {
      const payload = parseResult(await spec.load());
      if (gen !== genRef.current) return;
      setLists((prev) => ({ ...prev, [type]: payload.data }));
      setCdates((prev) => ({ ...prev, [type]: payload.cdate }));
    } catch (err) {
      if (gen !== genRef.current) return;
      setError(true);
      if (silent) snackbar.show(err.message);
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [snackbar.show]);

  useFocusEffect(useCallback(() => {
    load(tab, { silent: (listsRef.current[tab] ?? []).length > 0 });
  }, [load, tab]));
  useRegisterRefresh(useCallback(() => load(tab, { silent: true }), [load, tab]));

  const rows = lists[tab] ?? [];
  const visible = useMemo(() => (query.trim() ? rows.filter((item) => matchesQuery(item, query)) : rows), [rows, query]);
  const spec = TABS.find((item) => item.key === tab) ?? TABS[0];

  const openProfile = useCallback((item) => {
    setMenuItem(null);
    router.push({
      pathname: spec.profile,
      params: {
        id: item.id ?? '',
        script: item.script ?? '',
        symbol: item.symbol ?? '',
        expiry_dt: item.expiry_dt ?? '',
        price: String(item.price ?? ''),
        price_change: String(item.price_change ?? ''),
        price_change_value: String(item.price_change_value ?? ''),
        option_type: item.option_type ?? '',
        strike_pr: String(item.strike_pr ?? ''),
      },
    });
  }, [spec.profile]);

  const removeItem = useCallback(async (item) => {
    setMenuItem(null);
    if (!item?.id) { snackbar.show('Unable to remove this instrument.'); return; }
    try {
      await watchlistApi.remove(item.id);
      setLists((prev) => ({ ...prev, [tab]: (prev[tab] ?? []).filter((row) => row.id !== item.id) }));
    } catch (err) {
      snackbar.show(err.message);
    }
  }, [snackbar, tab]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <WatchlistHeader query={query} onQueryChange={setQuery} onAdd={() => router.push({ pathname: '/watchlist/add', params: { type: tab } })} />
      <WatchlistTabs active={tab} onChange={setTab} />
      {cdates[tab] ? <Text style={styles.cdate}>{cdates[tab]}</Text> : null}

      {loading ? (
        <View style={styles.list} accessibilityState={{ busy: true }}>
          <SkeletonListRows count={10} pulse={pulse} RowComponent={WatchlistRowSkeleton} />
        </View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.emptyText}>Failed to load watchlist. Please try again.</Text></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item, index) => String(item?.id ?? `${item?.script ?? 'row'}-${index}`)}
          renderItem={({ item }) => <WatchlistRow item={item} onMore={setMenuItem} />}
          style={styles.list}
          contentContainerStyle={visible.length === 0 ? styles.emptyList : styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>{query.trim() ? 'No matching instruments.' : 'No instruments in this watchlist.'}</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab, { silent: true }); }} tintColor={ACCENT} colors={[ACCENT]} />}
        />
      )}

      <Modal visible={!!menuItem} transparent animationType="fade" onRequestClose={() => setMenuItem(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuItem(null)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle} numberOfLines={1}>{menuItem?.script || 'Instrument'}</Text>
            <Pressable onPress={() => openProfile(menuItem)} style={[styles.menuItem, Platform.OS === 'web' ? styles.pointer : null]}><Text style={styles.menuItemText}>Go to Profile</Text></Pressable>
            <Pressable onPress={() => removeItem(menuItem)} style={[styles.menuItem, Platform.OS === 'web' ? styles.pointer : null]}><Text style={styles.menuDanger}>Remove from Watchlist</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 20, lineHeight: 26, fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.3 },
  headerActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginLeft: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 34, maxWidth: 168, flexGrow: 1, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 6, padding: 0, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#0F172A' },
  addBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  pointer: { cursor: 'pointer' },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabLabel: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#64748B' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold', color: ACCENT },
  tabIndicator: { height: 2, width: '72%', marginTop: 8, borderRadius: 1, backgroundColor: ACCENT },
  tabIndicatorSpacer: { height: 2, marginTop: 8 },
  cdate: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2, fontSize: 11, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  symbolCol: { flex: 1.15, paddingRight: 8 },
  script: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  date: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 2 },
  priceCol: { width: 104, alignItems: 'flex-end', paddingLeft: 8 },
  price: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  change: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 2 },
  moreBtn: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.28)', justifyContent: 'flex-end' },
  menuCard: { marginHorizontal: 12, marginBottom: 18, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 8 },
  menuTitle: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  menuItem: { paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuDanger: { fontSize: 15, fontFamily: 'Inter_500Medium', color: RED },
});
