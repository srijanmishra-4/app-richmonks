import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, Modal, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExpiryOptions } from '@/components/ExpiryDropdownComponent';
import { ChevronIcon, PlusCircleIcon } from '@/components/icons/CommonIcons';
import { SearchIcon } from '@/components/icons/NavIcons';
import { SkeletonBar, SkeletonListRows, usePulse } from '@/components/skeleton/SkeletonBars';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useCommonData } from '@/context/CommonDataContext';
import { cdnApi, watchlistApi } from '@/utils/api';

const ACCENT = '#0071A9';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const LOGO_SIZE = 22;

const OPTION_TYPES = [{ value: 'CE', label: 'CE' }, { value: 'PE', label: 'PE' }];
const WEEKLY_SYMBOLS = new Set(['NIFTY']);
const EXPIRY_STATE = { near: 'Near', next: 'Next', far: 'Far', weeklyNear: 'Near', weeklyNext: 'Next', weeklyFar: 'Far' };
const MENU_ITEM_H = 36;
const MENU_PAD = 4;
const MENU_MAX_H = MENU_ITEM_H * 7 + MENU_PAD * 2;

function param(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function AddWatchlistRowSkeleton({ pulse }) {
  return (
    <View style={styles.row}>
      <SkeletonBar pulse={pulse} width="58%" height={13} />
      <SkeletonBar pulse={pulse} width={28} height={11} />
    </View>
  );
}

function itemLabel(item) {
  if (typeof item === 'string') return item;
  return item?.symbol || item?.name || item?.script || item?.industry || '';
}

function toNumber(val) {
  if (val == null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,()%\s]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function formatPrice(val) {
  const num = toNumber(val);
  return num == null ? '—' : `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(num) {
  return num == null ? '' : `(${num > 0 ? '+' : ''}${num.toFixed(2)}%)`;
}

function nearestStrike(strikes, price) {
  if (!strikes.length) return null;
  const target = toNumber(price);
  if (target == null) return strikes[0];
  return strikes.reduce((best, s) => (Math.abs(Number(s) - target) < Math.abs(Number(best) - target) ? s : best), strikes[0]);
}

function pickValue(options, value, fallback = 'near') {
  if (options.some((o) => o.value === value)) return value;
  return options.some((o) => o.value === fallback) ? fallback : options[0]?.value ?? fallback;
}

function Logo({ symbol }) {
  const [failed, setFailed] = useState(false);
  if (!symbol || failed) {
    return (
      <View style={styles.logoFallback}>
        <Text style={styles.logoInitials} allowFontScaling={false}>{symbol.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }
  return <Image source={{ uri: cdnApi(symbol) }} style={styles.logo} resizeMode="contain" onError={() => setFailed(true)} accessibilityLabel={`${symbol} logo`} />;
}

const Picker = memo(function Picker({ label, width, disabled, onOpen }) {
  const ref = useRef(null);
  const press = () => ref.current?.measureInWindow((x, y, w, h) => onOpen({ x, y, w, h }));
  return (
    <View ref={ref} collapsable={false}>
      <Pressable onPress={press} disabled={disabled} accessibilityRole="button" style={[styles.picker, { width }, disabled ? styles.disabled : null, Platform.OS === 'web' ? styles.pointer : null]}>
        <Text style={styles.pickerText} numberOfLines={1}>{label}</Text>
        <ChevronIcon size={10} color={MUTED} direction="down" />
      </Pressable>
    </View>
  );
});

function AddButton({ onPress, disabled, label }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={[styles.addBtn, disabled ? styles.disabled : null, Platform.OS === 'web' ? styles.pointer : null]}>
      <PlusCircleIcon size={22} color="#475569" />
    </Pressable>
  );
}

const InstrumentRow = memo(function InstrumentRow({ symbol, kind, info, expanded, onToggle, monthlyExpiry, weeklyExpiry, openMenu, onAdd, saving }) {
  const isOptions = kind === 'options';
  const expiryOptions = isOptions && WEEKLY_SYMBOLS.has(symbol) ? weeklyExpiry : monthlyExpiry;
  const [optionType, setOptionType] = useState('CE');
  const [strike, setStrike] = useState(null);
  const [expiry, setExpiry] = useState('near');

  const strikes = useMemo(() => (Array.isArray(info?.[optionType]) ? info[optionType] : []), [info, optionType]);
  const activeStrike = strike != null && strikes.some((s) => String(s) === String(strike)) ? strike : nearestStrike(strikes, info?.price);
  const activeExpiry = pickValue(expiryOptions, expiry);
  const expiryLabel = expiryOptions.find((o) => o.value === activeExpiry)?.label ?? '—';
  const strikeOptions = useMemo(() => strikes.map((s) => ({ value: s, label: Number(s).toLocaleString('en-IN') })), [strikes]);
  const pct = toNumber(info?.price_change);
  const changeColor = pct > 0 ? GREEN : pct < 0 ? RED : MUTED;

  const add = () => {
    const expiry_state = EXPIRY_STATE[activeExpiry] ?? 'Near';
    if (!isOptions) { onAdd({ symbol, expiry_state }); return; }
    onAdd({ symbol, expiry_state, option_type: optionType, type: activeExpiry.startsWith('weekly') ? 'weekly' : 'monthly', strike_pr: String(activeStrike) });
  };

  const canAdd = !saving && (!isOptions || activeStrike != null);

  return (
    <View style={styles.item}>
      <Pressable onPress={() => onToggle(symbol)} accessibilityRole="button" accessibilityState={{ expanded }} style={[styles.head, Platform.OS === 'web' ? styles.pointer : null]}>
        <Logo key={symbol} symbol={symbol} />
        <Text style={styles.symbol} numberOfLines={1}>{symbol}</Text>
        <Text style={styles.price} numberOfLines={1}>{formatPrice(info?.price)}</Text>
        {pct != null ? <Text style={[styles.change, { color: changeColor }]} numberOfLines={1}>{formatPct(pct)}</Text> : null}
        <ChevronIcon size={16} color={MUTED} direction={expanded ? 'down' : 'right'} />
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <View style={styles.pickers}>
            {isOptions ? (
              <>
                <Picker label={optionType} width={56} onOpen={(anchor) => openMenu({ anchor, options: OPTION_TYPES, value: optionType, onSelect: setOptionType })} />
                <Picker
                  label={activeStrike != null ? Number(activeStrike).toLocaleString('en-IN') : '—'}
                  width={82}
                  disabled={!strikeOptions.length}
                  onOpen={(anchor) => openMenu({ anchor, options: strikeOptions, value: activeStrike, onSelect: setStrike })}
                />
              </>
            ) : null}
            <Picker label={expiryLabel} width={104} disabled={!expiryOptions.length} onOpen={(anchor) => openMenu({ anchor, options: expiryOptions, value: activeExpiry, onSelect: setExpiry })} />
          </View>
          <AddButton onPress={add} disabled={!canAdd} label={`Add ${symbol}`} />
        </View>
      ) : null}
    </View>
  );
});

function AddWatchlistScreen({ type: typeProp, embedded = false, onClose }) {
  const params = useLocalSearchParams();
  const type = typeProp || param(params.type) || 'futures';
  const isIndustry = type === 'industry';
  const snackbar = useSnackbar();
  const { industries, strikePricesAndPrices, loading } = useCommonData();
  const monthlyExpiry = useExpiryOptions(false);
  const weeklyExpiry = useExpiryOptions(true);
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const navigation = useNavigation();
  const [transitionDone, setTransitionDone] = useState(embedded);

  // The stack holds the slide-in until the first render commits, so the heavy list mounts only after it lands.
  useEffect(() => {
    if (transitionDone) return undefined;
    const done = () => setTransitionDone(true);
    const timer = setTimeout(done, 450);
    const unsubscribe = navigation.addListener('transitionEnd', done);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [navigation, transitionDone]);

  const strikeSymbols = useMemo(() => Object.keys(strikePricesAndPrices ?? {}).sort((a, b) => a.localeCompare(b)), [strikePricesAndPrices]);
  const showLoading = !transitionDone || (isIndustry ? loading : strikeSymbols.length === 0);
  const pulse = usePulse(showLoading);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = isIndustry ? (industries ?? []).map(itemLabel) : strikeSymbols;
    const named = source.filter(Boolean);
    return q ? named.filter((label) => label.toLowerCase().startsWith(q)) : named;
  }, [isIndustry, industries, strikeSymbols, query]);

  const submit = useCallback(async (request) => {
    if (saving) return;
    setSaving(true);
    try {
      await request();
      if (embedded) onClose?.({ added: true });
      else router.back();
    } catch (err) {
      snackbar.show(err.message);
    } finally {
      setSaving(false);
    }
  }, [saving, snackbar.show, embedded, onClose]);

  const goBack = useCallback(() => {
    if (embedded) onClose?.({ added: false });
    else if (router.canGoBack()) router.back();
    else router.replace('/watchlist');
  }, [embedded, onClose]);

  const addIndustry = (symbol) => submit(() => watchlistApi.add({ symbol, script: symbol }));
  const addInstrument = useCallback((body) => submit(() => (type === 'options' ? watchlistApi.addOption(body) : watchlistApi.addFuture(body))), [submit, type]);

  const toggleRow = useCallback((symbol) => setExpandedSymbol((prev) => (prev === symbol ? null : symbol)), []);
  const openMenu = useCallback((next) => setMenu(next), []);
  const closeMenu = useCallback(() => setMenu(null), []);

  const menuLayout = useMemo(() => {
    if (!menu) return null;
    const { x, y, w, h } = menu.anchor;
    const contentHeight = menu.options.length * MENU_ITEM_H + MENU_PAD * 2;
    const height = Math.min(contentHeight, MENU_MAX_H);
    const below = y + h + 3;
    const top = below + height > windowHeight - 8 ? Math.max(8, y - height - 3) : below;
    const index = Math.max(0, menu.options.findIndex((o) => String(o.value) === String(menu.value)));
    return { left: x, top, width: Math.max(w, 72), height, index, scrollable: contentHeight > MENU_MAX_H };
  }, [menu, windowHeight]);

  const Container = embedded ? View : SafeAreaView;
  const containerProps = embedded ? { style: styles.root } : { style: styles.root, edges: ['top'] };

  return (
    <Container {...containerProps}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <ChevronIcon size={20} color={MUTED} direction="left" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Add to Watchlist</Text>
      </View>

      <View style={styles.searchBox}>
        <SearchIcon size={16} color="#94A3B8" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search instruments" placeholderTextColor="#94A3B8" autoCorrect={false} autoCapitalize="characters" style={[styles.searchInput, Platform.OS === 'web' ? styles.noOutline : null]} />
      </View>

      {showLoading ? (
        <View style={styles.listContent} accessibilityState={{ busy: true }}>
          <SkeletonListRows count={12} pulse={pulse} RowComponent={AddWatchlistRowSkeleton} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(label, index) => `${label}-${index}`}
          extraData={expandedSymbol}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No instruments to add.</Text></View>}
          renderItem={({ item: label }) => (isIndustry ? (
            <View style={styles.row}>
              <Text style={styles.rowText}>{label}</Text>
              <AddButton onPress={() => addIndustry(label)} disabled={saving} label={`Add ${label}`} />
            </View>
          ) : (
            <InstrumentRow
              symbol={label}
              kind={type}
              info={strikePricesAndPrices?.[label]}
              expanded={expandedSymbol === label}
              onToggle={toggleRow}
              monthlyExpiry={monthlyExpiry}
              weeklyExpiry={weeklyExpiry}
              openMenu={openMenu}
              onAdd={addInstrument}
              saving={saving}
            />
          ))}
        />
      )}

      <Modal visible={!!menu} transparent animationType="none" statusBarTranslucent onRequestClose={closeMenu}>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          {menu && menuLayout ? (
            <View style={[styles.menu, { left: menuLayout.left, top: menuLayout.top, width: menuLayout.width, height: menuLayout.height }]}>
              <FlatList
                data={menu.options}
                keyExtractor={(o, i) => `${o.value}-${i}`}
                getItemLayout={(_, i) => ({ length: MENU_ITEM_H, offset: MENU_PAD + MENU_ITEM_H * i, index: i })}
                initialScrollIndex={menuLayout.scrollable ? Math.max(0, menuLayout.index - 2) : 0}
                scrollEnabled={menuLayout.scrollable}
                showsVerticalScrollIndicator={menuLayout.scrollable}
                style={menuLayout.scrollable ? null : styles.noOverflow}
                contentContainerStyle={styles.menuContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: option }) => {
                  const active = String(option.value) === String(menu.value);
                  return (
                    <Pressable onPress={() => { menu.onSelect(option.value); closeMenu(); }} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                      <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>{option.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          ) : null}
        </View>
      </Modal>

      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </Container>
  );
}

export default memo(AddWatchlistScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pointer: { cursor: 'pointer' },
  disabled: { opacity: 0.45 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontFamily: 'Inter_600SemiBold', color: '#0F172A', letterSpacing: -0.2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  searchInput: { flex: 1, marginLeft: 8, padding: 0, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#0F172A', borderWidth: 0 },
  noOutline: { outlineStyle: 'none', outlineWidth: 0 },
  listContent: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  rowText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoFallback: { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  logoInitials: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: MUTED },
  symbol: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  price: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  change: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 16, gap: 12 },
  pickers: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 30, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', gap: 4 },
  pickerText: { flexShrink: 1, fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuRoot: { flex: 1 },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuContent: { paddingVertical: MENU_PAD },
  noOverflow: { overflow: 'hidden' },
  menuItem: { height: MENU_ITEM_H, justifyContent: 'center', paddingHorizontal: 10 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: ACCENT, fontFamily: 'Inter_600SemiBold' },
});
