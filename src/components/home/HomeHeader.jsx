import { memo } from 'react';
import { View, Text, Image, Pressable, Platform, StyleSheet } from 'react-native';

import { SearchIcon } from '@/components/icons/NavIcons';
import { useFluidStyles } from '@/utils/responsive';

const rmIcon = require('@/assets/icon.png');

export function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function HomeHeader({ user, onAvatarPress }) {
  const initials = getInitials(user?.full_name);
  const styles = useFluidStyles(createStyles);

  return (
    <View style={styles.container}>
      {/* RM Icon */}
      <Image source={rmIcon} resizeMode="contain" style={styles.icon} accessibilityLabel="RichMonks icon" />

      {/* Search Bar */}
      <Pressable style={styles.searchBar} accessibilityRole="button" accessibilityLabel="Search Futures Options" id="home-search-bar">
        <SearchIcon size={18} color="#94A3B8" />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>Search Futures Options</Text>
      </Pressable>

      {/* Profile Avatar */}
      <Pressable onPress={onAvatarPress} disabled={!onAvatarPress} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Open profile" id="home-open-profile">
        <Text style={styles.avatarText}>{initials}</Text>
      </Pressable>
    </View>
  );
}

export default memo(HomeHeader);

const createStyles = (f) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  icon: {
    width: 34,
    height: 34,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  searchPlaceholder: {
    fontSize: f(14),
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0071A9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  avatarText: {
    fontSize: f(14),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
