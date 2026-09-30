import { useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/constants/breakpoints';

/**
 * Layout information derived from the width that is actually available, not
 * from `Platform.OS`. A browser on a phone therefore reports `isPhone`, and a
 * tablet app reports `isTablet` instead of stretching the phone layout.
 *
 * Prefer NativeWind's `md:` / `lg:` class prefixes for styling; use this hook
 * when the decision changes structure or behaviour rather than just styles.
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isPhone: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    atLeast: (name) => width >= BREAKPOINTS[name],
  };
}
