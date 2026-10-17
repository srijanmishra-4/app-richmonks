import { useCallback, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useScreenRefresh } from '@/context/RefreshContext';
import { dismissAllLineGraphTooltips, lastLineGraphTouchTime } from '@/components/LineGraph';
import HomeHeader from '@/components/home/HomeHeader';
import MarketTicker from '@/components/home/MarketTicker';

import IndicesSection from '@/components/home/IndicesSection';
import FnoProfitMeter from '@/components/home/FnoProfitMeter';
import BullVsBearSection from '@/components/home/BullVsBearSection';
import TrendingStocks from '@/components/home/TrendingStocks';
import TrendingOptions from '@/components/home/TrendingOptions';
import MarketSentimenter from '@/components/home/MarketSentimenter';
import PremiumReports from '@/components/home/PremiumReports';
import { FnoStatsProvider } from '@/context/FnoStatsContext';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { clamp, useFluid, SIDEBAR_WIDTH } from '@/utils/responsive';

const DESKTOP_MAX_WIDTH = 1440;
// Futures + price beside the OI/WAP card needs about this much per index.
// Below it, both Nifty and Bank Nifty stack the stats card under the price.
const INDEX_HEADER_STACK_BELOW = 520;
// Narrower than this per index (small tablets), Nifty and Bank Nifty stack vertically.
const INDICES_STACK_BELOW = 300;

function fluidNum(min, vwPercent, max, viewport) {
  return clamp(min, (vwPercent / 100) * viewport, max);
}

function fluidSpace(min, vwPercent, max, viewport) {
  if (Platform.OS === 'web') return `clamp(${min}px, ${vwPercent}vw, ${max}px)`;
  return fluidNum(min, vwPercent, max, viewport);
}

// Ticker data will eventually come from Socket.IO — pass empty array to hide the ticker for now.
const tickerItems = [];

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop, isLaptop, width } = useBreakpoint();
  const f = useFluid();
  const sidebarWidth = isLaptop ? f(SIDEBAR_WIDTH.min, SIDEBAR_WIDTH.max) : 0;
  const padHNum = fluidNum(20, 2, 36, width);
  const indicesGapNum = fluidNum(24, 2.2, 40, width);
  const paneWidth = Math.max(0, width - sidebarWidth - padHNum * 2);
  const layoutWidth = Math.min(paneWidth, DESKTOP_MAX_WIDTH);
  // Once each index would otherwise exceed ~440px, cap the pair slightly under
  // half the row so the spare width becomes the gutter between them.
  const indexHalf = (layoutWidth - indicesGapNum) / 2;
  const stackIndices = indexHalf < INDICES_STACK_BELOW;
  const relaxIndices = !stackIndices && indexHalf > 440;
  const indexColWidth = stackIndices
    ? layoutWidth
    : relaxIndices ? Math.min(indexHalf, layoutWidth * 0.46) : indexHalf;
  const stackIndexStats = indexColWidth < INDEX_HEADER_STACK_BELOW;
  const spacing = {
    padH: fluidSpace(20, 2, 36, width),
    padTop: fluidSpace(18, 1.6, 32, width),
    padBottom: fluidSpace(44, 3.2, 72, width),
    sectionGap: fluidSpace(40, 3.2, 72, width),
    indicesGap: fluidSpace(26, 2.4, 40, width),
    marketColumnGap: fluidSpace(36, 3.1, 52, width),
    trendingGap: fluidSpace(26, 2.4, 40, width),
    sentimentMaxWidth: Platform.OS === 'web'
      ? 'min(100%, 340px)'
      : Math.min(layoutWidth, 340),
  };
  const refreshScreen = useScreenRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const atTopRef = useRef(true);
  const [pullEnabled, setPullEnabled] = useState(true);

  const handleScreenTouch = useCallback(() => {
    if (Date.now() - lastLineGraphTouchTime > 150) {
      dismissAllLineGraphTooltips();
    }
  }, []);

  const onScroll = useCallback((e) => {
    dismissAllLineGraphTooltips();
    const atTop = e.nativeEvent.contentOffset.y <= 0;
    if (atTopRef.current === atTop) return;
    atTopRef.current = atTop;
    if (!refreshingRef.current) setPullEnabled(atTop);
  }, []);

  const onRefresh = useCallback(() => {
    if (!atTopRef.current || refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    refreshScreen().finally(() => {
      refreshingRef.current = false;
      setRefreshing(false);
      setPullEnabled(atTopRef.current);
    });
  }, [refreshScreen]);

  return (
    <View
      style={[styles.root, { paddingTop: isLaptop ? 0 : insets.top }]}
      onTouchStart={handleScreenTouch}
    >
      {/* Laptops use the global DesktopHeader. Tablets and phones use this bar plus the bottom tabs. */}
      {!isLaptop && (
        <HomeHeader user={user} onAvatarPress={() => router.push('/profile')} />
      )}

      {/* Conditional Sticky Market Ticker */}
      <MarketTicker items={tickerItems} />

      {/* Scrollable Home Content */}
      <ScrollView
        style={[styles.scroll, isDesktop && styles.desktopScroll]}
        contentContainerStyle={isDesktop ? [styles.desktopScrollContent, { paddingHorizontal: spacing.padH, paddingTop: spacing.padTop, paddingBottom: spacing.padBottom }] : styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={pullEnabled}
            tintColor="#0071A9"
            colors={['#0071A9']}
          />
        )}
      >
        <FnoStatsProvider>
          {isDesktop ? (
            <View style={[styles.desktopContainer, { gap: spacing.sectionGap }]}>
              {/* Row 1: NIFTY and BANKNIFTY Side-by-Side */}
              <View style={[styles.desktopIndicesRow, relaxIndices && styles.desktopIndicesRowRelaxed, stackIndices && styles.desktopIndicesRowStacked, { gap: spacing.indicesGap }]}>
                <View style={[styles.desktopIndicesCol, relaxIndices && styles.desktopIndicesColRelaxed, stackIndices && styles.desktopIndicesColStacked]}>
                  <IndicesSection symbol="NIFTY" stackStats={stackIndexStats} />
                </View>
                <View style={[styles.desktopIndicesCol, relaxIndices && styles.desktopIndicesColRelaxed, stackIndices && styles.desktopIndicesColStacked]}>
                  <IndicesSection symbol="BANKNIFTY" stackStats={stackIndexStats} />
                </View>
              </View>

              {/* Row 2: FNO Profit Meter, Bulls vs. Bears, Market Sentimeter */}
              <View style={[styles.desktopMarketRow, { gap: spacing.marketColumnGap }]}>
                <View style={styles.desktopFnoCol}>
                  <FnoProfitMeter />
                </View>
                <View style={[styles.desktopSentimentCol, { maxWidth: spacing.sentimentMaxWidth }]}>
                  <MarketSentimenter />
                </View>     
                <View style={styles.desktopBullsCol}>
                  <BullVsBearSection />
                </View>

              </View>

              {/* Row 3: Trending Stocks + Trending Options */}
              <View style={[styles.desktopTrendingRow, { gap: spacing.trendingGap }]}>
                <View style={styles.desktopTrendingCol}>
                  <TrendingStocks />
                </View>
                <View style={styles.desktopTrendingCol}>
                  <TrendingOptions />
                </View>
              </View>

              {/* Row 4: Richmonks Premium Reports */}
              <View style={styles.desktopReportsCol}>
                <PremiumReports />
              </View>
            </View>
          ) : (
            <View style={styles.sections}>
              <IndicesSection />
              <View style={styles.sections}>
                <FnoProfitMeter />
                <BullVsBearSection />
              </View>
              <TrendingStocks />
              <TrendingOptions />
              <MarketSentimenter />
              <PremiumReports />
            </View>
          )}
        </FnoStatsProvider>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  desktopScroll: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  desktopScrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  sections: {
    gap: 20,
  },
  desktopContainer: {
    width: '100%',
    maxWidth: DESKTOP_MAX_WIDTH,
    alignSelf: 'center',
  },
  desktopIndicesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopIndicesRowRelaxed: {
    justifyContent: 'space-between',
  },
  desktopIndicesCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  desktopIndicesColRelaxed: {
    maxWidth: '46%',
  },
  desktopIndicesRowStacked: {
    flexDirection: 'column',
  },
  desktopIndicesColStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
    width: '100%',
  },
  desktopMarketRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopFnoCol: {
    flexGrow: 1.02,
    flexShrink: 1,
    flexBasis: 280,
    minWidth: 260,
  },
  desktopBullsCol: {
    flexGrow: 1.18,
    flexShrink: 1,
    flexBasis: 360,
    minWidth: 320,
  },
  desktopSentimentCol: {
    flexGrow: 0.75,
    flexShrink: 1,
    flexBasis: 260,
    minWidth: 220,
    alignSelf: 'stretch',
  },
  desktopTrendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  // Wraps to one table per row once two would be narrower than this.
  desktopTrendingCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 300,
    minWidth: 0,
  },
  desktopReportsCol: {
    width: '100%',
  },
});
