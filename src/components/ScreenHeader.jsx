import { memo, useCallback } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import ReportTimestamp from '@/components/reports/ReportTimestamp';
import { useFluidStyles } from '@/utils/responsive';

function ScreenHeader({ label, fallbackHref = '/home', compact = false, timestamp = '', style }) {
  const styles = useFluidStyles(createStyles);
  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  }, [fallbackHref]);

  return (
    <View style={[styles.header, compact ? styles.headerCompact : null, style]}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, compact ? styles.backBtnCompact : null, Platform.OS === 'web' ? styles.pointer : null]}>
        <View style={styles.backIcon}><ChevronRightIcon size={compact ? 18 : 22} color="#0F172A" /></View>
      </Pressable>
      <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text>
      <ReportTimestamp value={timestamp} />
    </View>
  );
}

export default memo(ScreenHeader);

const createStyles = (f) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: f(8, 20), paddingRight: f(16, 28), paddingTop: f(10, 16), paddingBottom: f(10, 16) },
  headerCompact: { paddingLeft: f(8, 16), paddingRight: f(14, 20), paddingTop: f(6, 10), paddingBottom: f(6, 10) },
  backBtn: { width: f(28, 34), height: f(28, 34), alignItems: 'center', justifyContent: 'center', marginRight: f(8, 12) },
  backBtnCompact: { width: f(24, 28), height: f(24, 28), marginRight: f(8, 10) },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontFamily: 'Inter_600SemiBold', color: '#0F172A', fontSize: f(17, 20), lineHeight: f(22, 26) },
  titleCompact: { fontSize: f(15, 17), lineHeight: f(19, 22) },
});
