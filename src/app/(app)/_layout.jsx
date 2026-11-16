import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { RefreshProvider } from '@/context/RefreshContext';
import { CommonDataProvider } from '@/context/CommonDataContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import DesktopHeader from '@/components/home/DesktopHeader';
import { armLineGraphOutsideDismiss } from '@/components/LineGraph';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function AppLayout() {
  const { isLaptop } = useBreakpoint();

  return (
    <CommonDataProvider>
      <RefreshProvider>
        <View style={styles.appContainer} onTouchStartCapture={armLineGraphOutsideDismiss}>
          {isLaptop && <DesktopHeader />}
          <View style={styles.navigator}>
            <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }} />
          </View>
        </View>
      </RefreshProvider>
    </CommonDataProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navigator: {
    flex: 1,
  },
});
