import { RefreshScope } from '@/context/RefreshContext';
import TradesScreen from '@/screens/trades/TradesScreen';

export default function TradesRoute() {
  return (
    <RefreshScope id="trades">
      <TradesScreen />
    </RefreshScope>
  );
}
