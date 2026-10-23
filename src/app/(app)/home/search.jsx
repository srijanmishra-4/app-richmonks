import { Redirect } from 'expo-router';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import SearchScreen from '@/screens/search/SearchScreen';

export default function HomeSearchRoute() {
  const { isLaptop } = useBreakpoint();
  if (isLaptop) return <Redirect href="/home" />;
  return <SearchScreen />;
}
