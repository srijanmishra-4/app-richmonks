import { RefreshScope } from '@/context/RefreshContext';
import HomeScreen from '@/screens/home/HomeScreen';

export default function HomeRoute() {
  return (
    <RefreshScope id="home">
      <HomeScreen />
    </RefreshScope>
  );
}
