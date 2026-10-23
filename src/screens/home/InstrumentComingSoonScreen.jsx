import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import ComingSoon from '@/components/reports/ComingSoon';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function InstrumentComingSoonScreen({ title }) {
  const { isLaptop } = useBreakpoint();
  const content = (
    <>
      <ScreenHeader label={title} />
      <ComingSoon />
    </>
  );
  if (isLaptop) return <View style={styles.fill}>{content}</View>;
  return <SafeAreaView style={styles.fill} edges={['top']}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#FFFFFF' },
});
