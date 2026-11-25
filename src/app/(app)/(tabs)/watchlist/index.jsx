import { RefreshScope } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import WatchlistScreen from '@/screens/watchlist/WatchlistScreen';

export default function WatchlistRoute() {
  const { isLaptop } = useBreakpoint();
  if (isLaptop) return null;

  return (
    <RefreshScope id="watchlist">
      <WatchlistScreen />
    </RefreshScope>
  );
}
