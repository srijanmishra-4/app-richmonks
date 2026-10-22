import { memo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { REPORT_ITEMS } from '@/components/home/PremiumReports';
import { useFluidStyles } from '@/utils/responsive';

function ReportSideNav() {
  const styles = useFluidStyles(createStyles);
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

const createStyles = (f) => ({
  root: { flex: 1, minWidth: f(220, 260), backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingTop: f(20, 28), paddingHorizontal: f(12, 16) },
  heading: { fontSize: f(11, 13), lineHeight: f(14, 16), letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold', color: '#94A3B8', textTransform: 'uppercase', paddingHorizontal: f(10, 14), marginBottom: f(12, 16) },
  scroll: { flex: 1 },
  content: { paddingBottom: f(24, 32), gap: f(12, 16) },
  item: { minHeight: f(58, 66), flexDirection: 'row', alignItems: 'center', gap: f(12, 16), paddingVertical: f(8, 10), paddingLeft: f(8, 12), paddingRight: f(12, 16), borderRadius: f(10, 12), borderLeftWidth: 3, borderLeftColor: 'transparent' },
  itemHover: { backgroundColor: '#F4F7FA' },
  itemPressed: { backgroundColor: '#EEF2F6' },
  itemActive: { backgroundColor: '#E7F3FB', borderLeftColor: '#0071A9' },
  iconSlot: { width: f(48, 54), height: f(40, 46), alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: f(14, 15.5), lineHeight: f(18, 22), fontFamily: 'Inter_500Medium', color: '#334155' },
  labelActive: { fontFamily: 'Inter_600SemiBold', color: '#0071A9' },
  pointer: { cursor: 'pointer' },
});
