import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import ReportSideNav from '@/components/reports/ReportSideNav';

export default function HomeReportsLayout() {
  const { isLaptop } = useBreakpoint();
  if (!isLaptop) return <Stack screenOptions={{ headerShown: false }} />;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <ReportSideNav />
      <View style={{ width: '65%', maxWidth: '100%', alignSelf: 'stretch' }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}
