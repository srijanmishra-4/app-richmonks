import { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, Platform, StyleSheet } from 'react-native';

const ROW_GAP = 4;
const PAD_H = 8;
const INSET = 8;

// ─── Common Table ───────────────────────────────────────────────────────────────
// Reusable table shell for every report (Stock Rank, Future, Shifting Gears, …).
//
//   <CommonTable data={rows} HeaderComponent={FutureHeader} RowComponent={FutureRow} />
//
// CommonTable owns the structure only: sticky header, scrolling rows, sorting of the
// raw data and filling the parent's available height. It knows nothing about columns.
//
// HeaderComponent({ sort, onSort }) and RowComponent({ data, index }) each return the
// cells for one row (a fragment). Both are mounted inside a row container with the same
// horizontal padding, so matching `flex` values line the columns up.
//
// Sortable header cells call onSort({ key, getValue }) — see TableHeaderCell below.

function defaultKeyExtractor(item, index) {
  return String(item?.id ?? item?.symbol ?? index);
}

// Empty values stay last in both directions; numbers compare numerically, text naturally.
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

function CommonTable({ data, HeaderComponent, RowComponent, keyExtractor = defaultKeyExtractor, initialSort = null, minWidth, emptyText = 'No data to show', style, rowStyle }) {
  const [sort, setSort] = useState(initialSort);

  const handleSort = useCallback((column) => {
    if (!column?.key) return;
    setSort((prev) => (prev?.key === column.key
      ? { ...prev, ...column, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { dir: 'asc', ...column }));
  }, []);

  const rows = useMemo(() => sortRows(data, sort), [data, sort]);

  const renderItem = useCallback(({ item, index }) => (
    <View style={[styles.row, rowStyle]}><RowComponent data={item} index={index} /></View>
  ), [RowComponent, rowStyle]);

  const table = (
    <View style={[styles.table, minWidth ? { minWidth } : null]}>
      <View style={styles.header}>{HeaderComponent ? <HeaderComponent sort={sort} onSort={handleSort} /> : null}</View>
      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{emptyText}</Text></View>}
        showsVerticalScrollIndicator={false}
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

// ─── Header Cell ────────────────────────────────────────────────────────────────
// Optional helper so reports get consistent labels, alignment and sort indicators.
// `getValue` picks the raw field to sort by, which is what lets a cell showing both
// High and Low sort on whichever of the two the header cares about.

export function TableHeaderCell({ label, flex = 1, align = 'left', sortKey, getValue, sort, onSort, style }) {
  const sortable = !!sortKey && typeof getValue === 'function' && typeof onSort === 'function';
  const active = sortable && sort?.key === sortKey;
  const alignStyle = align === 'right' ? styles.cellRight : align === 'center' ? styles.cellCenter : null;

  return (
    <Pressable disabled={!sortable} onPress={() => onSort({ key: sortKey, getValue })} style={[styles.hCell, { flex }, alignStyle, sortable && Platform.OS === 'web' ? styles.pointer : null, style]} accessibilityRole={sortable ? 'button' : 'header'} accessibilityLabel={label}>
      <Text style={[styles.hLabel, align === 'right' ? styles.textRight : align === 'center' ? styles.textCenter : null, active ? styles.hLabelActive : null]} numberOfLines={2}>{label}</Text>
      {sortable ? <Text style={[styles.hArrow, active ? styles.hArrowActive : null]}>{active && sort.dir === 'desc' ? '▾' : '▴'}</Text> : null}
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  hContent: { flexGrow: 1, alignItems: 'stretch', minHeight: '100%' },
  table: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: INSET, paddingHorizontal: PAD_H, paddingTop: 4, paddingBottom: 6, zIndex: 1 },
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
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  hArrow: { fontSize: 8, lineHeight: 13, color: '#CBD5E1' },
  hArrowActive: { color: '#64748B' },
  pointer: { cursor: 'pointer' },
});
