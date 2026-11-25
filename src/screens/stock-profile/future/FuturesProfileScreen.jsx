import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Platform, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackChevronIcon } from '@/components/icons/StockProfileIcons';
import ProfileNavHeader, { useProfileHeaderScroll } from '@/components/stock-profile/ProfileNavHeader';
import StockHeroCard from '@/components/stock-profile/StockHeroCard';
import KeyStatsOverview from '@/components/stock-profile/future/FutureKeyStatsOverview';
import StockStatisticsGrid from '@/components/stock-profile/ProfileStatsGrid';
import MarketBiasCard from '@/components/stock-profile/future/FutureMarketBiasCard';
import PricePerformance from '@/components/stock-profile/future/PricePerformance';
import OIChanges from '@/components/stock-profile/future/OIChanges';
import PriceRangeBarComponent from '@/components/stock-profile/future/PriceRangeBarComponent';
import FiveDayData from '@/components/stock-profile/future/FiveDayData';
import MomOiTable from '@/components/stock-profile/future/MomOiTable';
import OIChangesTable from '@/components/stock-profile/future/OIChangesTable';
import OptionOiValue from '@/components/stock-profile/future/OptionOiValue';
import OptionsData from '@/components/stock-profile/future/OptionsData';
import KeyMovements from '@/components/stock-profile/future/KeyMovements';
import KeyObservations from '@/components/stock-profile/future/KeyObservations';
import IntradayMovement from '@/components/stock-profile/future/IntradayMovement';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useProfileWatchlist } from '@/hooks/useProfileWatchlist';
import { useSocketEvent } from '@/hooks/useSocket';
import { paramString } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const TABS = [
  { key: 'stats', label: 'Key Stats' },
  { key: 'oi', label: 'OI Overview' },
  { key: 'options', label: 'Options Data' },
  { key: 'takeaways', label: 'RM Takeaways' },
];

const DEFAULT_TAB = 'stats';

function tabFromParam(value) {
  const key = paramString(value).trim().toLowerCase();
  const match = TABS.find((item) => item.key === key);
  return match ? match.key : DEFAULT_TAB;
}

const GRAPH_FIELDS = ['prev_1d_close', 'prev_5day_close', 'prev_30day_close', 'graphData1Day', 'graphData5Days', 'graphData10Days', 'graphData20Days', 'graphData30Days', 'graphData60Days'];

function unwrap(res) {
  const data = res?.result ?? res;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

function objectOf(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function pick(source, fields) {
  const out = {};
  for (let i = 0; i < fields.length; i += 1) out[fields[i]] = source?.[fields[i]];
  return out;
}

function readProfile(res) {
  const payload = unwrap(res);
  if (!payload) return null;
  const data = objectOf(payload.data);
  const keyStats = objectOf(data.key_stats);
  const oiOverview = objectOf(data.oi_overview);
  const mom = oiOverview.mom;
  const optionData = objectOf(data.optionData);
  const daily = objectOf(optionData.daily_data);
  const summary = objectOf(data.rm_summary);
  return {
    ...keyStats,
    price_performance: objectOf(keyStats.price_performance),
    market_bias: objectOf(keyStats.market_bias),
    oi_changes: arrayOf(keyStats.oi_changes),
    market_status: payload.market_status,
    cdate: payload.cdate,
    expiry_date: payload.expiry_date,
    expiry_state: payload.expiry_state,
    oi_overview: {
      data5days: arrayOf(oiOverview.data5days),
      mom: Array.isArray(mom) ? mom : Array.isArray(mom?.data) ? mom.data : mom,
      oi_changes: arrayOf(oiOverview.oi_changes ?? oiOverview.i_changes ?? keyStats.oi_changes),
    },
    optionData: {
      ...optionData,
      daily_data: {
        ...daily,
        call: { ...objectOf(daily.call), data: arrayOf(daily.call?.data) },
        put: { ...objectOf(daily.put), data: arrayOf(daily.put?.data) },
      },
    },
    rm_summary: {
      key_movements: arrayOf(summary.key_movements),
      rm_insights: arrayOf(summary.rm_insights),
      key_observations: arrayOf(summary.key_observations),
    },
  };
}

function readGraph(res) {
  const payload = unwrap(res);
  if (!payload) return null;
  return pick(payload, GRAPH_FIELDS);
}

export default function FuturesProfileScreen() {
  const { isLaptop } = useBreakpoint();
  const styles = useFluidStyles(createStyles);
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const symbol = paramString(params.symbol).trim();
  const expiry = paramString(params.expiry).trim() || 'near';
  const snackbar = useSnackbar();
  const watchlist = useProfileWatchlist({ kind: 'futures', symbol, expiry, onError: snackbar.show });
  const rawTab = paramString(params.tab);
  const tab = tabFromParam(rawTab);
  const [profile, setProfile] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphFor, setGraphFor] = useState('');
  const graphFocused = useRef(false);
  const [reveal, setReveal] = useState({ start: 4000, end: 4024 });
  const { scrollY, onScroll, scrollEventThrottle } = useProfileHeaderScroll();
  const onIdentityReveal = useCallback((next) => {
    setReveal((prev) => (Math.abs(prev.start - next.start) < 0.5 && Math.abs(prev.end - next.end) < 0.5 ? prev : next));
  }, []);

  const fetchProfile = useCallback(
    () => socketRequest('GET_APP_STOCK_PROFILE', { symbol, expiry }),
    [symbol, expiry],
  );
  const fetchGraph = useCallback(
    () => socketRequest('GET_LINE_GRAPH', { symbol, option_type: 'XX', strike_pr: 0, expiry_state: expiry }),
    [symbol, expiry],
  );
  const requestKey = `${symbol}|${expiry}`;

  useSocketEvent('REC_APP_STOCK_PROFILE', (res) => {
    const next = readProfile(res);
    if (next) setProfile(next);
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
    setProfile(null);
    fetchProfile().catch(() => { });
  }, [fetchProfile]);

  // The futures screen stays mounted under the option screen, and both listen for
  // REC_LINE_GRAPH. Ignore responses that arrive while covered, and ask again on
  // return so the chart is rebuilt from this contract instead of the option's data.
  useFocusEffect(useCallback(() => {
    graphFocused.current = true;
    fetchGraph().catch(() => { });
    return () => { graphFocused.current = false; };
  }, [fetchGraph]));

  useEffect(() => {
    if (rawTab === tab) return;
    navigation.setParams({ tab });
  }, [navigation, rawTab, tab]);

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

  const onTabChange = useCallback((key) => {
    if (key === tab) return;
    navigation.setParams({ tab: key });
  }, [navigation, tab]);

  const graphData = graphFor === requestKey ? graph : null;
  const watchlistProps = {
    watchlistAdded: watchlist.added,
    watchlistDisabled: !watchlist.ready || watchlist.busy,
    onWatchlist: watchlist.toggle,
  };

  const hero = (
    <StockHeroCard
      status={profile?.market_status}
      cdate={profile?.cdate}
      expiry={expiry}
      onExpiryChange={onExpiryChange}
      symbol={symbol}
      price={profile?.price}
      price_change={profile?.price_change}
      price_change_value={profile?.price_change_value}
      lot_size={profile?.lot_size}
      margin={profile?.margin}
      wap={profile?.wap}
      onIdentityReveal={onIdentityReveal}
    />
  );

  const tabBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
      {TABS.map((item) => {
        const selected = tab === item.key;
        return (
          <Pressable key={item.key} onPress={() => onTabChange(item.key)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.tab, isLaptop ? styles.tabWide : null, Platform.OS === 'web' ? styles.pointer : null]}>
            <Text style={[styles.tabLabel, isLaptop ? styles.tabLabelWide : null, selected ? styles.tabLabelActive : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text>
            <View style={[selected ? styles.tabIndicator : styles.tabIndicatorSpacer, isLaptop ? styles.tabIndicatorWide : null]} />
          </Pressable>
        );
      })}
    </ScrollView>
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
              <KeyStatsOverview profile={profile} graph={graphData} symbol={symbol} expiry={expiry} fill {...watchlistProps} />
            </View>
          </View>
          <View style={styles.right}>
            {tabBar}
            <ScrollView key={tab} style={styles.rightScroll} contentContainerStyle={styles.rightContent} keyboardShouldPersistTaps="handled">
              {profileTab(tab, profile, graphData, symbol, expiry, false)}
            </ScrollView>
          </View>
        </View>
        <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
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
        watchlistAdded={watchlist.added}
        watchlistDisabled={!watchlist.ready || watchlist.busy}
        onWatchlist={watchlist.toggle}
      />
      {tabBar}
      <Animated.ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {hero}
        {profileTab(tab, profile, graphData, symbol, expiry, true)}
      </Animated.ScrollView>
      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </SafeAreaView>
  );
}

function profileTab(tab, profile, graph, symbol, expiry, showOverview) {
  if (tab === 'stats') return <KeyStatsTab profile={profile} graph={graph} symbol={symbol} expiry={expiry} showOverview={showOverview} />;
  if (tab === 'oi') return <OiOverviewTab overview={profile?.oi_overview} pcr={profile?.pcr} optionData={profile?.optionData} symbol={symbol} />;
  if (tab === 'options') return <OptionsDataTab optionData={profile?.optionData} symbol={symbol} expiry={expiry} />;
  if (tab === 'takeaways') return <RmTakeawaysTab summary={profile?.rm_summary} symbol={symbol} />;
  return null;
}

function KeyStatsTab({ profile, graph, symbol, expiry, showOverview }) {
  return (
    <>
      {showOverview ? <KeyStatsOverview profile={profile} graph={graph} symbol={symbol} expiry={expiry} /> : null}
      <MarketBiasCard bias={profile?.market_bias?.bias} comment={profile?.tradingDataComment} priceChange={profile?.market_bias?.price_change} futureOi={profile?.market_bias?.future_oi} score={profile?.score ?? profile?.market_bias?.score} />
      <StockStatisticsGrid profile={profile} />
      <PricePerformance data={profile?.price_performance} />
      <OIChanges data={profile?.oi_changes} />
    </>
  );
}

function OiOverviewTab({ overview, pcr, optionData, symbol }) {
  return (
    <>
      <OptionOiValue pcr={pcr} optionData={optionData} />
      <FiveDayData oi_overview={overview} symbol={symbol} />
      <MomOiTable oi_overview={overview} symbol={symbol} />
      {/* <OIChangesTable oi_overview={overview} symbol={symbol} /> */}
    </>
  );
}

function OptionsDataTab({ optionData, symbol, expiry }) {
  return <OptionsData optionData={optionData} symbol={symbol} expiry={expiry} />;
}

function RmTakeawaysTab({ summary, symbol }) {
  return (
    <>
      <KeyMovements data={summary?.key_movements} symbol={symbol} />
      <KeyObservations data={summary?.key_observations} symbol={symbol} />
      <IntradayMovement data={summary?.rm_insights} symbol={symbol} />
    </>
  );
}

const createStyles = (f) => ({
  fill: { flex: 1, backgroundColor: '#FFFFFF' },
  pointer: { cursor: 'pointer' },
  tabsScroll: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  tabs: { flexDirection: 'row', flexGrow: 1 },
  tab: { flexGrow: 1, alignItems: 'stretch', paddingTop: f(16, 18), paddingHorizontal: f(12, 18) },
  tabLabel: { textAlign: 'center', fontSize: f(14, 16), lineHeight: f(18, 22), fontFamily: 'Inter_500Medium', color: '#64748B' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  tabIndicator: { height: 2, marginTop: f(14, 16), backgroundColor: '#0071A9' },
  tabIndicatorSpacer: { height: 2, marginTop: f(14, 16) },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: f(24, 32) },
  split: { flex: 1, flexDirection: 'row', minHeight: 0 },
  left: { flex: 1.35, minWidth: 0, minHeight: 0, paddingHorizontal: f(20, 32), paddingTop: f(16, 24), paddingBottom: f(18, 28) },
  webBack: { width: f(34, 40), height: f(34, 40), borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: f(12, 16) },
  graphFill: { flexGrow: 1, flexShrink: 1, minHeight: 0, marginTop: f(18, 28) },
  right: { flex: 1, minWidth: 0, minHeight: 0, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E2E8F0' },
  rightScroll: { flex: 1, minHeight: 0 },
  rightContent: { paddingTop: f(12, 18), paddingBottom: f(28, 40) },
  tabWide: { paddingTop: f(12, 16), paddingHorizontal: f(8, 14) },
  tabLabelWide: { fontSize: f(13, 15.5), lineHeight: f(18, 21) },
  tabIndicatorWide: { marginTop: f(12, 14) },
});
