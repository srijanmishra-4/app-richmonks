import { memo, useCallback } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import ReportTimestamp from '@/components/reports/ReportTimestamp';
import { useFs } from '@/utils/responsive';

function ScreenHeader({ label, fallbackHref = '/home', compact = false, timestamp = '' }) {
  const fs = useFs();
  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  }, [fallbackHref]);

  return (
    <View style={[styles.header, compact ? styles.headerCompact : null]}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, compact ? styles.backBtnCompact : null, Platform.OS === 'web' ? styles.pointer : null]}>
        <View style={styles.backIcon}><ChevronRightIcon size={compact ? 18 : 22} color="#0F172A" /></View>
      </Pressable>
      <Text style={[styles.title, compact ? { fontSize: fs(15), lineHeight: fs(19) } : { fontSize: fs(17), lineHeight: fs(22) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text>
      <ReportTimestamp value={timestamp} />
    </View>
  );
}

export default memo(ScreenHeader);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, paddingTop: 10, paddingBottom: 10 },
  headerCompact: { paddingLeft: 8, paddingRight: 14, paddingTop: 6, paddingBottom: 6 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backBtnCompact: { width: 24, height: 24, marginRight: 8 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
});
