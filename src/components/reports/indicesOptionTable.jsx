import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, Platform } from 'react-native';
import { useFluidStyles, useFluid } from '@/utils/responsive';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/HomeIcons';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';
const TEXT_DARK = '#0F172A';
const BORDER = '#E4E8EE';

export const COL = { oi: 1.15, cmp: 1.0, strike: 0.95 };
const SKELETON_ITEMS = Array.from({ length: 12 }, (_, i) => ({ id: `skel-${i}` }));

function groupDigits(p) {
  if (p.length <= 3) return p;
  return `${p.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${p.slice(-3)}`;
}
export function formatGrouped(val) {
  if (val == null || val === '' || val === '—') return '—';
  let str = String(val).trim().replace(/[₹,\s]/g, '');
  if (!str) return '—';
  const sign = str.startsWith('-') ? '-' : str.startsWith('+') ? '+' : '';
  if (sign) str = str.slice(1).trim();
  if (isNaN(parseFloat(str))) return String(val);
  const parts = str.split('.');
  return `${sign}${groupDigits(parts[0])}${parts.length > 1 ? `.${parts[1]}` : ''}`;
}
export function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const g = formatGrouped(val);
  return g === '—' ? '—' : `₹${g}`;
}
export function formatOiDelta(val) {
  if (val == null || val === '' || val === '—') return '—';
  const num = parseFloat(String(val).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const s = num > 0 ? '+' : num < 0 ? '-' : '';
  const parts = String(Math.abs(num)).split('.');
  return `${s}${groupDigits(parts[0])}${parts.length > 1 ? `.${parts[1]}` : ''}`;
}
export function parseNumber(val) {
  if (val == null || val === '' || val === '—') return 0;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function findAtmBoundaryIndex(list) {
  if (!Array.isArray(list) || !list.length) return -1;
  const idx1 = list.findIndex((d) => Number(d?.row) === 1);
  const idxMinus1 = list.findIndex((d) => Number(d?.row) === -1);
  if (idx1 !== -1 && idxMinus1 !== -1) return (idx1 + idxMinus1) / 2;
  if (idx1 !== -1) return idx1 + 0.5;
  if (idxMinus1 !== -1) return idxMinus1 - 0.5;
  return Math.floor(list.length / 2);
}

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

function IndicesOptionHeader({ filter }) {
  const styles = useFluidStyles(createStyles);
  const isStrong = filter === 'Strong Call' || filter === 'Strong Put';
  const isWeak = filter === 'Weak Call' || filter === 'Weak Put';

  return (
    <View style={styles.header}>
      <View style={[styles.hCol, { flex: COL.oi }]}>
        <View style={styles.hSortRow}><Text style={styles.hLabel}>OI</Text><Text style={styles.hArrow}>↕</Text></View>
        <Text style={styles.hSubLabel}>Δ OI</Text>
      </View>
      <View style={[styles.hCol, { flex: COL.cmp }]}>
        <View style={styles.hSortRow}><Text style={styles.hLabel}>CMP/WAP</Text><Text style={styles.hArrow}>↕</Text></View>
        <Text style={styles.hSubLabelSpacer}> </Text>
      </View>
      <View style={[styles.hCol, { flex: COL.strike }]}>
        <View style={styles.hSortRow}><Text style={styles.hLabel}>STRIKE</Text><Text style={styles.hArrow}>↕</Text></View>
        <View style={styles.hSubheadingWrap}>
          {isStrong ? <Text style={[styles.hSubheadingText, { color: GREEN }]} numberOfLines={1}>Strong Above</Text> : isWeak ? <Text style={[styles.hSubheadingText, { color: RED }]} numberOfLines={1}>Weak Below</Text> : null}
        </View>
      </View>
      <View style={[styles.hCol, { flex: COL.cmp }]}>
        <View style={styles.hSortRow}><Text style={styles.hLabel}>CMP/WAP</Text><Text style={styles.hArrow}>↕</Text></View>
        <Text style={styles.hSubLabelSpacer}> </Text>
      </View>
      <View style={[styles.hCol, { flex: COL.oi }]}>
        <View style={styles.hSortRow}><Text style={styles.hLabel}>OI</Text><Text style={styles.hArrow}>↕</Text></View>
        <Text style={styles.hSubLabel}>Δ OI</Text>
      </View>
    </View>
  );
}

const IndicesOptionRow = memo(function IndicesOptionRow({ data, filter }) {
  const styles = useFluidStyles(createStyles);
  if (!data) return null;
  const isCallHidden = filter === 'Strong Put' || filter === 'Weak Put';
  const isPutHidden = filter === 'Strong Call' || filter === 'Weak Call';
  const callActive = filter === 'Strong Call' || filter === 'Weak Call';
  const putActive = filter === 'Strong Put' || filter === 'Weak Put';
  const isStrong = filter === 'Strong Call' || filter === 'Strong Put';
  const tpColor = isStrong ? GREEN : RED;
  const showCallTp = callActive && data.call_tp != null && data.call_tp !== '';
  const showPutTp = putActive && data.put_tp != null && data.put_tp !== '';

  const callPriceChg = parseNumber(data.call_price_change);
  const callPriceColor = callPriceChg > 0 ? GREEN : callPriceChg < 0 ? RED : TEXT_DARK;
  const callOiChg = parseNumber(data.call_change_in_oi);
  const callOiColor = callOiChg > 0 ? GREEN : callOiChg < 0 ? RED : NEUTRAL;
  const callRemarkColor = !isCallHidden && (data.call_remark === 'Strong' ? GREEN : data.call_remark === 'Weak' ? RED : null);

  const putPriceChg = parseNumber(data.put_price_change);
  const putPriceColor = putPriceChg > 0 ? GREEN : putPriceChg < 0 ? RED : TEXT_DARK;
  const putOiChg = parseNumber(data.put_change_in_oi);
  const putOiColor = putOiChg > 0 ? GREEN : putOiChg < 0 ? RED : NEUTRAL;
  const putRemarkColor = !isPutHidden && (data.put_remark === 'Strong' ? GREEN : data.put_remark === 'Weak' ? RED : null);

  return (
    <View style={styles.row}>
      {callRemarkColor ? <View style={[styles.remarkLeft, { backgroundColor: callRemarkColor }]} /> : null}
      {putRemarkColor ? <View style={[styles.remarkRight, { backgroundColor: putRemarkColor }]} /> : null}

      <View style={[styles.cellCenter, { flex: COL.oi }]}>
        <Text style={styles.oiText} numberOfLines={1}>{isCallHidden ? '-' : formatGrouped(data.call_oi)}</Text>
        <Text style={[styles.subText, { color: isCallHidden ? NEUTRAL : callOiColor }]} numberOfLines={1}>{isCallHidden ? '-' : formatOiDelta(data.call_change_in_oi)}</Text>
      </View>

      <View style={[styles.cellCenter, { flex: COL.cmp }]}>
        <Text style={[styles.cmpText, { color: isCallHidden ? TEXT_DARK : callPriceColor }]} numberOfLines={1}>{isCallHidden ? '-' : formatMoney(data.call_price)}</Text>
        <Text style={styles.subText} numberOfLines={1}>{isCallHidden ? '-' : formatGrouped(data.call_wap)}</Text>
      </View>

      <View style={[styles.cellCenter, { flex: COL.strike }]}>
        <Text style={styles.strikeText} numberOfLines={1}>{formatGrouped(data.strike)}</Text>
        <View style={styles.tpRow}>
          {showCallTp || showPutTp ? (
            <>
              <View style={styles.tpSide}>
                {showCallTp ? <ChevronLeftIcon size={8} color={tpColor} /> : null}
              </View>
              <Text style={[styles.tpText, { color: tpColor }]} numberOfLines={1}>
                {formatGrouped(showCallTp ? data.call_tp : data.put_tp)}
              </Text>
              <View style={styles.tpSide}>
                {showPutTp ? <ChevronRightIcon size={8} color={tpColor} /> : null}
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={[styles.cellCenter, { flex: COL.cmp }]}>
        <Text style={[styles.cmpText, { color: isPutHidden ? TEXT_DARK : putPriceColor }]} numberOfLines={1}>{isPutHidden ? '-' : formatMoney(data.put_price)}</Text>
        <Text style={styles.subText} numberOfLines={1}>{isPutHidden ? '-' : formatGrouped(data.put_wap)}</Text>
      </View>

      <View style={[styles.cellCenter, { flex: COL.oi }]}>
        <Text style={styles.oiText} numberOfLines={1}>{isPutHidden ? '-' : formatGrouped(data.put_oi)}</Text>
        <Text style={[styles.subText, { color: isPutHidden ? NEUTRAL : putOiColor }]} numberOfLines={1}>{isPutHidden ? '-' : formatOiDelta(data.put_change_in_oi)}</Text>
      </View>
    </View>
  );
});

function SkeletonRow({ pulse }) {
  const styles = useFluidStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={[styles.cellCenter, { flex: COL.oi }]}><Animated.View style={[styles.skelBar, { width: 52, opacity: pulse }]} /><Animated.View style={[styles.skelBar, { width: 38, height: 8, marginTop: 4, opacity: pulse }]} /></View>
      <View style={[styles.cellCenter, { flex: COL.cmp }]}><Animated.View style={[styles.skelBar, { width: 44, opacity: pulse }]} /><Animated.View style={[styles.skelBar, { width: 32, height: 8, marginTop: 4, opacity: pulse }]} /></View>
      <View style={[styles.cellCenter, { flex: COL.strike }]}><Animated.View style={[styles.skelBar, { width: 48, opacity: pulse }]} /><Animated.View style={[styles.skelBar, { width: 34, height: 8, marginTop: 4, opacity: pulse }]} /></View>
      <View style={[styles.cellCenter, { flex: COL.cmp }]}><Animated.View style={[styles.skelBar, { width: 44, opacity: pulse }]} /><Animated.View style={[styles.skelBar, { width: 32, height: 8, marginTop: 4, opacity: pulse }]} /></View>
      <View style={[styles.cellCenter, { flex: COL.oi }]}><Animated.View style={[styles.skelBar, { width: 52, opacity: pulse }]} /><Animated.View style={[styles.skelBar, { width: 38, height: 8, marginTop: 4, opacity: pulse }]} /></View>
    </View>
  );
}

function IndicesOptionTable({ data, filter, loading = false, symbol, expiry, onPositioned, emptyText = 'No data to show' }) {
  const f = useFluid();
  const styles = useFluidStyles(createStyles);
  const rowHeight = f(44, 56);
  const rowGap = f(4, 6);
  const totalItemHeight = rowHeight + rowGap;

  const [viewportHeight, setViewportHeight] = useState(0);
  const listRef = useRef(null);
  const centeredDatasetRef = useRef(null);
  const loadedDatasetRef = useRef(null);
  const hasRows = Array.isArray(data) && data.length > 0;
  const showSkeleton = loading;
  const pulse = useSkeletonPulse(showSkeleton);

  const datasetId = useMemo(() => `${symbol}_${expiry}`, [symbol, expiry]);

  const onLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - viewportHeight) > 2) setViewportHeight(h);
  }, [viewportHeight]);

  useEffect(() => {
    if (loading && !data?.length) {
      loadedDatasetRef.current = datasetId;
      return undefined;
    }
    if (loadedDatasetRef.current !== datasetId) return undefined;
    if (!viewportHeight || !data?.length) return undefined;
    if (centeredDatasetRef.current === datasetId) return undefined;

    const bIdx = findAtmBoundaryIndex(data);
    if (bIdx < 0) return undefined;

    const boundaryY = (bIdx + 0.5) * totalItemHeight - (rowGap / 2);
    const targetOffset = boundaryY - (viewportHeight / 2);
    const maxOffset = Math.max(0, data.length * totalItemHeight - viewportHeight);
    const clampedOffset = Math.max(0, Math.min(targetOffset, maxOffset));

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      listRef.current?.scrollToOffset({ offset: clampedOffset, animated: false });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          centeredDatasetRef.current = datasetId;
          onPositioned?.(datasetId);
        });
      });
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [viewportHeight, data, datasetId, loading, onPositioned, totalItemHeight, rowGap]);

  const getItemLayout = useCallback((_, index) => ({ length: totalItemHeight, offset: totalItemHeight * index, index }), [totalItemHeight]);
  const renderItem = useCallback(({ item }) => (hasRows ? <IndicesOptionRow data={item} filter={filter} /> : <SkeletonRow pulse={pulse} />), [hasRows, pulse, filter]);
  const keyExtractor = useCallback((item, index) => (hasRows ? String(item?.strike ?? index) : item.id), [hasRows]);

  const listData = hasRows ? data : SKELETON_ITEMS;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <IndicesOptionHeader filter={filter} />
      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? null : <View style={styles.empty}><Text style={styles.emptyText}>{emptyText}</Text></View>}
        />
        {showSkeleton ? (
          <View style={styles.skeletonOverlay} pointerEvents="none">
            {SKELETON_ITEMS.map((item) => <SkeletonRow key={item.id} pulse={pulse} />)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default memo(IndicesOptionTable);

const createStyles = (f) => ({
  root: { flex: 1, minHeight: 0 },
  listWrap: { flex: 1, minHeight: 0 },
  skeletonOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#F6F7F8', paddingTop: 2, gap: f(4, 6) },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: f(8, 20), paddingHorizontal: f(6, 12), paddingTop: f(4, 8), paddingBottom: f(6, 10), overflow: 'visible', zIndex: 1 },
  hCol: { minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: f(2, 6), overflow: 'visible' },
  hSortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: f(2, 4) },
  hLabel: { fontSize: f(9.5, 12), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.2, textAlign: 'center' },
  hArrow: { fontSize: f(8, 10), lineHeight: f(13, 16), color: '#CBD5E1' },
  hSubLabel: { marginTop: 2, fontSize: f(8.5, 11), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  hSubLabelSpacer: { marginTop: 2, fontSize: f(8.5, 11), lineHeight: f(12, 14) },
  hSubheadingWrap: { height: f(13, 16), marginTop: 2, width: f(72, 100), alignSelf: 'center', justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  hSubheadingText: { fontSize: f(8.5, 11), lineHeight: f(13, 16), fontFamily: 'Inter_600SemiBold', textAlign: 'center', includeFontPadding: false },
  list: { flex: 1, minHeight: 0 },
  listContent: { flexGrow: 1, paddingTop: 2, paddingBottom: f(12, 20), gap: f(4, 6) },
  row: { flexDirection: 'row', alignItems: 'center', height: f(44, 56), marginHorizontal: f(8, 20), paddingHorizontal: f(6, 12), borderRadius: f(4, 6), borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  remarkLeft: { position: 'absolute', left: 2, top: 7, bottom: 7, width: 3, borderRadius: 1.5 },
  remarkRight: { position: 'absolute', right: 2, top: 7, bottom: 7, width: 3, borderRadius: 1.5 },
  cellCenter: { minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: f(2, 6) },
  oiText: { fontSize: f(11.5, 14), lineHeight: f(15, 18), fontFamily: 'Inter_500Medium', color: TEXT_DARK, textAlign: 'center' },
  cmpText: { fontSize: f(11.5, 14), lineHeight: f(15, 18), fontFamily: 'Inter_500Medium', textAlign: 'center' },
  subText: { marginTop: 2, fontSize: f(9.5, 12), lineHeight: f(12, 15), fontFamily: 'Inter_500Medium', color: NEUTRAL, textAlign: 'center' },
  strikeText: { fontSize: f(12, 14.5), lineHeight: f(15, 18), fontFamily: 'Inter_600SemiBold', color: TEXT_DARK, textAlign: 'center' },
  tpRow: { height: f(12, 15), marginTop: 2, width: '100%', flexDirection: 'row', alignItems: 'center' },
  tpSide: { width: f(8, 12), height: f(12, 15), alignItems: 'center', justifyContent: 'center' },
  tpText: { flex: 1, fontSize: f(8.5, 11), lineHeight: f(12, 15), fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: f(40, 60) },
  emptyText: { fontSize: f(13, 15), fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  skelBar: { borderRadius: 4, height: f(10, 14), backgroundColor: '#E2E8F0' },
});
