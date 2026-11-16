import TrendingOptionsScreen from '@/screens/trending-options/TrendingOptionsScreen';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function TrendingOptionsRoute() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <TrendingOptionsScreen />;
  return <ReportDrawer><TrendingOptionsScreen /></ReportDrawer>;
}

