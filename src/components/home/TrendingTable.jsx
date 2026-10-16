import { memo, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Animated } from 'react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const BLUE_ACCENT = '#0071A9';
const BLUE_BG = '#F0F7FF';

// ─── Shared Trending Table ──────────────────────────────────────────────────────
// Reusable table layout for TrendingStocks & TrendingOptions.
// Columns config: [{ key, header, flex, align, render(row, report) }]

function TrendingTable({ columns, reports, selectedReport, onSelectReport, getRowData, loading = false, isOption = false }) {
  const { isDesktop } = useBreakpoint();
  const pulse = usePulse(loading);
  const reportFlex = isOption ? 1.3 : 1.2;

  return (
    <View style={styles.table} accessibilityState={{ busy: loading }}>
      {/* Column Headers */}
      <View style={styles.tableHeaderRow}>
        {columns.map((col, ci) => (
          <View key={col.key} style={colStyle(col, ci, reportFlex)}>
            <Text style={[styles.thText, isDesktop && styles.thTextDesktop, ci === 0 ? styles.reportHeaderText : null, textAlignStyle(col, ci)]} numberOfLines={2}>{col.header}</Text>
          </View>
        ))}
      </View>

      {/* Table Rows */}
      {reports.map((report) => {
        const isSelected = report.id === selectedReport;
        const row = getRowData(report.id);
        return (
          <View key={report.id} style={styles.tableRow}>
            {columns.map((col, ci) => (
              <View key={col.key} style={colStyle(col, ci, reportFlex)}>
                {ci === 0 ? (
                  <Pressable onPress={() => onSelectReport(report.id)} style={[styles.reportPill, isSelected ? styles.reportPillSelected : styles.reportPillUnselected, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityLabel={report.label}>
                    {isSelected ? <View style={styles.reportAccent} /> : null}
                    <Text style={[styles.reportLabel, isDesktop && styles.reportLabelDesktop, isSelected ? styles.reportLabelSelected : styles.reportLabelUnselected]} numberOfLines={3}>{report.label}</Text>
                  </Pressable>
                ) : loading ? (
                  <CellSkeleton pulse={pulse} align={col.align} lines={ci === 2 ? 1 : 2} />
                ) : (
                  col.render ? col.render(row, report) : null
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Header and body must share this exact flex box. minWidth 0 stops long
// labels from stretching a row wider than the header.
function colStyle(col, index, reportFlex) {
  const isReport = index === 0;
  return [
    styles.col,
    { flexGrow: isReport ? reportFlex : (col.flex ?? 1), flexShrink: 1, flexBasis: 0 },
    isReport ? styles.colReport : col.align === 'right' ? styles.colRight : styles.colLeft,
  ];
}

function textAlignStyle(col, index) {
  if (index === 0 || col.align !== 'right') return styles.textLeft;
  return styles.textRight;
}

function usePulse(active) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  return opacity;
}

function CellSkeleton({ pulse, align, lines }) {
  const right = align === 'right';
  return (
    <View style={[styles.skeletonCell, right ? styles.skeletonCellRight : null]}>
      <Animated.View style={[styles.skeletonBar, right ? styles.skeletonBarShort : styles.skeletonBarWide, { opacity: pulse }]} />
      {lines > 1 ? <Animated.View style={[styles.skeletonBar, styles.skeletonBarThin, right ? styles.skeletonBarTiny : styles.skeletonBarMid, { opacity: pulse }]} /> : null}
    </View>
  );
}

export default memo(TrendingTable);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  table: { borderTopWidth: 0, width: '100%' },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'stretch', width: '100%', minHeight: 42, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  thText: { alignSelf: 'stretch', fontSize: 12, fontFamily: 'Inter_700Bold', color: '#0F172A', lineHeight: 15 },
  thTextDesktop: { fontSize: 13, lineHeight: 16 },
  reportHeaderText: { paddingLeft: 8, paddingRight: 4 },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch', width: '100%', minHeight: 64, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  col: { minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', overflow: 'hidden' },
  colReport: { paddingRight: 4, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E2E8F0' },
  colLeft: { paddingLeft: 8, paddingRight: 4 },
  colRight: { paddingLeft: 4, paddingRight: 6 },
  reportPill: { width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: 8, overflow: 'hidden', paddingLeft: 8, paddingRight: 4 },
  reportPillSelected: { backgroundColor: BLUE_BG, paddingVertical: 6 },
  reportPillUnselected: { backgroundColor: 'transparent', paddingVertical: 4 },
  reportAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: BLUE_ACCENT },
  reportLabel: { flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 14 },
  reportLabelDesktop: { fontSize: 12, lineHeight: 16 },
  reportLabelSelected: { fontFamily: 'Inter_600SemiBold', color: BLUE_ACCENT },
  reportLabelUnselected: { fontFamily: 'Inter_500Medium', color: '#0F172A' },
  skeletonCell: { width: '100%', gap: 6 },
  skeletonCellRight: { alignItems: 'flex-end' },
  skeletonBar: { height: 10, borderRadius: 4, backgroundColor: '#E2E8F0' },
  skeletonBarThin: { height: 8 },
  skeletonBarWide: { width: '78%' },
  skeletonBarMid: { width: '52%' },
  skeletonBarShort: { width: 56 },
  skeletonBarTiny: { width: 40 },
});
