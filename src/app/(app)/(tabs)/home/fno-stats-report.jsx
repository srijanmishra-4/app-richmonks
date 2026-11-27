import FnoStatsReportScreen from '@/screens/fno-stats-report/FnoStatsReportScreen';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { RefreshScope } from '@/context/RefreshContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function FnoStatsReportRoute() {
  const { isLaptop } = useBreakpoint();
  const screen = (
    <RefreshScope id="fno-stats-report">
      <FnoStatsReportScreen />
    </RefreshScope>
  );
  if (!isLaptop) return screen;
  return <ReportDrawer>{screen}</ReportDrawer>;
}
