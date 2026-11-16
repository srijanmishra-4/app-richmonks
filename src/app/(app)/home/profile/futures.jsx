import { RefreshScope } from '@/context/RefreshContext';

import FuturesProfileScreen from '@/screens/home/FuturesProfileScreen';

export default function FuturesProfileRoute() {
  return (
    <RefreshScope id="home">
      <FuturesProfileScreen />
    </RefreshScope>
  );
}
