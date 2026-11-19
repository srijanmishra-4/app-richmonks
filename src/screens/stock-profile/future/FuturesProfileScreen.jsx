import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackChevronIcon, BookmarkIcon, SearchIcon } from '@/components/icons/StockProfileIcons';
import StockHeroCard from '@/components/stock-profile/StockHeroCard';
import KeyStatsOverview from '@/components/stock-profile/future/FutureKeyStatsOverview';
import StockStatisticsGrid from '@/components/stock-profile/ProfileStatsGrid';
import MarketBiasCard from '@/components/stock-profile/future/FutureMarketBiasCard';
import PricePerformance from '@/components/stock-profile/future/PricePerformance';
import OIChanges from '@/components/stock-profile/future/OIChanges';
import PriceRangeBarComponent from '@/components/stock-profile/future/PriceRangeBarComponent';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
  const mom = objectOf(oiOverview.mom);
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
      mom: { ...mom, data: arrayOf(mom.data) },
      oi_performance: arrayOf(oiOverview.oi_performance),
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
  const [tab, setTab] = useState('stats');
  const [profile, setProfile] = useState(null);
  const [graph, setGraph] = useState(null);

  const fetchProfile = useCallback(
    () => socketRequest('GET_APP_STOCK_PROFILE', { symbol, expiry }),
    [symbol, expiry],
  );
  const fetchGraph = useCallback(
    () => socketRequest('GET_LINE_GRAPH', { symbol, option_type: 'XX', strike_pr: 0, expiry_state: expiry }),
    [symbol, expiry],
  );

  useSocketEvent('REC_APP_STOCK_PROFILE', (res) => {
    const next = readProfile(res);
    if (next) setProfile(next);
  });
  useSocketEvent('REC_LINE_GRAPH', (res) => {
    const next = readGraph(res);
    if (next) setGraph(next);
  });

  useEffect(() => {
    setProfile(null);
    fetchProfile().catch(() => { });
  }, [fetchProfile]);

  useEffect(() => { 
    setGraph(null);
    fetchGraph().catch(() => { });
  }, [fetchGraph]);

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

  const body = (
    <>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.iconBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <BackChevronIcon size={24} />
        </Pressable>
        <View style={styles.headerActions}>
          <View style={styles.iconBtn} accessible={false}>
            <BookmarkIcon size={22} />
          </View>
          <Pressable onPress={onSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search" style={[styles.iconBtn, styles.searchBtn, Platform.OS === 'web' ? styles.pointer : null]}>
            <SearchIcon size={22} />
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => {
          const selected = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.tab, Platform.OS === 'web' ? styles.pointer : null]}>
              <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text>
              <View style={selected ? styles.tabIndicator : styles.tabIndicatorSpacer} />
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
        />
        {profileTab(tab, profile, graph)}
      </ScrollView>
    </>
  );

  if (isLaptop) return <View style={styles.fill}>{body}</View>;
  return <SafeAreaView style={styles.fill} edges={['top']}>{body}</SafeAreaView>;
}

function profileTab(tab, profile, graph) {
  if (tab === 'stats') return <KeyStatsTab profile={profile} graph={graph} />;
  if (tab === 'oi') return <OiOverviewTab overview={profile?.oi_overview} />;
  if (tab === 'options') return <OptionsDataTab optionData={profile?.optionData} />;
  if (tab === 'takeaways') return <RmTakeawaysTab summary={profile?.rm_summary} />;
  return null;
}

function KeyStatsTab({ profile, graph }) {
  return (
    <>
      <KeyStatsOverview profile={profile} graph={graph} />
      <StockStatisticsGrid profile={profile} />
      <MarketBiasCard bias={profile?.bias} comment={profile?.tradingDataComment} priceChange={profile?.market_bias?.price_change} futureOi={profile?.market_bias?.future_oi} score={profile?.score ?? profile?.market_bias?.score} />
      <PricePerformance data={profile?.price_performance} />
      <OIChanges data={profile?.oi_changes} />
    </>
  );
}

function OiOverviewTab() {
  return null;
}

function OptionsDataTab() {
  return null;
}

function RmTakeawaysTab() {
  return null;
}

const createStyles = (f) => ({
  fill: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: f(56, 64),
    paddingLeft: f(8, 16),
    paddingRight: f(12, 16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: f(20, 24) },
  iconBtn: { width: f(40, 44), height: f(40, 44), alignItems: 'center', justifyContent: 'center' },
  searchBtn: { marginRight: f(10, 14) },
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
});
