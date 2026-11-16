import { useId } from 'react';

import { RefreshScope } from '@/context/RefreshContext';

import OptionProfileScreen from '@/screens/stock-profile/option/OptionProfileScreen';

export default function OptionsProfileRoute() {
  const id = useId();
  return (
    <RefreshScope id={`profile-options-${id}`}>
      <OptionProfileScreen />
    </RefreshScope>
  );
}
