import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ComingSoon from '@/components/reports/ComingSoon';
import ScreenHeader from '@/components/ScreenHeader';

function MarketInternalsReportScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Market Internals" />
      <ComingSoon />
    </SafeAreaView>
  );
}

export default memo(MarketInternalsReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
});
