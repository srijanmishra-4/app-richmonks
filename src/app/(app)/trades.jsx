import { RefreshScope } from '@/context/RefreshContext';
import TradesScreen from '@/components/trades/TradesScreen';

export default function TradesRoute() {
  return (
    <RefreshScope id="trades">
      <TradesScreen />
    </RefreshScope>
  );
}
