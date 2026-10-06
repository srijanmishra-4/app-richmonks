import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ComingSoon from '@/components/reports/ComingSoon';
import ScreenHeader from '@/components/ScreenHeader';

function StockRankReportScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Stock Rank" />
      <ComingSoon />
    </SafeAreaView>
  );
}

export default memo(StockRankReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
});
