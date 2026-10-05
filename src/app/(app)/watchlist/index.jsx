import { RefreshScope } from '@/context/RefreshContext';
import WatchlistScreen from '@/components/watchlist/WatchlistScreen';

export default function WatchlistRoute() {
  return (
    <RefreshScope id="watchlist">
      <WatchlistScreen />
    </RefreshScope>
  );
}
