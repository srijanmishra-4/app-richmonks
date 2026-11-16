import OiChangesReportScreen from '@/screens/reports/OiChangesReportScreen';
import { RefreshScope } from '@/context/RefreshContext';

export default function OiChangesReportRoute() {
  return (
    <RefreshScope id="home">
      <OiChangesReportScreen />
    </RefreshScope>
  );
}
