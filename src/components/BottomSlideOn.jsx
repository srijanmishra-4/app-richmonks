import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Modal, Pressable, ScrollView, Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clamp, useScaledStyles } from '@/utils/responsive';
import { CloseIcon } from '@/components/icons/NavIcons';

const PRIMARY = '#0071A9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';
const BORDER = '#E2E8F0';
const GREEN = '#16A34A';
const RED = '#DC2626';
const USE_NATIVE = Platform.OS !== 'web';
const MAX_WIDTH = 560;

function Logo({ uri, title, size, t }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={[styles.logo, { width: size, height: size }]}>
      {uri && !failed ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" onError={() => setFailed(true)} /> : <Text style={t.logoText} allowFontScaling={false}>{String(title ?? '').slice(0, 2).toUpperCase()}</Text>}
    </View>
  );
}

function BottomSlideOn({ visible, onClose, onDismissed, logo, title, subtitle, price, change, changePct, positive, metrics = [], graph, actionLabel, onAction }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = useScaledStyles(textStyles);
  const [mounted, setMounted] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [pressed, setPressed] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(height);
  const slidingRef = useRef(false);
  const visibleRef = useRef(visible);
  const frameRef = useRef(0);
  visibleRef.current = visible;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismissedRef = useRef(onDismissed);
  dismissedRef.current = onDismissed;

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
    const anim = Animated.parallel([Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }), Animated.timing(scrimAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE })]);
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
    const anim = Animated.parallel([Animated.timing(translateY, { toValue: sheetHeight.current || height, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE }), Animated.timing(scrimAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE })]);
    anim.start(({ finished }) => {
      if (!finished) return;
      slidingRef.current = false;
      setSliding(false);
      setMounted(false);
      dismissedRef.current?.();
    });
    return () => anim.stop();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag-to-dismiss only from the handle/header so the graph keeps its own horizontal gestures.
  const pan = useMemo(() => {
    const settle = () => Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: USE_NATIVE }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => (g.dy > 90 || g.vy > 0.9 ? closeRef.current?.() : settle()),
      onPanResponderTerminate: settle,
    });
  }, [translateY]);

  const sheetWidth = Math.min(width, MAX_WIDTH);
  const padX = clamp(16, Math.round(sheetWidth * 0.055), 24);
  const logoSize = clamp(32, Math.round(sheetWidth * 0.095), 40);
  const changeColor = positive == null ? MUTED : positive ? GREEN : RED;
  const changeText = [change, changePct].filter(Boolean).join('  ');
  const pointer = Platform.OS === 'web' ? styles.pointer : null;

  const scrimBg = scrimAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.18)'] });

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
          <View {...pan.panHandlers} style={{ paddingHorizontal: padX }}>
            <View style={styles.handleWrap}>
              <View style={styles.handleSide} />
              <View style={styles.handleCenter}>
                <View style={styles.handle} />
              </View>
              <Pressable
                onPress={() => closeRef.current?.()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.closeBtnPressed : null, pointer]}
              >
                <CloseIcon size={22} color={MUTED} />
              </Pressable>
            </View>
            <View style={styles.header}>
              <View style={styles.identity}>
                <Logo uri={logo} title={title} size={logoSize} t={t} />
                <View style={styles.identityText}>
                  <Text style={t.title} numberOfLines={1} maxFontSizeMultiplier={1.1}>{title}</Text>
                  {subtitle ? <Text style={t.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>{subtitle}</Text> : null}
                </View>
              </View>
              <View style={styles.quote}>
                {price ? <Text style={t.price} numberOfLines={1} maxFontSizeMultiplier={1.1}>{price}</Text> : null}
                {changeText ? <Text style={[t.change, { color: changeColor }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{changeText}</Text> : null}
              </View>
            </View>
          </View>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={{ paddingHorizontal: padX }}>
            {metrics.length ? (
              <View style={styles.metrics}>
                {metrics.map((row) => (
                  <View key={row.label} style={styles.metricRow}>
                    <Text style={t.metricLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>{row.label}</Text>
                    <Text style={t.metricValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {graph ? <View style={styles.graph}>{graph}</View> : null}
          </ScrollView>
          {actionLabel ? (
            <View collapsable={false} accessibilityRole="button" accessibilityLabel={actionLabel} onTouchStart={() => setPressed(true)} onTouchCancel={() => setPressed(false)} onTouchEnd={() => { setPressed(false); onAction?.(); }} style={[styles.action, { marginHorizontal: padX, marginBottom: insets.bottom + 18 }, pressed ? styles.actionPressed : null, pointer]}>
              <Text style={t.actionText} numberOfLines={1} maxFontSizeMultiplier={1.1}>{actionLabel}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(BottomSlideOn);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { flexGrow: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  handleWrap: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  handleSide: { width: 24 },
  handleCenter: { flex: 1, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityText: { flex: 1, minWidth: 0, gap: 3 },
  logo: { alignItems: 'center', justifyContent: 'center' },
  quote: { flexShrink: 0, maxWidth: '50%', alignItems: 'flex-end', gap: 3 },
  metrics: { paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  graph: { marginTop: 12 },
  action: { marginTop: 8, height: 48, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  actionPressed: { opacity: 0.85 },
  pointer: { cursor: 'pointer' },
  // Negative margin keeps the handle row at its original 28px height while the 20px button stays inside its bounds for Android hit-testing.
  closeBtn: { width: 20, height: 20, marginTop: -4, marginBottom: -12, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  closeBtnPressed: { opacity: 0.6 },
});

const textStyles = (fs) => ({
  logoText: { fontSize: fs(14), fontFamily: 'Inter_600SemiBold', color: MUTED },
  title: { fontSize: fs(17), lineHeight: fs(22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  subtitle: { fontSize: fs(12), lineHeight: fs(16), fontFamily: 'Inter_500Medium', color: SUBTLE },
  price: { fontSize: fs(17), lineHeight: fs(22), fontFamily: 'Inter_600SemiBold', color: TEXT, fontVariant: ['tabular-nums'] },
  change: { fontSize: fs(12), lineHeight: fs(16), fontFamily: 'Inter_500Medium', fontVariant: ['tabular-nums'] },
  metricLabel: { flexShrink: 1, fontSize: fs(13), lineHeight: fs(18), fontFamily: 'Inter_400Regular', color: '#334155' },
  metricValue: { flexShrink: 0, fontSize: fs(13), lineHeight: fs(18), fontFamily: 'Inter_500Medium', color: TEXT, textAlign: 'right', fontVariant: ['tabular-nums'] },
  actionText: { fontSize: fs(15), lineHeight: fs(20), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
