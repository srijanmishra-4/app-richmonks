import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScaledStyles } from '@/utils/responsive';

const PRIMARY = '#0071A9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const BORDER = '#E2E8F0';
const USE_NATIVE = Platform.OS !== 'web';
const MAX_WIDTH = 560;

export const HEATMAP_SORT_OPTIONS = [
  { key: 'NONE', label: 'None' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'chg_in_oi_1d', label: 'OI change 1 Day' },
  { key: 'chg_in_oi_5d', label: 'OI Change 5 Days' },
  { key: 'chg_in_oi_10d', label: 'OI Change 10 Days' },
  { key: 'chg_in_oi_expiry', label: 'OI Change Since Expiry' },
];

const FILTER_TABS = ['Sort', 'Filter'];

function HeatmapFilterSlideOnComponent({
  visible,
  onClose,
  onApply,
  onReset,
  appliedSort = 'NONE',
  appliedIndustry = null,
  industries = [],
  sortOptions = HEATMAP_SORT_OPTIONS,
  onApplySort,
  onApplyFilter,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = useScaledStyles(textStyles);

  const [mounted, setMounted] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [tab, setTab] = useState(0);
  const [tempSort, setTempSort] = useState(appliedSort);
  const [tempIndustry, setTempIndustry] = useState(appliedIndustry);

  const translateY = useRef(new Animated.Value(height)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(height);
  const slidingRef = useRef(false);
  const visibleRef = useRef(visible);
  const frameRef = useRef(0);
  visibleRef.current = visible;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Sync temp state whenever sheet opens
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setTempSort(appliedSort);
      setTempIndustry(appliedIndustry);
      setTab(0);
    }
    prevVisible.current = visible;
  }, [visible, appliedSort, appliedIndustry]);

  const onSheetLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (!h) return;
    sheetHeight.current = h;
    if (slidingRef.current || !visibleRef.current) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (slidingRef.current || !visibleRef.current) return;
      translateY.setValue(sheetHeight.current);
      slidingRef.current = true;
      setSliding(true);
    });
  }, [translateY]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    if (!sliding || !visible) return undefined;
    const anim = Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
      Animated.timing(scrimAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [sliding, visible, translateY, scrimAnim]);

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        translateY.setValue(height);
        setMounted(true);
      }
      return;
    }
    if (!mounted) return;
    const anim = Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight.current || height, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE }),
      Animated.timing(scrimAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE }),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      slidingRef.current = false;
      setSliding(false);
      setMounted(false);
    });
    return () => anim.stop();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(() => {
    const settle = () => Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: USE_NATIVE }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => (g.dy > 90 || g.vy > 0.9 ? closeRef.current?.() : settle()),
      onPanResponderTerminate: settle,
    });
  }, [translateY]);

  const industryOptions = useMemo(() => {
    const list = [{ id: null, industry: 'None' }];
    if (Array.isArray(industries)) {
      industries.forEach((ind) => list.push(ind));
    }
    return list;
  }, [industries]);

  const handleApply = useCallback(() => {
    if (tab === 0) {
      onApplySort?.(tempSort);
      onApply?.({ sort: tempSort, industry: tempIndustry, type: 'sort' });
    } else {
      onApplyFilter?.(tempIndustry);
      onApply?.({ sort: tempSort, industry: tempIndustry, type: 'filter' });
    }
    onClose?.();
  }, [tab, tempSort, tempIndustry, onApplySort, onApplyFilter, onApply, onClose]);

  const handleReset = useCallback(() => {
    if (tab === 0) {
      setTempSort('NONE');
      onReset?.('sort');
      onApplySort?.('NONE');
      onApply?.({ sort: 'NONE', industry: tempIndustry, type: 'sort' });
    } else {
      setTempIndustry(null);
      onReset?.('filter');
      onApplyFilter?.(null);
      onApply?.({ sort: tempSort, industry: null, type: 'filter' });
    }
    onClose?.();
  }, [tab, tempIndustry, tempSort, onReset, onApplySort, onApplyFilter, onApply, onClose]);

  const sheetWidth = Math.min(width, MAX_WIDTH);
  const scrimBg = scrimAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.18)'],
  });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { width, height, backgroundColor: scrimBg }]} pointerEvents="box-none">
          <Pressable style={{ width, height }} onPress={() => closeRef.current?.()} android_ripple={null} />
        </Animated.View>
        <Animated.View
          onLayout={onSheetLayout}
          pointerEvents={sliding ? 'auto' : 'none'}
          style={[styles.sheet, { width: sheetWidth, maxHeight: height * 0.92, opacity: sliding ? 1 : 0, transform: [{ translateY }] }]}
        >
          <View {...pan.panHandlers} style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={[styles.body, { height: 360 + (insets.bottom ? insets.bottom : 0) }]}>
            {/* Side tabs */}
            <View style={styles.sidebar}>
              {FILTER_TABS.map((lbl, i) => (
                <Pressable
                  key={lbl}
                  onPress={() => setTab(i)}
                  style={[styles.sideTab, tab === i ? styles.sideTabActive : null, Platform.OS === 'web' ? styles.pointer : null]}
                >
                  <Text style={[t.tabLabel, tab === i ? styles.sideTabTextActive : null]} numberOfLines={1}>
                    {lbl}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Options list & actions */}
            <View style={styles.content}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {tab === 0 ? sortOptions.map((opt) => {
                  const active = tempSort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setTempSort(opt.key)}
                      style={[styles.optRow, active ? styles.optRowActive : null, Platform.OS === 'web' ? styles.pointer : null]}
                    >
                      <View style={[styles.radio, active ? styles.radioActive : null]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[t.optLabel, active ? styles.optTextActive : null]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                }) : industryOptions.map((ind) => {
                  const active = ind.id === tempIndustry;
                  return (
                    <Pressable
                      key={ind.id ?? 'none'}
                      onPress={() => setTempIndustry(ind.id)}
                      style={[styles.optRow, active ? styles.optRowActive : null, Platform.OS === 'web' ? styles.pointer : null]}
                    >
                      <View style={[styles.radio, active ? styles.radioActive : null]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[t.optLabel, active ? styles.optTextActive : null]} numberOfLines={1}>
                        {ind.industry}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {/* Bottom actions */}
              <View style={[styles.actions, { paddingBottom: insets.bottom ? insets.bottom + 6 : 12 }]}>
                <Pressable
                  onPress={handleReset}
                  style={[styles.actionBtn, styles.resetBtn, Platform.OS === 'web' ? styles.pointer : null]}
                >
                  <Text style={t.resetText} numberOfLines={1}>
                    {tab === 0 ? 'Reset Sorting' : 'Reset Filter'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  style={[styles.actionBtn, styles.applyBtn, Platform.OS === 'web' ? styles.pointer : null]}
                >
                  <Text style={t.applyText} numberOfLines={1}>
                    {tab === 0 ? 'Apply Sorting' : 'Apply Filter'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(HeatmapFilterSlideOnComponent);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  body: { flexDirection: 'row', height: 360 },
  sidebar: { width: 90, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER, paddingTop: 4 },
  sideTab: { paddingVertical: 12, paddingHorizontal: 10, borderRightWidth: 2, borderRightColor: 'transparent' },
  sideTabActive: { backgroundColor: '#F0F9FF', borderRightColor: PRIMARY },
  sideTabTextActive: { color: PRIMARY },
  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  optRowActive: { backgroundColor: '#F0F9FF' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: SUBTLE, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: PRIMARY },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: PRIMARY },
  optTextActive: { color: PRIMARY },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  actionBtn: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resetBtn: { backgroundColor: '#F1F5F9' },
  applyBtn: { backgroundColor: PRIMARY },
  pointer: { cursor: 'pointer' },
});

const textStyles = (fs) => ({
  tabLabel: { fontSize: fs(12), fontFamily: 'Inter_500Medium', color: MUTED },
  optLabel: { fontSize: fs(13), fontFamily: 'Inter_500Medium', color: TEXT },
  resetText: { fontSize: fs(13), fontFamily: 'Inter_600SemiBold', color: MUTED },
  applyText: { fontSize: fs(13), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
