import { useMemo, useState } from 'react';
import { View, Text, Pressable, Animated, Platform, StyleSheet } from 'react-native';

import { BackChevronIcon, SearchIcon } from '@/components/icons/StockProfileIcons';
import { profileQuote } from '@/components/stock-profile/StockHeroCard';
import WatchlistButton from '@/components/stock-profile/WatchlistButton';
import SymbolLogo from '@/components/SymbolLogo';
import { useFluidStyles } from '@/utils/responsive';

const TEXT = '#0F172A';
const MUTED = '#64748B';

function strikeLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const num = parseFloat(raw.replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(num)) return raw;
  return Number.isInteger(num) ? String(Math.trunc(num)) : String(num);
}

export function useProfileHeaderScroll() {
  const [scrollY] = useState(() => new Animated.Value(0));
  const nativeDriver = Platform.OS !== 'web';
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: nativeDriver }),
    [nativeDriver, scrollY],
  );
  return { scrollY, onScroll, scrollEventThrottle: 16 };
}

export default function ProfileNavHeader({
  onBack,
  onSearch,
  scrollY,
  revealStart = 4000,
  revealEnd = 4024,
  symbol,
  price,
  priceChange,
  priceChangeValue,
  isOption,
  optionType,
  strike,
  watchlistAdded = false,
  watchlistDisabled = false,
  onWatchlist,
}) {
  const styles = useFluidStyles(createStyles);
  const quote = profileQuote({ price, price_change: priceChange, price_change_value: priceChangeValue });
  const meta = isOption ? [strikeLabel(strike), optionType].filter(Boolean).join(' ') : '';
  const start = Number.isFinite(revealStart) ? revealStart : 4000;
  const end = Math.max(Number.isFinite(revealEnd) ? revealEnd : start + 24, start + 20);
  const progress = useMemo(
    () => scrollY.interpolate({
      inputRange: [start, start + (end - start) * 0.55, end],
      outputRange: [0, 0.82, 1],
      extrapolate: 'clamp',
    }),
    [scrollY, start, end],
  );
  const translateY = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
    [progress],
  );
  const scale = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
    [progress],
  );

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.iconBtn, Platform.OS === 'web' ? styles.pointer : null]}>
        <BackChevronIcon size={24} />
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[styles.compact, { opacity: progress, transform: [{ translateY }, { scale }] }]}
      >
        <SymbolLogo key={symbol || 'logo'} symbol={symbol} size={styles.logo.width} />
        <View style={styles.copy}>
          <Text style={styles.symbol} numberOfLines={1} maxFontSizeMultiplier={1.1}>{symbol || '—'}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.1}>{meta}</Text> : null}
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price} numberOfLines={1} maxFontSizeMultiplier={1.1}>{quote.priceText}</Text>
          {quote.changePercent ? <Text style={[styles.change, { color: quote.changeColor }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{quote.changePercent}</Text> : null}
        </View>
      </Animated.View>
      <View style={styles.headerActions}>
        <WatchlistButton added={watchlistAdded} disabled={watchlistDisabled} onPress={onWatchlist} iconSize={22} style={styles.iconBtn} />
        <Pressable onPress={onSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search" style={[styles.iconBtn, styles.searchBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <SearchIcon size={22} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (f) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: f(56, 64),
    paddingLeft: f(8, 16),
    paddingRight: f(12, 16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    overflow: 'hidden',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: f(4, 6) },
  iconBtn: { width: f(40, 44), height: f(40, 44), alignItems: 'center', justifyContent: 'center' ,marginHorizontal: f(2, 4)},
  searchBtn: { marginRight: f(10, 14) },
  pointer: { cursor: 'pointer' },
  compact: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: f(8, 10),
    marginLeft: f(2, 4),
    marginRight: f(12, 14),
  },
  logo: { width: f(22, 26) },
  copy: { flexShrink: 1, minWidth: 0 },
  symbol: { fontSize: f(13.5, 15), lineHeight: f(17, 19), fontFamily: 'Inter_600SemiBold', color: TEXT },
  meta: { marginTop: 1, fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
  priceCol: { flexShrink: 0, marginLeft: f(8, 10), alignItems: 'flex-end' },
  price: { fontSize: f(13, 14.5), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: TEXT },
  change: { marginTop: 1, fontSize: f(10.5, 12), lineHeight: f(13, 15), fontFamily: 'Inter_600SemiBold' },
});
