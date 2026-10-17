import { memo } from 'react';
import { View, Text, Image, TextInput, Pressable, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { SearchIcon } from '@/components/icons/NavIcons';
import { getInitials } from '@/components/home/HomeHeader';
import { useFluidStyles } from '@/utils/responsive';

const logoAsset = require('@/assets/logo.png');

function ChevronDownIcon({ size = 12, color = '#64748B' }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderBottomWidth: 1.5,
          borderRightWidth: 1.5,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateY: -1 }],
        }}
      />
    </View>
  );
}

function DesktopHeader() {
  const { user } = useAuth();
  const pathname = usePathname() || '';
  const initials = getInitials(user?.full_name);
  const styles = useFluidStyles(createStyles);

  const isHome = pathname.startsWith('/home') || pathname === '/' || pathname === '';
  const isTrades = pathname.startsWith('/trades');

  return (
    <View style={styles.container}>
      {/* 1. Richmonks Logo on left */}
      <Pressable
        onPress={() => router.push('/home')}
        style={[styles.logoBtn, Platform.OS === 'web' ? styles.pointer : null]}
        accessibilityRole="link"
        accessibilityLabel="Richmonks Home"
      >
        <Image
          source={logoAsset}
          resizeMode="contain"
          style={styles.logoImage}
          accessibilityLabel="Richmonks Logo"
        />
      </Pressable>

      {/* 2. Flexible Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search stocks, futures, options..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* 3. Navigation Links & 5. Profile */}
      <View style={styles.navGroup}>
        {/* Home Tab */}
        <Pressable
          onPress={() => router.push('/home')}
          style={[styles.navItem, Platform.OS === 'web' ? styles.pointer : null]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isHome }}
          accessibilityLabel="Home"
        >
          <Text style={[styles.navLabel, isHome ? styles.navLabelActive : null]}>
            Home
          </Text>
        </Pressable>

        {/* My Trades Tab */}
        <Pressable
          onPress={() => router.push('/trades')}
          style={[styles.navItem, Platform.OS === 'web' ? styles.pointer : null]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isTrades }}
          accessibilityLabel="My Trades"
        >
          <Text style={[styles.navLabel, isTrades ? styles.navLabelActive : null]}>
            My Trades
          </Text>
        </Pressable>

        {/* Profile Avatar & Menu */}
        <Pressable
          onPress={() => router.push('/profile')}
          style={[styles.profileBtn, Platform.OS === 'web' ? styles.pointer : null]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <ChevronDownIcon size={12} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

export default memo(DesktopHeader);

const createStyles = (f) => ({
  container: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100,
  },
  logoBtn: {
    paddingVertical: 4,
    justifyContent: 'center',
  },
  logoImage: {
    width: 140,
    height: 34,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 580,
    marginHorizontal: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: f(13, 15),
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    padding: 0,
    outlineWidth: 0,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navLabel: {
    fontSize: f(13, 16),
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  navLabelActive: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0071A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: f(12, 14),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pointer: {
    cursor: 'pointer',
  },
});
