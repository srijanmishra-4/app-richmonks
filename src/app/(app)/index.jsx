import { RefreshScope } from '@/context/RefreshContext';
import HomeScreen from '@/components/home/HomeScreen';

export default function HomeRoute() {
  return (
    <RefreshScope id="home">
      <HomeScreen />
    </RefreshScope>
  );
}
