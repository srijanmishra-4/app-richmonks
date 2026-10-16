import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RefreshProvider, useActiveScreen } from '@/context/RefreshContext';
import { CommonDataProvider } from '@/context/CommonDataContext';
import { useFs } from '@/utils/responsive';

import {
  HomeContainIcon, HomeOutlineIcon,
  WatchlistContainIcon, WatchlistOutlineIcon,
  TradesContainIcon, TradesOutlineIcon,
} from '@/components/icons/NavIcons';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import DesktopHeader from '@/components/home/DesktopHeader';

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255,255,255,0.55)';
const TAB_BG = '#0071A9';

const TAB_CONFIG = [
  { name: 'home', label: 'Home', ActiveIcon: HomeContainIcon, InactiveIcon: HomeOutlineIcon },
  { name: 'watchlist', label: 'Watchlist', ActiveIcon: WatchlistContainIcon, InactiveIcon: WatchlistOutlineIcon },
  { name: 'trades', label: 'My Trades', ActiveIcon: TradesContainIcon, InactiveIcon: TradesOutlineIcon },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const fs = useFs();
  const focusedRoute = state.routes[state.index];
  const routeName = focusedRoute?.name;
  const activeId = routeName === 'watchlist' ? 'watchlist' : routeName === 'trades' ? 'trades' : 'home';
  useActiveScreen(activeId);

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TAB_CONFIG.map((tab) => {
        const focused = routeName === tab.name || (tab.name === 'home' && routeName === 'index');
        const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
        const Icon = focused ? tab.ActiveIcon : tab.InactiveIcon;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              const currentRoute = state.routes[state.index];
              const currentName = currentRoute?.name === 'index' ? 'home' : currentRoute?.name;
              if (currentName !== tab.name && currentRoute?.state?.index > 0) {
                navigation.navigate(currentName, { screen: 'index' });
              }
              navigation.navigate(tab.name, { screen: 'index' });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            id={`tab-${tab.name}`}
            style={[styles.tabItem, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
          >
            <Icon size={22} color={color} />
            <Text style={[styles.tabLabel, { fontSize: fs(11), color, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_400Regular' }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: 'home',
};

export default function AppLayout() {
  const { isDesktop } = useBreakpoint();

  return (
    <CommonDataProvider>
      <RefreshProvider>
        <View style={styles.appContainer}>
          {isDesktop && <DesktopHeader />}
          <Tabs
            tabBar={(props) => (isDesktop ? null : <TabBar {...props} />)}
            backBehavior="history"
            screenOptions={{
              headerShown: false,
              tabBarStyle: isDesktop ? { display: 'none' } : undefined,
            }}
          >
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="home" />
            <Tabs.Screen name="watchlist" />
            <Tabs.Screen name="trades" />
          </Tabs>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    paddingTop: 6,
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
