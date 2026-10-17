import { Platform, useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/constants/breakpoints';

/**
 * Layout information derived from the width that is actually available, not
 * from `Platform.OS`. A browser on a phone therefore reports `isPhone`, and a
 * tablet app reports `isTablet` instead of stretching the phone layout.
 *
 *   phone    width < 600
 *   tablet   600 ≤ width < 1024  (wide home layout + bottom tabs)
 *   laptop   width ≥ 1024        (wide home layout + desktop header + watchlist sidebar)
 *
 * `isDesktop` is the wide home layout (Nifty and Bank Nifty side by side, the
 * market row, trending, and reports) and is true for tablets and laptops.
 *
 * Prefer NativeWind's `sm:` / `lg:` class prefixes for styling; use this hook
 * when the decision changes structure or behaviour rather than just styles.
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  // A native iPad keeps the bottom tabs even in landscape, where the width
  // overlaps a laptop.
  const isNativePad = Platform.OS === 'ios' && Platform.isPad;
  const isLaptop = !isNativePad && width >= BREAKPOINTS.lg;
  // Native phones in landscape are wide but short, so they stay phones. Browser
  // windows are resized freely, so width alone decides there.
  const wideEnough = width >= BREAKPOINTS.sm && (Platform.OS === 'web' || shortSide >= BREAKPOINTS.sm);
  const isTablet = !isLaptop && wideEnough;

  return {
    width,
    height,
    isPhone: !isLaptop && !isTablet,
    isTablet,
    isDesktop: isLaptop || isTablet,
    isLaptop,
    atLeast: (name) => width >= BREAKPOINTS[name],
  };
}
