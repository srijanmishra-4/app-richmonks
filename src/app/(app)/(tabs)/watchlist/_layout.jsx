import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';

import { useBreakpoint } from '@/hooks/useBreakpoint';

export const unstable_settings = {
  anchor: 'index',
};

function isWatchlistPath(pathname) {
  return pathname === '/watchlist' || pathname.startsWith('/watchlist/');
}

export default function WatchlistStackLayout() {
  const { isLaptop } = useBreakpoint();
  const pathname = usePathname();
  // The tab bar is hidden at the laptop breakpoint, and the list lives in the
  // home sidebar there. A direct /watchlist URL only stays when that bar is visible.
  const blocked = isLaptop && isWatchlistPath(pathname);

  useEffect(() => {
    if (blocked) router.replace('/home');
  }, [blocked]);

  return <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }} />;
}
