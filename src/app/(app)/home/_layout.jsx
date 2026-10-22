import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useFluid, SIDEBAR_WIDTH } from '@/utils/responsive';
import WatchlistScreen from '@/screens/watchlist/WatchlistScreen';

// Deep links to a report still land with Home underneath, so Back returns to /home.
export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  const { isLaptop } = useBreakpoint();
  const f = useFluid();

  if (!isLaptop) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <View style={styles.desktopShell}>
      {/* Watchlist sidebar on the left */}
      <View style={[styles.desktopSidebar, { width: f(SIDEBAR_WIDTH.min, SIDEBAR_WIDTH.max) }]}>
        <WatchlistScreen isSidebar />
      </View>
      {/* Main dashboard or report screen on the right */}
      <View style={styles.desktopMain}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="fno-profit-per-lot"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="bull-vs-bear"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="trending-stocks"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="trending-options"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack>
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

