import { useLocalSearchParams } from 'expo-router';

import ReportScreen from '@/screens/reports/ReportScreen';
import { RefreshScope } from '@/context/RefreshContext';

function paramString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function HomeReportRoute() {
  const { report } = useLocalSearchParams();
  const slug = paramString(report);
  return (
    <RefreshScope id="home">
      <ReportScreen key={slug} slug={slug} />
    </RefreshScope>
  );
}
