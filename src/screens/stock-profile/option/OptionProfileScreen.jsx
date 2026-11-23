import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated, Platform, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackChevronIcon } from '@/components/icons/StockProfileIcons';
import ProfileNavHeader, { useProfileHeaderScroll } from '@/components/stock-profile/ProfileNavHeader';
import StockHeroCard from '@/components/stock-profile/StockHeroCard';
import ProfileGraph from '@/components/stock-profile/ProfileGraph';
import ProfileStatsGrid from '@/components/stock-profile/ProfileStatsGrid';
import Option5DaysData from '@/components/stock-profile/option/Option5DaysData';
import OptionStreak from '@/components/stock-profile/option/OptionStreak';
import { useCommonData } from '@/context/CommonDataContext';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useSocketEvent } from '@/hooks/useSocket';
import { optionSide } from '@/utils/stockProfile';
import { paramString } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

function unwrap(res) {
  const data = res?.result ?? res;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

function routeValue(params, key) {
  const fromRoute = paramString(params?.[key]).trim();
  if (fromRoute) return fromRoute;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return new URLSearchParams(window.location.search).get(key)?.trim() || '';
  return '';
}

const GRAPH_FIELDS = ['prev_1d_close', 'prev_5day_close', 'prev_30day_close', 'graphData1Day', 'graphData5Days', 'graphData30Days'];
const GRAPH_SERIES = { '1D': 'graphData1Day', '5D': 'graphData5Days', '30D': 'graphData30Days' };

function strikeParam(value) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(num) ? String(num) : '';
}

function strikeNumber(value) {
  const num = parseFloat(strikeParam(value));
  return Number.isFinite(num) ? num : 0;
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[₹,()%\s]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function nearestStrike(strikes, price) {
  if (!strikes.length) return null;
  const target = toNumber(price);
  if (target == null) return strikes[0];
  return strikes.reduce((best, item) => (Math.abs(Number(item) - target) < Math.abs(Number(best) - target) ? item : best), strikes[0]);
}

function pick(source, fields) {
  const out = {};
  for (let i = 0; i < fields.length; i += 1) out[fields[i]] = source?.[fields[i]];
  return out;
}

function readGraph(res) {
  const payload = unwrap(res);
  if (!payload) return null;
  return pick(payload, GRAPH_FIELDS);
}

export default function OptionProfileScreen() {
  const { isLaptop } = useBreakpoint();
  const styles = useFluidStyles(createStyles);
  const navigation = useNavigation();
  const { strikePricesAndPrices } = useCommonData();
  const params = useLocalSearchParams();
  const symbol = routeValue(params, 'symbol');
  const optionType = optionSide(routeValue(params, 'option_type'));
  const strike = routeValue(params, 'strike_pr');
  const expiry = routeValue(params, 'expiry') || 'near';
  const urlPeriod = routeValue(params, 'period');
  const [graphPeriod, setGraphPeriod] = useState('1D');
  const [payload, setPayload] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphFor, setGraphFor] = useState('');
  const graphFocused = useRef(false);
  const [reveal, setReveal] = useState({ start: 4000, end: 4024 });
  const { scrollY, onScroll, scrollEventThrottle } = useProfileHeaderScroll();
  const onIdentityReveal = useCallback((next) => {
    setReveal((prev) => (Math.abs(prev.start - next.start) < 0.5 && Math.abs(prev.end - next.end) < 0.5 ? prev : next));
  }, []);
  const strikePrice = strikeNumber(strike);

  const fetchProfile = useCallback(() => {
    const request = { symbol, option_type: optionType, strike_pr: strike, expiry, period: urlPeriod };
    if (!request.symbol) return Promise.resolve(null);
    return socketRequest('GET_OPTION_PROFILE', request);
  }, [symbol, optionType, strike, expiry, urlPeriod]);

  const fetchGraph = useCallback(() => {
    if (!symbol || !strikePrice) return Promise.resolve(null);
    return socketRequest('GET_LINE_GRAPH', {
      symbol,
      option_type: optionType,
      strike_pr: strikePrice,
      expiry_state: expiry,
    });
  }, [symbol, optionType, strikePrice, expiry]);
  const requestKey = `${symbol}|${optionType}|${strikePrice}|${expiry}`;

  useSocketEvent('REC_OPTION_PROFILE', (res) => {
    const next = unwrap(res);
    if (next && (next.data || next.market_status != null || next.expiry_date != null)) setPayload(next);
  });
  useSocketEvent('REC_LINE_GRAPH', (res) => {
    if (!graphFocused.current) return;
    const next = readGraph(res);
    if (next) {
      setGraphFor(requestKey);
      setGraph(next);
    }
  });

  useEffect(() => {
    setPayload(null);
  }, [symbol, optionType, strike, expiry, urlPeriod]);

  useEffect(() => {
    if (!symbol) return undefined;
    fetchProfile().catch(() => { });
  }, [fetchProfile, symbol]);

  useFocusEffect(useCallback(() => {
    graphFocused.current = true;
    fetchGraph().catch(() => { });
    return () => { graphFocused.current = false; };
  }, [fetchGraph]));

  useRegisterRefresh(fetchProfile);
  useRegisterRefresh(fetchGraph);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, []);

  const onSearch = useCallback(() => {
    router.push('/home/search');
  }, []);

  const onExpiryChange = useCallback((next) => {
    const value = next || 'near';
    if (value === expiry) return;
    navigation.setParams({ expiry: value });
  }, [navigation, expiry]);

  const onStrikeChange = useCallback((next) => {
    const value = strikeParam(next);
    if (!value || value === strike) return;
    navigation.setParams({ strike_pr: value });
  }, [navigation, strike]);

  const onOptionTypeChange = useCallback((next) => {
    const side = optionSide(next);
    if (!side || side === optionType) return;
    const info = strikePricesAndPrices?.[symbol];
    const raw = info?.[side];
    const list = Array.isArray(raw) ? raw.filter((item) => item != null && item !== '') : null;
    const nextParams = { option_type: side };
    if (list && !list.some((item) => String(item) === String(strike))) {
      const fallback = nearestStrike(list, info?.price);
      if (fallback != null) nextParams.strike_pr = strikeParam(fallback);
    }
    navigation.setParams(nextParams);
  }, [navigation, optionType, strike, strikePricesAndPrices, symbol]);

  const onPeriodChange = useCallback((next) => {
    const value = String(next ?? '').trim();
    if (!value || value === graphPeriod) return;
    setGraphPeriod(value);
  }, [graphPeriod]);

  const profile = payload?.data?.profile;
  const stats = payload?.data?.key_stats;
  const series = (graphFor === requestKey ? graph : null)?.[GRAPH_SERIES[graphPeriod] || 'graphData1Day'];
  const keyStats = profile ? { open: profile.open, high: profile.high, low: profile.low, close: profile.close ?? profile.price, volume: profile.volume } : null;

  const header = (
    <ProfileNavHeader
      onBack={onBack}
      onSearch={onSearch}
      scrollY={scrollY}
      revealStart={reveal.start}
      revealEnd={reveal.end}
      symbol={symbol}
      price={profile?.price}
      priceChange={profile?.price_change}
      priceChangeValue={profile?.price_change_value}
      isOption
      optionType={optionType}
      strike={strike}
    />
  );

  const hero = (
    <StockHeroCard
      isOption
      status={payload?.market_status}
      cdate={payload?.cdate}
      expiry={expiry}
      expiryDate={payload?.expiry_date}
      onExpiryChange={onExpiryChange}
      symbol={symbol}
      optionType={optionType}
      onOptionTypeChange={onOptionTypeChange}
      strike={strike}
      onStrikeChange={onStrikeChange}
      price={profile?.price}
      price_change={profile?.price_change}
      price_change_value={profile?.price_change_value}
      lot_size={profile?.lot}
      margin={profile?.margin}
      onIdentityReveal={onIdentityReveal}
    />
  );

  const side = (
    <>
      <ProfileStatsGrid variant="option" profile={profile} stats={stats} />
      <Option5DaysData five_days_data={payload?.data?.five_days_data} symbol={symbol} strike={strike} optionType={optionType} />
      <OptionStreak option_streak={payload?.data?.option_streak} symbol={symbol} strike={strike} optionType={optionType} expiry={payload?.expiry_date} />
    </>
  );

  if (isLaptop) {
    return (
      <View style={styles.fill}>
        <View style={styles.split}>
          <View style={styles.left}>
            <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.webBack, Platform.OS === 'web' ? styles.pointer : null]}>
              <BackChevronIcon size={20} />
            </Pressable>
            {hero}
            <View style={styles.graphFill}>
              <ProfileGraph fill data={series} period={graphPeriod} onPeriodChange={onPeriodChange} symbol={symbol} optionType={optionType} strikePr={strikePrice} expiryState={expiry} keyStats={keyStats} />
            </View>
          </View>
          <ScrollView style={styles.right} contentContainerStyle={styles.rightContent} keyboardShouldPersistTaps="handled">
            {side}
          </ScrollView>
        </View>
      </View>
    );
  }

  const body = (
    <>
      {header}
      <Animated.ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {hero}
        <View style={styles.graphWrap}>
          <ProfileGraph data={series} period={graphPeriod} onPeriodChange={onPeriodChange} symbol={symbol} optionType={optionType} strikePr={strikePrice} expiryState={expiry} keyStats={keyStats} />
        </View>
        {side}
      </Animated.ScrollView>
    </>
  );

  return <SafeAreaView style={styles.fill} edges={['top']}>{body}</SafeAreaView>;
}

const createStyles = (f) => ({
  fill: { flex: 1, backgroundColor: '#FFFFFF' },
  pointer: { cursor: 'pointer' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: f(24, 32) },
  graphWrap: { paddingBottom: f(20, 24) },
  split: { flex: 1, flexDirection: 'row', minHeight: 0 },
  left: { flex: 1.35, minWidth: 0, minHeight: 0, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  webBack: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 12 },
  graphFill: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  right: { flex: 1, minWidth: 0, minHeight: 0, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E2E8F0' },
  rightContent: { paddingTop: f(14, 18), paddingBottom: f(24, 32) },
});
