import { memo, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Animated } from 'react-native';

const BLUE_ACCENT = '#0071A9';
const BLUE_BG = '#F0F7FF';

// ─── Shared Trending Table ──────────────────────────────────────────────────────
// Reusable table layout for TrendingStocks & TrendingOptions.
// Columns config: [{ key, header, flex, align, render(row, report) }]

function TrendingTable({ columns, reports, selectedReport, onSelectReport, getRowData, loading = false, isOption = false }) {
  const pulse = usePulse(loading);
  const reportFlex = isOption ? 1.3 : 1.2;

  return (
    <View style={styles.table} accessibilityState={{ busy: loading }}>
      {/* Column Headers */}
      <View style={styles.tableHeaderRow}>
        {columns.map((col, ci) => (
          <View key={col.key} style={[colFlex(col.flex), ci === 0 ? [styles.colReportHeader, { flex: reportFlex }] : col.align === 'right' ? styles.cellRight : styles.cellLeft]}>
            <Text style={[styles.thText, col.align === 'right' ? styles.textRight : styles.textLeft]} numberOfLines={2}>{col.header}</Text>
          </View>
        ))}
      </View>

      {/* Table Rows */}
      {reports.map((report) => {
        const isSelected = report.id === selectedReport;
        const row = getRowData(report.id);
        return (
          <View key={report.id} style={styles.tableRow}>
            {columns.map((col, ci) => {
              if (ci === 0) {
                return (
                  <View key={col.key} style={[styles.colReport, { flex: reportFlex }]}>
                    <Pressable onPress={() => onSelectReport(report.id)} style={[styles.reportPill, isSelected ? styles.reportPillSelected : styles.reportPillUnselected, Platform.OS === 'web' ? { cursor: 'pointer' } : null]} accessibilityRole="button" accessibilityLabel={report.label}>
                      {isSelected ? <View style={styles.reportAccent} /> : null}
                      <Text style={[styles.reportLabel, isSelected ? styles.reportLabelSelected : styles.reportLabelUnselected]} numberOfLines={3}>{report.label}</Text>
                    </Pressable>
                  </View>
                );
              }
              return (
                <View key={col.key} style={[colFlex(col.flex), col.align === 'right' ? styles.cellRight : styles.cellLeft]}>
                  {loading ? (
                    <CellSkeleton pulse={pulse} align={col.align} lines={ci === 2 ? 1 : 2} />
                  ) : (
                    col.render ? col.render(row, report) : null
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function colFlex(flex) {
  return { flex, height: '100%', justifyContent: 'center' };
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
  table: { borderTopWidth: 0 },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', height: 42, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  thText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#0F172A', lineHeight: 15 },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', height: 64, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  colReportHeader: { flex: 1.2, height: '100%', justifyContent: 'center', paddingRight: 5, borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  colReport: { flex: 1.2, alignSelf: 'stretch', justifyContent: 'center', paddingRight: 4, borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  reportPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, overflow: 'hidden' },
  reportPillSelected: { backgroundColor: BLUE_BG, paddingVertical: 6, paddingRight: 4 },
  reportPillUnselected: { backgroundColor: 'transparent', paddingVertical: 4 },
  reportAccent: { width: 2, alignSelf: 'stretch', backgroundColor: BLUE_ACCENT, marginRight: 6 },
  reportLabel: { flex: 1, fontSize: 10.5, lineHeight: 15 },
  reportLabelSelected: { fontFamily: 'Inter_600SemiBold', color: BLUE_ACCENT },
  reportLabelUnselected: { fontFamily: 'Inter_500Medium', color: '#0F172A' },
  cellLeft: { paddingLeft: 8, paddingRight: 4 },
  cellRight: { paddingLeft: 2, paddingRight: 6, alignItems: 'flex-end' },
  skeletonCell: { width: '100%', gap: 6 },
  skeletonCellRight: { alignItems: 'flex-end' },
  skeletonBar: { height: 10, borderRadius: 4, backgroundColor: '#E2E8F0' },
  skeletonBarThin: { height: 8 },
  skeletonBarWide: { width: '78%' },
  skeletonBarMid: { width: '52%' },
  skeletonBarShort: { width: 56 },
  skeletonBarTiny: { width: 40 },
});
