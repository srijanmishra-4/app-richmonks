import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import { useExpiryOptions } from '@/components/ExpiryDropdownComponent';
import { ChevronIcon } from '@/components/icons/CommonIcons';
import SymbolLogo from '@/components/SymbolLogo';
import { useCommonData } from '@/context/CommonDataContext';

const MUTED = '#64748B';
const TEXT = '#0F172A';
const BORDER = '#E2E8F0';
const ACCENT = '#0071A9';
const ROW = 48;
const SLIDE_MS = 280;
const WEEKLY_SYMBOLS = new Set(['NIFTY']);
const MENU_ITEM_H = 36;
const MENU_PAD = 4;
const MENU_MAX_H = MENU_ITEM_H * 7 + MENU_PAD * 2;

function toNumber(val) {
  if (val == null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,()%\s]/g, ''));
  return Number.isFinite(num) ? num : null;
}

// Same default as Add Watchlist → Options: nearest listed strike to the live price.
function nearestStrike(strikes, price) {
  if (!strikes.length) return null;
  const target = toNumber(price);
  if (target == null) return strikes[0];
  return strikes.reduce((best, strike) => (Math.abs(Number(strike) - target) < Math.abs(Number(best) - target) ? strike : best), strikes[0]);
}

function formatStrike(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value ?? '');
}

function strikeParam(value) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(num) ? String(num) : String(value ?? '');
}

// Nifty is the only symbol with weekly expiries. Every other option is monthly.
function optionPeriod(symbol, expiryState) {
  if (String(symbol).toUpperCase() === 'NIFTY' && String(expiryState ?? '').startsWith('weekly')) return 'weekly';
  return 'monthly';
}

function filterSymbols(map, query) {
  const source = map && typeof map === 'object' ? map : {};
  const names = Object.keys(source).filter((name) => name && source[name] && typeof source[name] === 'object').sort((a, b) => a.localeCompare(b));
  const q = String(query ?? '').trim().toLowerCase();
  return q ? names.filter((name) => name.toLowerCase().includes(q)) : names;
}

function validExpiries(options) {
  return (Array.isArray(options) ? options : []).filter((item) => item?.value && item?.label);
}

function pushOptions(rows, symbol, expiries, kind, strikes, price) {
  const list = Array.isArray(strikes) ? strikes : [];
  const strike = nearestStrike(list, price);
  if (strike == null) return;
  expiries.forEach((expiry) => {
    rows.push({
      key: `${symbol}|${expiry.value}|${kind}`,
      symbol,
      expiry: expiry.value,
      expiryLabel: expiry.label,
      kind,
      strikes: list,
      defaultStrike: strike,
    });
  });
}

function buildInstruments(symbol, info, monthlyExpiry, weeklyExpiry) {
  if (!symbol || !info || typeof info !== 'object') return [];
  const futures = validExpiries(monthlyExpiry);
  const options = validExpiries(WEEKLY_SYMBOLS.has(symbol) ? weeklyExpiry : monthlyExpiry);
  const rows = [];
  futures.forEach((expiry) => {
    rows.push({ key: `${symbol}|${expiry.value}|FUT`, symbol, expiry: expiry.value, expiryLabel: expiry.label, kind: 'FUT' });
  });
  pushOptions(rows, symbol, options, 'CE', info.CE, info.price);
  pushOptions(rows, symbol, options, 'PE', info.PE, info.price);
  return rows;
}

export function useFnoSearch() {
  const { strikePricesAndPrices, allExpiryDates, nearExpiry, nextExpiry } = useCommonData();
  const monthlyRaw = useExpiryOptions(false);
  const weeklyRaw = useExpiryOptions(true);
  const expiryReady = (Array.isArray(allExpiryDates) && allExpiryDates.length > 0) || !!nearExpiry || !!nextExpiry;
  const monthlyExpiry = expiryReady ? monthlyRaw : [];
  const weeklyExpiry = expiryReady ? weeklyRaw : [];
  const progress = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('symbols');
  const [symbol, setSymbol] = useState(null);
  const [strikes, setStrikes] = useState({});

  const matches = useMemo(() => filterSymbols(strikePricesAndPrices, query), [strikePricesAndPrices, query]);
  const instruments = useMemo(
    () => buildInstruments(symbol, strikePricesAndPrices?.[symbol], monthlyExpiry, weeklyExpiry),
    [symbol, strikePricesAndPrices, monthlyExpiry, weeklyExpiry],
  );

  const animateTo = useCallback((to) => {
    progress.stopAnimation();
    Animated.timing(progress, { toValue: to, duration: SLIDE_MS, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [progress]);

  const onQueryChange = useCallback((text) => {
    progress.stopAnimation();
    progress.setValue(0);
    setQuery(text);
    setSymbol(null);
    setStrikes({});
    setStage('symbols');
  }, [progress]);

  const selectSymbol = useCallback((next) => {
    setSymbol(next);
    setStrikes({});
    setStage('instruments');
    animateTo(1);
  }, [animateTo]);

  const backToSymbols = useCallback(() => {
    setStage('symbols');
    animateTo(0);
  }, [animateTo]);

  const setStrike = useCallback((key, value) => {
    setStrikes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const strikeFor = useCallback((row) => {
    const chosen = strikes[row.key];
    if (chosen != null && Array.isArray(row.strikes) && row.strikes.some((item) => String(item) === String(chosen))) return chosen;
    return row.defaultStrike;
  }, [strikes]);

  const reset = useCallback(() => {
    progress.stopAnimation();
    progress.setValue(0);
    setQuery('');
    setSymbol(null);
    setStrikes({});
    setStage('symbols');
  }, [progress]);

  return { query, onQueryChange, stage, symbol, matches, instruments, selectSymbol, backToSymbols, setStrike, strikeFor, strikes, progress, reset };
}

function EmptyNote({ text }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;
}

const SymbolRow = memo(function SymbolRow({ symbol, onPress }) {
  return (
    <Pressable onPress={() => onPress(symbol)} accessibilityRole="button" accessibilityLabel={symbol} style={[styles.row, webPointer]}>
      <SymbolLogo symbol={symbol} />
      <Text style={styles.symbol} numberOfLines={1}>{symbol}</Text>
      <ChevronIcon size={16} color="#94A3B8" direction="right" />
    </Pressable>
  );
});

const InstrumentRow = memo(function InstrumentRow({ row, strike, onOpen, onStrike }) {
  const isOption = row.kind === 'CE' || row.kind === 'PE';
  const expiry = String(row.expiryLabel || '').toUpperCase();
  const open = () => onOpen(row);
  return (
    <View style={styles.instrumentRow}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${row.symbol} ${expiry} ${row.kind}`}
        style={[styles.lead, webPointer]}
      >
        <SymbolLogo symbol={row.symbol} />
        <Text style={styles.line} numberOfLines={1}>
          <Text style={styles.name}>{row.symbol}</Text>
          <Text>{` ${expiry} ${row.kind}`}</Text>
        </Text>
      </Pressable>
      {isOption ? (
        <Pressable
          onPress={(event) => onStrike(row, event)}
          accessibilityRole="button"
          accessibilityLabel={`Strike ${formatStrike(strike)}`}
          hitSlop={{ top: 10, bottom: 10, left: 2, right: 8 }}
          style={[styles.strike, webPointer]}
        >
          <View style={styles.strikeMark}>
            <Text style={styles.strikeText}>{formatStrike(strike)}</Text>
            <View style={styles.strikeUnderline} />
          </View>
          <ChevronIcon size={14} color="#94A3B8" direction="down" />
        </Pressable>
      ) : null}
      <Pressable onPress={open} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tail, webPointer]}>
        <ChevronIcon size={16} color="#94A3B8" direction="right" />
      </Pressable>
    </View>
  );
});

function StrikeMenu({ menu, layout, onClose, onSelect, onArm }) {
  return (
    <Modal visible={!!menu} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.menuRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {menu && layout ? (
          <View style={[styles.menu, { left: layout.left, top: layout.top, width: layout.width, height: layout.height }]}>
            <FlatList
              data={menu.strikes}
              keyExtractor={(item, index) => `${item}-${index}`}
              getItemLayout={(_, index) => ({ length: MENU_ITEM_H, offset: MENU_PAD + MENU_ITEM_H * index, index })}
              initialScrollIndex={layout.scrollable ? Math.max(0, layout.index - 2) : 0}
              scrollEnabled={layout.scrollable}
              showsVerticalScrollIndicator={layout.scrollable}
              style={layout.scrollable ? null : styles.menuFixed}
              contentContainerStyle={styles.menuContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = String(item) === String(menu.value);
                return (
                  <Pressable onPressIn={onArm} onPress={() => onSelect(item)} style={[styles.menuItem, active ? styles.menuItemActive : null, webPointer]}>
                    <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>{formatStrike(item)}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function FnoSearchPanel({ search, variant = 'screen', maxHeight = 440 }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [panelWidth, setPanelWidth] = useState(0);
  const [menu, setMenu] = useState(null);
  const blockOpen = useRef(false);
  const blockTimer = useRef(null);
  const travel = panelWidth > 0 ? panelWidth : 4000;
  // Forward moves left: the instrument list enters from the right. Back moves right.
  const symbolsX = useMemo(() => search.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }), [search.progress, travel]);
  const instrumentsX = useMemo(() => search.progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }), [search.progress, travel]);
  // A few extra pixels cover the list's bottom padding so a short list does not grow a scrollbar.
  const symbolHeight = (search.matches.length === 0 ? 72 : search.matches.length * ROW) + 8;
  const instrumentHeight = (Math.max(search.instruments.length, 1) + 1) * ROW + 8;
  const bodyHeight = Math.min(maxHeight, search.stage === 'instruments' ? instrumentHeight : symbolHeight);

  const holdNavigation = useCallback((ms = 400) => {
    blockOpen.current = true;
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => { blockOpen.current = false; }, ms);
  }, []);

  useEffect(() => () => { if (blockTimer.current) clearTimeout(blockTimer.current); }, []);

  useEffect(() => { if (search.stage !== 'instruments') setMenu(null); }, [search.stage]);

  const onLayout = useCallback((event) => {
    const next = event.nativeEvent.layout.width;
    setPanelWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
  }, []);

  const openInstrument = useCallback((row) => {
    if (blockOpen.current || !row?.symbol) return;
    const symbol = row.symbol;
    const expiry = row.expiry;
    if (row.kind === 'FUT') {
      router.push({ pathname: '/home/profile/futures', params: { symbol, expiry } });
      return;
    }
    router.push({
      pathname: '/home/profile/options',
      params: {
        symbol,
        strike_pr: strikeParam(search.strikeFor(row)),
        option_type: row.kind,
        expiry,
        period: optionPeriod(symbol, expiry),
      },
    });
  }, [search.strikeFor]);

  const openStrikeMenu = useCallback((row, event) => {
    holdNavigation();
    const point = event?.nativeEvent ?? {};
    setMenu({
      key: row.key,
      strikes: row.strikes,
      value: search.strikeFor(row),
      x: point.pageX ?? point.clientX ?? 0,
      y: point.pageY ?? point.clientY ?? 0,
    });
  }, [holdNavigation, search.strikeFor]);

  const closeMenu = useCallback(() => {
    holdNavigation();
    setMenu(null);
  }, [holdNavigation]);

  const selectStrike = useCallback((value) => {
    holdNavigation();
    if (menu?.key) search.setStrike(menu.key, value);
    setMenu(null);
  }, [holdNavigation, menu, search.setStrike]);

  const menuLayout = useMemo(() => {
    if (!menu) return null;
    const menuWidth = 104;
    const contentHeight = menu.strikes.length * MENU_ITEM_H + MENU_PAD * 2;
    const height = Math.min(Math.max(contentHeight, MENU_ITEM_H), MENU_MAX_H);
    const left = Math.max(8, Math.min((menu.x || 0) - menuWidth / 2, windowWidth - menuWidth - 8));
    let top = (menu.y || 0) + 14;
    if (top + height > windowHeight - 8) top = Math.max(8, (menu.y || 0) - height - 10);
    const index = Math.max(0, menu.strikes.findIndex((item) => String(item) === String(menu.value)));
    return { left, top, width: menuWidth, height, index, scrollable: contentHeight > MENU_MAX_H };
  }, [menu, windowWidth, windowHeight]);

  const renderSymbol = useCallback(({ item }) => <SymbolRow symbol={item} onPress={search.selectSymbol} />, [search.selectSymbol]);
  const renderInstrument = useCallback(({ item }) => (
    <InstrumentRow row={item} strike={search.strikeFor(item)} onOpen={openInstrument} onStrike={openStrikeMenu} />
  ), [openInstrument, openStrikeMenu, search.strikeFor]);

  const symbolEmpty = search.query.trim() ? 'No symbols found.' : 'Search symbols';

  // Android gives this absolute, transformed pane a height and then draws no rows.
  // The phone shows one plain list. Web keeps the sliding panes.
  if (Platform.OS !== 'web') {
    return (
      <View style={variant === 'screen' ? styles.fill : { height: bodyHeight }}>
        {search.stage === 'instruments' ? (
          <View style={styles.fill}>
            <Pressable onPress={search.backToSymbols} accessibilityRole="button" accessibilityLabel="Back to symbols" style={styles.backRow}>
              <ChevronIcon size={16} color={MUTED} direction="left" />
              <Text style={styles.symbol} numberOfLines={1}>{search.symbol || 'Symbols'}</Text>
            </Pressable>
            <FlatList
              data={search.instruments}
              extraData={search.strikes}
              keyExtractor={(item) => item.key}
              renderItem={renderInstrument}
              style={styles.list}
              contentContainerStyle={search.instruments.length === 0 ? styles.emptyWrap : styles.listContent}
              ListEmptyComponent={<EmptyNote text="No instruments available." />}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
            />
          </View>
        ) : (
          <FlatList
            data={search.matches}
            keyExtractor={(item) => item}
            renderItem={renderSymbol}
            style={styles.list}
            contentContainerStyle={search.matches.length === 0 ? styles.emptyWrap : styles.listContent}
            ListEmptyComponent={<EmptyNote text={symbolEmpty} />}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
            removeClippedSubviews={false}
          />
        )}
        <StrikeMenu menu={menu} layout={menuLayout} onClose={closeMenu} onSelect={selectStrike} onArm={holdNavigation} />
      </View>
    );
  }

  return (
    <View style={variant === 'screen' ? styles.fill : null}>
      <View style={[styles.clip, variant === 'screen' ? styles.fill : { height: bodyHeight }]} onLayout={onLayout}>
        <Animated.View style={[styles.pane, { transform: [{ translateX: symbolsX }] }]} pointerEvents={search.stage === 'symbols' ? 'auto' : 'none'}>
          <FlatList
            data={search.matches}
            keyExtractor={(item) => item}
            renderItem={renderSymbol}
            style={styles.list}
            contentContainerStyle={search.matches.length === 0 ? styles.emptyWrap : styles.listContent}
            ListEmptyComponent={<EmptyNote text={symbolEmpty} />}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        </Animated.View>
        <Animated.View style={[styles.pane, { transform: [{ translateX: instrumentsX }] }]} pointerEvents={search.stage === 'instruments' ? 'auto' : 'none'}>
          <Pressable onPress={search.backToSymbols} accessibilityRole="button" accessibilityLabel="Back to symbols" style={[styles.backRow, webPointer]}>
            <ChevronIcon size={16} color={MUTED} direction="left" />
            <Text style={styles.symbol} numberOfLines={1}>{search.symbol || 'Symbols'}</Text>
          </Pressable>
          <FlatList
            data={search.instruments}
            extraData={search.strikes}
            keyExtractor={(item) => item.key}
            renderItem={renderInstrument}
            style={styles.list}
            contentContainerStyle={search.instruments.length === 0 ? styles.emptyWrap : styles.listContent}
            ListEmptyComponent={<EmptyNote text="No instruments available." />}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        </Animated.View>
      </View>
      <StrikeMenu menu={menu} layout={menuLayout} onClose={closeMenu} onSelect={selectStrike} onArm={holdNavigation} />
    </View>
  );
}

export default memo(FnoSearchPanel);

const webPointer = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { overflow: 'hidden', position: 'relative' },
  pane: { ...StyleSheet.absoluteFillObject },
  list: { flex: 1 },
  listContent: { paddingBottom: 4 },
  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  instrumentRow: { height: ROW, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, minWidth: 0, height: '100%' },
  tail: { flex: 1, minWidth: 28, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: 8 },
  backRow: { height: ROW, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  symbol: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: TEXT },
  name: { fontFamily: 'Inter_600SemiBold', color: TEXT },
  line: { flexShrink: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: TEXT },
  strike: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 8, gap: 6, height: '100%', backgroundColor: 'transparent' },
  strikeMark: { alignItems: 'stretch', justifyContent: 'center' },
  strikeText: { fontSize: 13, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#64748B' },
  strikeUnderline: { marginTop: 3, height: 0, borderBottomWidth: 1, borderStyle: 'dotted', borderBottomColor: '#94A3B8' },
  menuRoot: { flex: 1 },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuContent: { paddingVertical: MENU_PAD },
  menuFixed: { overflow: 'hidden' },
  menuItem: { height: MENU_ITEM_H, justifyContent: 'center', paddingHorizontal: 10 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: TEXT },
  menuTextActive: { color: ACCENT, fontFamily: 'Inter_600SemiBold' },
});
