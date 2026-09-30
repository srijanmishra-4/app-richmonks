import { memo, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

/**
 * Horizontally auto-scrolling market ticker.
 * Data-driven — accepts `items` prop; renders nothing when empty.
 * Animation state is fully isolated; no parent re-renders.
 *
 * Expected item shape:
 * { symbol: string, price: string, status: string, logo?: ImageSource }
 */

const TICKER_SPEED = 50; // px per second — adjust to taste

function TickerContent({ items }) {
  return (
    <View style={styles.tickerRow}>
      {items.map((item, i) => (
        <View key={`${item.symbol}-${i}`} style={styles.tickerItem}>
          <Text style={styles.tickerSymbol}>{item.symbol}</Text>
          <Text style={styles.tickerPrice}>{item.price}</Text>
          {item.status ? <Text style={styles.tickerStatus}>({item.status})</Text> : null}
        </View>
      ))}
    </View>
  );
}

function MarketTicker({ items }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const contentWidth = useRef(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (!items?.length) return undefined;

    // Measure and animate after a short delay to let layout settle
    const timeout = setTimeout(() => {
      const width = contentWidth.current || items.length * 160;
      const duration = (width / TICKER_SPEED) * 1000;

      scrollX.setValue(0);
      animRef.current = Animated.loop(
        Animated.timing(scrollX, {
          toValue: -width,
          duration,
          useNativeDriver: true,
          isInteraction: false,
        }),
      );
      animRef.current.start();
    }, 100);

    return () => {
      clearTimeout(timeout);
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [items, scrollX]);

  if (!items?.length) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.animatedRow, { transform: [{ translateX: scrollX }] }]}
        onLayout={(e) => { contentWidth.current = e.nativeEvent.layout.width; }}
      >
        {/* Duplicate content for seamless loop */}
        <TickerContent items={items} />
        <TickerContent items={items} />
      </Animated.View>
    </View>
  );
}

export default memo(MarketTicker);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  animatedRow: {
    flexDirection: 'row',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  tickerSymbol: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
    marginRight: 6,
  },
  tickerPrice: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#0071A9',
    marginRight: 4,
  },
  tickerStatus: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
});
