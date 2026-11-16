import BullVsBearScreen from '@/screens/bull-vs-bear/BullVsBearScreen';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function BullVsBearRoute() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <BullVsBearScreen />;
  return <ReportDrawer><BullVsBearScreen /></ReportDrawer>;
}

