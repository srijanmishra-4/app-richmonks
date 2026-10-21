import { memo } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';

import { REPORT_ITEMS } from '@/components/home/PremiumReports';

function ReportSideNav() {
  const pathname = usePathname() || '';

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Reports</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {REPORT_ITEMS.map(({ label, Icon, href }) => {
          const active = pathname === href;
          return (
            <Pressable
              key={href}
              onPress={() => { if (!active) router.replace(href); }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={({ hovered, pressed }) => [
                styles.item,
                active ? styles.itemActive : hovered ? styles.itemHover : null,
                pressed && !active ? styles.itemPressed : null,
                Platform.OS === 'web' ? styles.pointer : null,
              ]}
            >
              <View style={styles.iconSlot}>
                <Icon size={32} />
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(ReportSideNav);

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 220, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingTop: 20, paddingHorizontal: 12 },
  heading: { fontSize: 11, lineHeight: 14, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold', color: '#94A3B8', textTransform: 'uppercase', paddingHorizontal: 10, marginBottom: 12 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, gap: 16 },
  item: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  itemHover: { backgroundColor: '#F4F7FA' },
  itemPressed: { backgroundColor: '#EEF2F6' },
  itemActive: { backgroundColor: '#E7F3FB', borderLeftColor: '#0071A9' },
  iconSlot: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 14, lineHeight: 18, fontFamily: 'Inter_500Medium', color: '#334155' },
  labelActive: { fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  pointer: { cursor: 'pointer' },
});
