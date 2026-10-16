import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import WatchlistScreen from '@/screens/watchlist/WatchlistScreen';

// Deep links to a report still land with Home underneath, so Back returns to /home.
export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <View style={styles.desktopShell}>
      {/* Fixed Watchlist sidebar on the left */}
      <View style={styles.desktopSidebar}>
        <WatchlistScreen isSidebar />
      </View>
      {/* Main dashboard or report screen on the right */}
      <View style={styles.desktopMain}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  desktopSidebar: {
    width: 420,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  desktopMain: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
