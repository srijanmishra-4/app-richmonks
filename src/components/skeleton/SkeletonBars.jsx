import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

export function usePulse(active) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);
  return opacity;
}

export function SkeletonBar({ pulse, width = '78%', height = 10, style }) {
  return <Animated.View style={[styles.bar, { height, opacity: pulse }, typeof width === 'number' ? { width } : { width }, style]} />;
}

export function SkeletonMetaRow({ pulse, showRight = true }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaLeft}>
        <SkeletonBar pulse={pulse} width={72} height={9} />
        <SkeletonBar pulse={pulse} width={88} height={11} />
      </View>
      {showRight ? <SkeletonBar pulse={pulse} width={64} height={9} /> : null}
    </View>
  );
}

export function SkeletonSummaryCard({ pulse, style }) {
  return (
    <View style={[styles.summaryCard, style]}>
      {[0, 1].map((side) => (
        <View key={side} style={styles.summaryItem}>
          <SkeletonBar pulse={pulse} width={44} height={9} />
          <SkeletonBar pulse={pulse} width={80} height={18} />
          <SkeletonBar pulse={pulse} width={36} height={12} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonListRows({ count = 8, pulse, RowComponent }) {
  return Array.from({ length: count }, (_, index) => <RowComponent key={`skeleton-${index}`} pulse={pulse} index={index} />);
}

const styles = StyleSheet.create({
  bar: { borderRadius: 4, backgroundColor: '#E2E8F0' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  summaryCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
