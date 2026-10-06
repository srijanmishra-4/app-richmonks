import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ComingSoon from '@/components/reports/ComingSoon';
import ScreenHeader from '@/components/ScreenHeader';

function CallPutValueReportScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Call/Put value" />
      <ComingSoon />
    </SafeAreaView>
  );
}

export default memo(CallPutValueReportScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
});
