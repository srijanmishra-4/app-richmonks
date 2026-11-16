import { useId } from 'react';

import { RefreshScope } from '@/context/RefreshContext';

import FuturesProfileScreen from '@/screens/stock-profile/future/FuturesProfileScreen';

export default function FuturesProfileRoute() {
  const id = useId();
  return (
    <RefreshScope id={`profile-futures-${id}`}>
      <FuturesProfileScreen />
    </RefreshScope>
  );
}
