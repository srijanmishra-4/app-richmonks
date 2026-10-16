import { memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import {
  FutureReportIcon, OiChangesReportIcon, MarketInternalsReportIcon,
  HeatMapReportIcon, StockRankReportIcon, ShiftingGearsReportIcon,
  IndicesOptionReportIcon, MostActiveOptionsReportIcon, CallPutValueReportIcon,
} from '@/components/icons/HomeReportIcons';

// ─── Report Rows (exact reference order) ───────────────────────────────────────

const ROWS = [
  [
    { label: 'Future', Icon: FutureReportIcon, href: '/home/reports/future' },
    { label: 'OI Changes', Icon: OiChangesReportIcon, href: '/home/reports/oi-changes' },
    { label: 'Market Internals', Icon: MarketInternalsReportIcon, href: '/home/reports/market-internals' },
  ],
  [
    { label: 'Heat Map', Icon: HeatMapReportIcon, href: '/home/reports/heat-map' },
    { label: 'Stock Rank', Icon: StockRankReportIcon, href: '/home/reports/stock-rank' },
    { label: 'Shifting Gears', Icon: ShiftingGearsReportIcon, href: '/home/reports/shifting-gears' },
  ],
  [
    { label: 'Indices Option', Icon: IndicesOptionReportIcon, href: '/home/reports/indices-option' },
    { label: 'Most Active Options', Icon: MostActiveOptionsReportIcon, href: '/home/reports/most-active-options' },
    { label: 'Call/Put value', Icon: CallPutValueReportIcon, href: '/home/reports/call-put-value' },
  ],
];

import { useBreakpoint } from '@/hooks/useBreakpoint';

// ─── Component ─────────────────────────────────────────────────────────────────

function PremiumReports() {
  const { width } = useWindowDimensions();
  const { isDesktop } = useBreakpoint();
  const compact = width < 360;
  const iconSize = compact ? 32 : isDesktop ? 38 : 36;

  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      <Text style={styles.title}>Richmonks Premium Reports</Text>
      {ROWS.map((row, ri) => (
        <View key={ri} style={[styles.row, isDesktop && styles.desktopRow, compact && styles.rowCompact, ri > 0 && styles.rowDivider]}>
          {row.map(({ label, Icon, href }, ci) => {
            const itemStyle = [styles.item, ci === 1 && styles.itemCenter, href && Platform.OS === 'web' ? styles.pointer : null];
            const body = (
              <>
                <Icon size={iconSize} />
                <Text style={[styles.label, isDesktop && styles.desktopLabel, compact && styles.labelCompact]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
              </>
            );
            if (!href) return <View key={label} style={itemStyle}>{body}</View>;
            return (
              <Pressable key={label} onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={label} style={itemStyle}>
                {body}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default memo(PremiumReports);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  desktopContainer: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A', marginBottom: 12 },
  row: { flexDirection: 'row', paddingVertical: 36 },
  desktopRow: { paddingVertical: 26 },
  rowCompact: { paddingVertical: 30 },
  rowDivider: { borderTopWidth: 1, borderColor: '#E2E8F0' },
  item: { flex: 1, alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  itemCenter: { flex: 1.25 },
  label: { fontSize: 12.5, lineHeight: 17, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'center' },
  desktopLabel: { fontSize: 13, lineHeight: 18 },
  labelCompact: { fontSize: 11.5, lineHeight: 15 },
  pointer: { cursor: 'pointer' },
});
