import { useCallback, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useScreenRefresh } from '@/context/RefreshContext';
import { dismissAllLineGraphTooltips, lastLineGraphTouchTime } from '@/components/LineGraph';
import HomeHeader from '@/components/home/HomeHeader';
import MarketTicker from '@/components/home/MarketTicker';

import IndicesSection from '@/components/home/IndicesSection';

// Ticker data will eventually come from Socket.IO — pass empty array to hide the ticker for now.
const tickerItems = [];

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
      style={[styles.root, { paddingTop: insets.top }]}
      onTouchStart={handleScreenTouch}
    >
      {/* Fixed Header */}
      <HomeHeader user={user} />

      {/* Conditional Sticky Market Ticker */}
      <MarketTicker items={tickerItems} />

      {/* Scrollable Home Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        <IndicesSection />
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
  scrollContent: {
    flexGrow: 1,
  },
});
