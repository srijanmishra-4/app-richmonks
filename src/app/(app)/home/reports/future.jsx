import FutureReportScreen from '@/screens/reports/FutureReportScreen';
import { RefreshScope } from '@/context/RefreshContext';

export default function FutureReportRoute() {
  return (
    <RefreshScope id="home">
      <FutureReportScreen />
    </RefreshScope>
  );
}
