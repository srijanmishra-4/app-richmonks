import { Stack } from 'expo-router';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import ReportDrawer from '@/components/reports/ReportDrawer';

export default function HomeReportsLayout() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <Stack screenOptions={{ headerShown: false }} />;
  return (
    <ReportDrawer>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
    </ReportDrawer>
  );
}
