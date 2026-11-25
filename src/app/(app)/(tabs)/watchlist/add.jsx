import { useBreakpoint } from '@/hooks/useBreakpoint';
import AddWatchlistScreen from '@/screens/watchlist/AddWatchlistScreen';

export default function AddWatchlistRoute() {
  const { isLaptop } = useBreakpoint();
  if (isLaptop) return null;

  return <AddWatchlistScreen />;
}
