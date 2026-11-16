import { RefreshScope } from '@/context/RefreshContext';
import WatchlistScreen from '@/screens/watchlist/WatchlistScreen';

export default function WatchlistRoute() {
  return (
    <RefreshScope id="watchlist">
      <WatchlistScreen />
    </RefreshScope>
  );
}
