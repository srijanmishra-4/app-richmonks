import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackChevronIcon, BookmarkIcon, SearchIcon } from '@/components/icons/StockProfileIcons';
import StockHeroCard from '@/components/stock-profile/StockHeroCard';
import KeyStatsOverview from '@/components/stock-profile/future/FutureKeyStatsOverview';
import StockStatisticsGrid from '@/components/stock-profile/ProfileStatsGrid';
import MarketBiasCard from '@/components/stock-profile/future/FutureMarketBiasCard';
import HighLowRange from '@/components/stock-profile/future/FutureHighLowRange';
import Performance from '@/components/stock-profile/future/FuturePerformance';
import PriceRangeBarComponent from '@/components/stock-profile/future/PriceRangeBarComponent';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useSocketEvent } from '@/hooks/useSocket';
import { paramString } from '@/utils/reportParams';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const TABS = [
  { key: 'stats', label: 'Key Stats' },
  { key: 'options', label: 'Options Data' },
];

const PROFILE_FIELDS = ['price', 'price_change', 'price_change_value', 'wap', 'lot_size', 'margin', 'high', 'low', 'high_5_days', 'low_5_days', 'high_20_day', 'low_20_day', 'high_30_days', 'low_30_days', 'dist_high', 'dist_low', 'dist_high_5_day', 'dist_low_5_day', 'dist_high_20_day', 'dist_low_20_day', 'dist_high_30_day', 'dist_low_30_day', 'key_levels', 'rank', 'rank_chg_20', 'volume', 'vol_chg', 'price_action', 'price_momemtum', 'oi_qty_change_1_day', 'oi_qty_change_5_day'];
const GRAPH_FIELDS = ['prev_1d_close', 'prev_5day_close', 'prev_30day_close', 'graphData1Day', 'graphData5Days', 'graphData30Days'];

function unwrap(res) {
  const data = res?.result ?? res;
  return data && typeof data === 'object' ? data : null;
}

function pick(source, fields) {
  const out = {};
  for (let i = 0; i < fields.length; i += 1) out[fields[i]] = source?.[fields[i]];
  return out;
}

function readProfile(res) {
  const payload = unwrap(res);
  if (!payload) return null;
  return {
    market_status: payload.market_status,
    cdate: payload.cdate,
    bias: payload.data?.bias,
    tradingDataComment: payload.data?.tradingDataComment,
    market_bias: payload.data?.profile?.market_bias,
    oi_summary: payload.data?.oi_summary,
    ...pick(payload.data?.profile, PROFILE_FIELDS),
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
    () => socketRequest('GET_APP_STOCK_PROFILE_V2', { symbol, expiry }),
    [symbol, expiry],
  );
  const fetchGraph = useCallback(
    () => socketRequest('GET_LINE_GRAPH', { symbol, option_type: 'XX', strike_pr: 0, expiry_state: expiry }),
    [symbol, expiry],
  );

  useSocketEvent('REC_APP_STOCK_PROFILE_V2', (res) => {
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
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const selected = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label} style={[styles.tab, Platform.OS === 'web' ? styles.pointer : null]}>
              <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]} maxFontSizeMultiplier={1.1}>{item.label}</Text>
              <View style={selected ? styles.tabIndicator : styles.tabIndicatorSpacer} />
            </Pressable>
          );
        })}
      </View>
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
        />
        {tab === 'stats' ? (
          <>
            <KeyStatsOverview profile={profile} graph={graph} />
            <MarketBiasCard bias={profile?.bias} comment={profile?.tradingDataComment} priceChange={profile?.market_bias?.price_change} futureOi={profile?.market_bias?.future_oi} />
            <StockStatisticsGrid profile={profile} /> 
            <HighLowRange profile={profile} />
            <Performance profile={profile} />
          </>
        ) : (
          <PriceRangeBarComponent high={profile?.high} low={profile?.low} price={profile?.price} wap={profile?.wap} />
        )}
      </ScrollView>
    </>
  );

  if (isLaptop) return <View style={styles.fill}>{body}</View>;
  return <SafeAreaView style={styles.fill} edges={['top']}>{body}</SafeAreaView>;
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
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, alignItems: 'stretch', paddingTop: f(16, 18) },
  tabLabel: { textAlign: 'center', fontSize: f(14, 16), lineHeight: f(18, 22), fontFamily: 'Inter_500Medium', color: '#64748B' },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  tabIndicator: { height: 2, marginTop: f(14, 16), backgroundColor: '#0071A9' },
  tabIndicatorSpacer: { height: 2, marginTop: f(14, 16) },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: f(24, 32) },
});
