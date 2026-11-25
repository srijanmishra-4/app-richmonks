import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ComingSoon from '@/components/reports/ComingSoon';

export default function TradesScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={1.1}>My Trades</Text>
      </View>
      <ComingSoon message="Your trades and portfolio will show up here once this is ready." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 20, lineHeight: 26, fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.3 },
});
