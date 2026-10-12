import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, Platform, StyleSheet, Animated } from 'react-native';

const ROW_GAP = 4;
const PAD_H = 8;
const INSET = 8;

// ─── Common Table ───────────────────────────────────────────────────────────────
//   <CommonTable data={rows} columns={cols} HeaderComponent={H} RowComponent={R} loading={loading} />
// `columns`: [{ flex, align?, lines?, bars? }] — drives loading skeleton row layout.

function defaultKeyExtractor(item, index) {
  return String(item?.id ?? item?.symbol ?? index);
}

function compareValues(a, b) {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1;
  if (b == null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function sortRows(data, sort) {
  if (!Array.isArray(data)) return [];
  if (typeof sort?.getValue !== 'function') return data;
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...data].sort((rowA, rowB) => {
    const a = sort.getValue(rowA);
    const b = sort.getValue(rowB);
    const blank = a == null || a === '' || b == null || b === '';
    return blank ? compareValues(a, b) : compareValues(a, b) * dir;
  });
}

const SKELETON_PLACEHOLDERS = Array.from({ length: 10 }, (_, index) => ({ __skeleton: true, id: index }));

function useSkeletonPulse(active) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);
  return opacity;
}

function skeletonBarsForColumn(column) {
  if (Array.isArray(column?.bars) && column.bars.length) return column.bars;
  const lines = column?.lines ?? (column?.align === 'right' ? 2 : 1);
  if (column?.align === 'right') return lines <= 1 ? [48] : [52, 36];
  if (column?.align === 'center') return lines <= 1 ? [44] : [44, 32];
  return lines <= 1 ? ['62%'] : ['68%', 52];
}

function TableSkeletonBar({ pulse, width, height = 10 }) {
  return <Animated.View style={[skeletonStyles.bar, { height, opacity: pulse }, typeof width === 'number' ? { width } : { width }]} />;
}

function TableSkeletonRow({ pulse, columns }) {
  if (!columns?.length) return null;
  return (
    <>
      {columns.map((column, index) => {
        const align = column.align ?? 'left';
        const alignStyle = align === 'right' ? skeletonStyles.cellRight : align === 'center' ? skeletonStyles.cellCenter : null;
        const bars = skeletonBarsForColumn(column);
        return (
          <View key={index} style={[skeletonStyles.cell, { flex: column.flex ?? 1 }, alignStyle]}>
            {bars.map((bar, barIndex) => {
              const w = typeof bar === 'object' ? bar.width : bar;
              const h = typeof bar === 'object' ? (bar.height ?? (barIndex > 0 ? 8 : 10)) : (barIndex > 0 ? 8 : 10);
              return <TableSkeletonBar key={barIndex} pulse={pulse} width={w} height={h} />;
            })}
          </View>
        );
      })}
    </>
  );
}

function CommonTable({ data, columns, HeaderComponent, RowComponent, loading = false, skeletonRowCount = 10, keyExtractor = defaultKeyExtractor, initialSort = null, minWidth, emptyText = 'No data to show', style, rowStyle }) {
  const [sort, setSort] = useState(initialSort);
  const pulse = useSkeletonPulse(loading);
  const showSkeleton = loading && columns?.length > 0;

  const handleSort = useCallback((column) => {
    if (!column?.key) return;
    setSort((prev) => (prev?.key === column.key
      ? { ...prev, ...column, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { dir: 'asc', ...column }));
  }, []);

  const rows = useMemo(() => sortRows(data, sort), [data, sort]);
  const listData = showSkeleton ? SKELETON_PLACEHOLDERS.slice(0, skeletonRowCount) : rows;

  const renderItem = useCallback(({ item, index }) => (
    showSkeleton ? (
      <View style={[styles.row, rowStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <TableSkeletonRow pulse={pulse} columns={columns} />
      </View>
    ) : (
      <View style={[styles.row, rowStyle]}><RowComponent data={item} index={index} /></View>
    )
  ), [RowComponent, showSkeleton, pulse, columns, rowStyle]);

  const table = (
    <View style={[styles.table, minWidth ? { minWidth } : null]}>
      <View style={styles.header}>{HeaderComponent ? <HeaderComponent sort={sort} onSort={handleSort} /> : null}</View>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={showSkeleton ? (_, index) => `skeleton-${index}` : keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={showSkeleton ? null : <View style={styles.empty}><Text style={styles.emptyText}>{emptyText}</Text></View>}
        showsVerticalScrollIndicator={false}
        accessibilityState={{ busy: loading }}
      />
    </View>
  );

  if (!minWidth) return <View style={[styles.root, style]}>{table}</View>;
  return (
    <View style={[styles.root, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hContent}>{table}</ScrollView>
    </View>
  );
}

export default memo(CommonTable);

export function TableHeaderCell({ label, flex = 1, align = 'left', sortKey, getValue, sort, onSort, style }) {
  const sortable = !!sortKey && typeof getValue === 'function' && typeof onSort === 'function';
  const active = sortable && sort?.key === sortKey;
  const alignStyle = align === 'right' ? styles.cellRight : align === 'center' ? styles.cellCenter : null;

  const arrow = active ? <Text style={[styles.hArrow, styles.hArrowActive]}>{sort.dir === 'desc' ? '▾' : '▴'}</Text> : null;

  return (
    <Pressable disabled={!sortable} onPress={() => onSort({ key: sortKey, getValue })} style={[styles.hCell, { flex }, alignStyle, sortable && Platform.OS === 'web' ? styles.pointer : null, style]} accessibilityRole={sortable ? 'button' : 'header'} accessibilityLabel={label}>
      {align === 'right' ? arrow : null}
      <Text style={[styles.hLabel, align === 'right' ? styles.hLabelRight : align === 'center' ? styles.textCenter : null, active ? styles.hLabelActive : null]} numberOfLines={2}>{label}</Text>
      {align === 'right' ? null : arrow}
    </Pressable>
  );
}

const skeletonStyles = StyleSheet.create({
  cell: { minWidth: 0, justifyContent: 'center', paddingRight: 4, gap: 4 },
  cellRight: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 4 },
  cellCenter: { alignItems: 'center' },
  bar: { borderRadius: 4, backgroundColor: '#E2E8F0' },
});

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  hContent: { flexGrow: 1, alignItems: 'stretch', minHeight: '100%' },
  table: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: INSET, paddingHorizontal: PAD_H, paddingTop: 4, paddingBottom: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', zIndex: 1 },
  list: { flex: 1, minHeight: 0 },
  listContent: { flexGrow: 1, paddingTop: 2, paddingBottom: 12, gap: ROW_GAP },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: INSET, paddingHorizontal: PAD_H, paddingVertical: 6, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E4E8EE', backgroundColor: '#FFFFFF' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  hCell: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingRight: 4 },
  cellRight: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 4 },
  cellCenter: { justifyContent: 'center' },
  hLabel: { flexShrink: 1, fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase' },
  hLabelActive: { color: '#64748B' },
  hLabelRight: { flex: 1, textAlign: 'right', letterSpacing: 0 },
  textCenter: { textAlign: 'center' },
  hArrow: { fontSize: 8, lineHeight: 13, color: '#CBD5E1' },
  hArrowActive: { color: '#64748B' },
  pointer: { cursor: 'pointer' },
});
