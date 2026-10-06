import { memo, useCallback } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';

function ScreenHeader({ label, fallbackHref = '/home' }) {
  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  }, [fallbackHref]);

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
        <View style={styles.backIcon}><ChevronRightIcon size={22} color="#0F172A" /></View>
      </Pressable>
      <Text style={styles.title} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export default memo(ScreenHeader);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, paddingTop: 16, paddingBottom: 14 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
});
