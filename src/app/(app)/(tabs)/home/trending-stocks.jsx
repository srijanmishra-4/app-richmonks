import TrendingStocksScreen from '@/screens/trending-stocks/TrendingStocksScreen';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function TrendingStocksRoute() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <TrendingStocksScreen />;
  return <ReportDrawer><TrendingStocksScreen /></ReportDrawer>;
}

