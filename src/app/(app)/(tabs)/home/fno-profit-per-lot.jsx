import FnoProfitPerLotScreen from '@/screens/fno-profit-per-lot/FnoProfitPerLotScreen';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function FnoProfitPerLotRoute() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <FnoProfitPerLotScreen />;
  return <ReportDrawer><FnoProfitPerLotScreen /></ReportDrawer>;
}
