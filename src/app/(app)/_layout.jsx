import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RefreshProvider, useActiveScreen } from '@/context/RefreshContext';

import {
  HomeContainIcon, HomeOutlineIcon,
  WatchlistContainIcon, WatchlistOutlineIcon,
  TradesContainIcon, TradesOutlineIcon,
} from '@/components/icons/NavIcons';

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255,255,255,0.55)';
const TAB_BG = '#0071A9';

const TAB_CONFIG = [
  { name: 'index', label: 'Home', ActiveIcon: HomeContainIcon, InactiveIcon: HomeOutlineIcon },
  { name: 'watchlist', label: 'Watchlist', ActiveIcon: WatchlistContainIcon, InactiveIcon: WatchlistOutlineIcon },
  { name: 'trades', label: 'My Trades', ActiveIcon: TradesContainIcon, InactiveIcon: TradesOutlineIcon },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const routeName = state.routes[state.index]?.name;
  const activeId = routeName === 'watchlist' ? 'watchlist' : routeName === 'trades' ? 'trades' : 'home';
  useActiveScreen(activeId);

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TAB_CONFIG.map((tab, i) => {
        const focused = state.index === i;
        const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
        const Icon = focused ? tab.ActiveIcon : tab.InactiveIcon;

        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(state.routes[i].name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            id={`tab-${tab.name}`}
            style={[styles.tabItem, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
          >
            <Icon size={22} color={color} />
            <Text style={[styles.tabLabel, { color, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  return (
    <RefreshProvider>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="watchlist" />
        <Tabs.Screen name="trades" />
      </Tabs>
    </RefreshProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
