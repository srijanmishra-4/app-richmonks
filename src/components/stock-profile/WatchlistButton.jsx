import { useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text } from 'react-native';

import { BookmarkIcon } from '@/components/icons/StockProfileIcons';

const NATIVE = Platform.OS !== 'web';

export default function WatchlistButton({ added = false, disabled = false, onPress, iconSize = 22, label, labelStyle, style }) {
  const [scale] = useState(() => new Animated.Value(1));

  const press = () => {
    if (disabled || !onPress) return;
    scale.stopAnimation();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.86, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: NATIVE }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={press}
      disabled={disabled || !onPress}
      hitSlop={label ? undefined : 8}
      accessibilityRole="button"
      accessibilityState={{ selected: added, disabled: disabled || !onPress }}
      accessibilityLabel={added ? 'Remove from watchlist' : 'Add to watchlist'}
      style={[style, Platform.OS === 'web' ? { cursor: disabled || !onPress ? 'default' : 'pointer' } : null]}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: label ? 6 : 0, transform: [{ scale }] }}>
        <BookmarkIcon size={iconSize} filled={added} />
        {label ? <Text style={labelStyle} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}
