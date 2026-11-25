import React, { memo, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import Svg, { Rect, Line, G } from 'react-native-svg';

import { dismissAllLineGraphTooltips } from '@/components/LineGraph';
import { useFluid, useFluidStyles } from '@/utils/responsive';

const GREEN = '#10B981';
const RED = '#EF4444';
const NEUTRAL = '#94A3B8';

const dismissListeners = new Set();
export function dismissAllCandlestickTooltips() {
  dismissListeners.forEach((fn) => fn());
}

let outsideTouchGeneration = 0;
let graphTouchGeneration = 0;
let outsideTouchPending = 0;

export function armCandlestickOutsideDismiss() {
  outsideTouchGeneration += 1;
  outsideTouchPending += 1;
  const generation = outsideTouchGeneration;
  queueMicrotask(() => {
    outsideTouchPending -= 1;
    if (outsideTouchPending > 0) return;
    if (graphTouchGeneration !== generation) dismissAllCandlestickTooltips();
  });
}

function markCandlestickTouch() {
  graphTouchGeneration = outsideTouchGeneration;
}

function safeNum(val) {
  if (val == null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,\s]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function formatVolume(vol) {
  const num = safeNum(vol);
  if (num == null) return '—';
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' K';
  return num.toLocaleString('en-IN');
}

function formatPrice(val) {
  const num = safeNum(val);
  if (num == null) return '—';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRupee(val) {
  const str = formatPrice(val);
  return str === '—' ? str : `₹${str}`;
}

function formatDateTime(cdate, time) {
  let dateStr = '';
  if (cdate) {
    const str = String(cdate).trim();
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let day, monthIdx;
        if (parts[0].length === 4) { day = parseInt(parts[2], 10); monthIdx = parseInt(parts[1], 10) - 1; }
        else { day = parseInt(parts[0], 10); monthIdx = parseInt(parts[1], 10) - 1; }
        if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) dateStr = `${day} ${months[monthIdx]}`;
      }
    }
    if (!dateStr) dateStr = str;
  }
  let timeStr = time ? String(time).trim() : '';
  if (timeStr) {
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) timeStr = `${timeParts[0]}:${timeParts[1]}`;
  }
  if (dateStr && timeStr) return `${dateStr} ${timeStr}`;
  if (dateStr) return dateStr;
  if (timeStr) return timeStr;
  return '';
}

const CandleMark = memo(function CandleMark({ c, selected, volumeBottomY }) {
  if (!c.valid) return null;
  const bodyW = c.candleBodyW;
  const halfBody = bodyW / 2;
  const bodyH = Math.max(1.5, c.bodyBottom - c.bodyTop);
  const radius = bodyW >= 8 ? 1.5 : bodyW >= 4 ? 1 : 0;
  return (
    <G>
      <Line x1={c.cx} y1={c.wickTop} x2={c.cx} y2={c.wickBottom} stroke={c.color} strokeWidth={c.wickW} />
      <Rect x={c.cx - halfBody} y={c.bodyTop} width={bodyW} height={bodyH} rx={radius} fill={c.color} />
      {selected && (
        <Rect x={c.cx - halfBody - 2.5} y={c.bodyTop - 2.5} width={bodyW + 5} height={bodyH + 5} rx={radius + 2} fill="none" stroke={c.color} strokeWidth={1.25} strokeOpacity={0.35} />
      )}
      {c.volH > 0 && (
        <Rect x={c.cx - halfBody} y={volumeBottomY - c.volH} width={bodyW} height={c.volH} rx={Math.min(radius, 1)} fill={c.color} fillOpacity={selected ? 0.6 : 0.28} />
      )}
    </G>
  );
});

function findNearestCandleIndex(touchX, candles) {
  if (!candles || candles.length === 0) return -1;
  if (candles.length === 1) return 0;
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    const diff = Math.abs(candles[i].cx - touchX);
    if (diff < minDiff) { minDiff = diff; closestIdx = i; }
  }
  return closestIdx;
}

function numericWidth(style) {
  if (!style || Array.isArray(style)) return 0;
  return typeof style.width === 'number' && style.width > 0 ? style.width : 0;
}

export default function CandlestickGraph({ data = [], height = 230, style, onCandleSelect, keyStats, flex = false }) {
  const f = useFluid();
  const ohlcvStyles = useFluidStyles(createOhlcvStyles);
  const ohlcvMarginTop = f(16, 22);
  const ohlcvRowHeight = f(26, 32);
  const ohlcvMarginBottom = f(6, 8);
  const ohlcvHeaderHeight = ohlcvMarginTop + ohlcvRowHeight + ohlcvMarginBottom;
  const chartHeight = Math.max(80, height - ohlcvHeaderHeight);
  const styleWidth = numericWidth(style);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [tooltipSize, setTooltipSize] = useState({ width: 164, height: 54 });
  const selectedIndexRef = useRef(-1);
  const directionRef = useRef(null);
  const touchRef = useRef(null);
  const containerRef = useRef(null);

  const clearSelection = useCallback(() => {
    selectedIndexRef.current = -1;
    setSelectedIndex(-1);
    if (onCandleSelect) onCandleSelect(null, -1);
  }, [onCandleSelect]);

  useEffect(() => {
    dismissListeners.add(clearSelection);
    return () => dismissListeners.delete(clearSelection);
  }, [clearSelection]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handleWebOutside = (event) => {
      const node = containerRef.current;
      const target = event.target;
      if (!node || typeof node.contains !== 'function') return;
      if (node.contains(target)) { markCandlestickTouch(); return; }
      clearSelection();
    };
    document.addEventListener('pointerdown', handleWebOutside, true);
    return () => document.removeEventListener('pointerdown', handleWebOutside, true);
  }, [clearSelection]);

  useEffect(() => { clearSelection(); }, [data, clearSelection]);

  const applyLayout = useCallback((w, h) => {
    if (w <= 0 && h <= 0) return;
    setLayout((prev) => {
      const width = w > 0 ? w : prev.width;
      const height = h > 0 ? h : prev.height;
      if (Math.abs(width - prev.width) < 0.5 && Math.abs(height - prev.height) < 0.5) return prev;
      return { width, height };
    });
  }, []);

  const onLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    applyLayout(w, h > 0 ? h : (flex ? 0 : chartHeight));
  }, [applyLayout, flex, chartHeight]);

  // Wide web flex columns report a 0 width from onLayout until the plot has a
  // definite pixel size. Read the DOM box as well so the candles can mount.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const node = containerRef.current;
    if (!node || typeof node.getBoundingClientRect !== 'function') return undefined;
    const apply = () => {
      const rect = node.getBoundingClientRect();
      applyLayout(rect.width, rect.height > 0 ? rect.height : (flex ? 0 : chartHeight));
    };
    const frame = requestAnimationFrame(apply);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [applyLayout, flex, styleWidth, chartHeight]);

  const onTooltipLayout = useCallback((e) => {
    const { width: tw, height: th } = e.nativeEvent.layout;
    if (tw > 0 && th > 0) setTooltipSize((prev) => (prev.width !== tw || prev.height !== th ? { width: tw, height: th } : prev));
  }, []);

  const padLeft = 2;
  const padRight = 2;
  const padTop = 10;
  const padBottom = 2;
  const volumeHeight = 34;
  const volumeGap = 12;
  const plotWidth = layout.width > 0 ? layout.width : styleWidth;
  const plotHeight = layout.height > 0 ? layout.height : chartHeight;
  const axisBottomY = plotHeight - padBottom;
  const volumeBottomY = axisBottomY - 1;
  const volumeTopY = volumeBottomY - volumeHeight;
  const plotFloorY = volumeTopY - volumeGap;
  const plotCeilY = padTop;

  const candles = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || plotWidth <= 0 || plotHeight <= 0) return [];
    const parsed = data.map((d, index) => {
      const open = safeNum(d?.open);
      const high = safeNum(d?.high);
      const low = safeNum(d?.low);
      const close = safeNum(d?.close);
      const volume = safeNum(d?.volume);
      return { raw: d, index, open, high, low, close, volume, valid: open != null && high != null && low != null && close != null };
    });

    let priceMin = Infinity, priceMax = -Infinity, volMax = 0;
    for (let i = 0; i < parsed.length; i++) {
      if (!parsed[i].valid) continue;
      if (parsed[i].low < priceMin) priceMin = parsed[i].low;
      if (parsed[i].high > priceMax) priceMax = parsed[i].high;
      if (parsed[i].volume != null && parsed[i].volume > volMax) volMax = parsed[i].volume;
    }
    if (!isFinite(priceMin) || !isFinite(priceMax)) { priceMin = 0; priceMax = 0; }
    const pricePad = (priceMax - priceMin) * 0.04;
    priceMin -= pricePad;
    priceMax += pricePad;

    const priceRange = priceMax === priceMin ? 1 : priceMax - priceMin;
    const usableH = Math.max(1, plotFloorY - plotCeilY);
    const n = parsed.length;
    const totalWidth = plotWidth - padLeft - padRight;
    const candleSlotW = Math.max(1, totalWidth / n);
    const candleBodyW = candleSlotW >= 4 ? Math.min(candleSlotW * 0.74, 18) : Math.max(1, candleSlotW * 0.8);
    const wickW = candleBodyW >= 8 ? 1.25 : 1;

    const priceToY = (price) => plotCeilY + usableH - ((price - priceMin) / priceRange) * usableH;
    const volToH = (vol) => volMax > 0 && vol != null ? Math.max(1, (vol / volMax) * volumeHeight) : 0;

    return parsed.map((item, i) => {
      const cx = padLeft + candleSlotW * i + candleSlotW / 2;
      if (!item.valid) return { ...item, cx, bodyTop: 0, bodyBottom: 0, wickTop: 0, wickBottom: 0, candleBodyW, wickW, volH: 0, isBullish: false, isBearish: false, isNeutral: true, color: NEUTRAL };
      const isBullish = item.close > item.open;
      const isBearish = item.close < item.open;
      const isNeutral = !isBullish && !isBearish;
      const color = isBullish ? GREEN : isBearish ? RED : NEUTRAL;
      const bodyTop = priceToY(Math.max(item.open, item.close));
      const bodyBottom = priceToY(Math.min(item.open, item.close));
      const bodyH = Math.max(1.5, bodyBottom - bodyTop);
      const wickTop = priceToY(item.high);
      const wickBottom = priceToY(item.low);
      const volH = volToH(item.volume);
      return { ...item, cx, bodyTop, bodyBottom: bodyTop + bodyH, wickTop, wickBottom, candleBodyW, wickW, volH, isBullish, isBearish, isNeutral, color };
    });
  }, [data, plotWidth, plotHeight, plotFloorY, plotCeilY, volumeHeight, padLeft, padRight]);

  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  const handleTouch = useCallback((touchX) => {
    markCandlestickTouch();
    dismissAllLineGraphTooltips();
    const cs = candlesRef.current;
    if (!cs || cs.length === 0) return;
    const idx = findNearestCandleIndex(touchX, cs);
    if (idx !== -1 && idx !== selectedIndexRef.current) {
      selectedIndexRef.current = idx;
      setSelectedIndex(idx);
      if (onCandleSelect) onCandleSelect(cs[idx].raw, idx);
    }
  }, [onCandleSelect]);

  const panResponder = useMemo(() => {
    let originX = 0;
    const claimHorizontal = (g) => {
      if (directionRef.current === 'v') return false;
      if (directionRef.current === 'h') return true;
      const ax = Math.abs(g.dx);
      const ay = Math.abs(g.dy);
      if (ax < 10 && ay < 10) return false;
      if (ax > ay * 1.5) { directionRef.current = 'h'; return true; }
      directionRef.current = 'v';
      return false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => claimHorizontal(g),
      onMoveShouldSetPanResponderCapture: (_, g) => claimHorizontal(g),
      onPanResponderGrant: (evt, g) => {
        directionRef.current = 'h';
        originX = (evt.nativeEvent.locationX || 0) - (g.dx || 0);
        handleTouch(originX + (g.dx || 0));
      },
      onPanResponderMove: (_, g) => { handleTouch(originX + g.dx); },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => { directionRef.current = null; },
      onPanResponderRelease: () => { directionRef.current = null; },
    });
  }, [handleTouch]);

  const onGraphTouchStartCapture = useCallback(() => { markCandlestickTouch(); }, []);
  const onGraphTouchStart = useCallback((e) => {
    markCandlestickTouch();
    directionRef.current = null;
    touchRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, locX: e.nativeEvent.locationX, dx: 0, dy: 0, cancelled: false };
    handleTouch(e.nativeEvent.locationX);
  }, [handleTouch]);
  const onGraphTouchMove = useCallback((e) => {
    const t = touchRef.current;
    if (!t || t.cancelled) return;
    if (directionRef.current === 'v') { if (selectedIndexRef.current !== -1) clearSelection(); return; }
    t.dx = e.nativeEvent.pageX - t.x;
    t.dy = e.nativeEvent.pageY - t.y;
    if (!directionRef.current) {
      const ax = Math.abs(t.dx);
      const ay = Math.abs(t.dy);
      if (ay > 10 && ay > ax) { directionRef.current = 'v'; clearSelection(); return; }
    }
    handleTouch(e.nativeEvent.locationX);
  }, [handleTouch, clearSelection]);
  const onGraphTouchCancel = useCallback(() => {
    if (touchRef.current) touchRef.current.cancelled = true;
    touchRef.current = null;
  }, []);
  const onGraphTouchEnd = useCallback((e) => {
    const t = touchRef.current;
    touchRef.current = null;
    if (!t || t.cancelled) return;
    if (directionRef.current === 'v') { clearSelection(); return; }
    if (directionRef.current) return;
    const dx = e.nativeEvent.pageX - t.x;
    const dy = e.nativeEvent.pageY - t.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Math.abs(t.dx) < 10 && Math.abs(t.dy) < 10) handleTouch(t.locX + dx);
  }, [handleTouch, clearSelection]);
  const handlePointerMove = useCallback((e) => {
    if (Platform.OS === 'web' && e.nativeEvent) {
      const x = e.nativeEvent.offsetX ?? e.nativeEvent.locationX;
      if (x != null) handleTouch(x);
    }
  }, [handleTouch]);
  const handlePointerLeave = useCallback(() => {
    if (Platform.OS === 'web') clearSelection();
  }, [clearSelection]);

  const selectedCandle = selectedIndex >= 0 && selectedIndex < candles.length ? candles[selectedIndex] : null;

  // OHLCV header source
  const ohlcvSource = selectedCandle && selectedCandle.valid ? { open: selectedCandle.open, high: selectedCandle.high, low: selectedCandle.low, close: selectedCandle.close, volume: selectedCandle.volume, isCandle: true } : { open: safeNum(keyStats?.open), high: safeNum(keyStats?.high), low: safeNum(keyStats?.low), close: safeNum(keyStats?.close), volume: safeNum(keyStats?.volume), isCandle: false };

  const dirColor = ohlcvSource.isCandle && ohlcvSource.close != null && ohlcvSource.open != null ? (ohlcvSource.close > ohlcvSource.open ? GREEN : ohlcvSource.close < ohlcvSource.open ? RED : null) : null;
  const ohlcvItems = [
    { label: 'O', value: formatRupee(ohlcvSource.open), color: dirColor },
    { label: 'H', value: formatRupee(ohlcvSource.high), color: ohlcvSource.isCandle ? GREEN : null },
    { label: 'L', value: formatRupee(ohlcvSource.low), color: ohlcvSource.isCandle ? RED : null },
    { label: 'C', value: formatRupee(ohlcvSource.close), color: dirColor },
    { label: 'Vol', value: formatVolume(ohlcvSource.volume), color: null },
  ];

  const gridLines = [0, 1, 2, 3].map((i) => plotCeilY + ((plotFloorY - plotCeilY) * i) / 3);

  // Tooltip position
  let tooltipPos = null;
  if (selectedCandle && plotWidth > 0) {
    const tw = tooltipSize.width || 164;
    const th = tooltipSize.height || 54;
    const targetX = selectedCandle.cx - tw / 2;
    const clampedLeft = Math.max(4, Math.min(plotWidth - tw - 4, targetX));
    const caretLeft = Math.max(10, Math.min(tw - 20, selectedCandle.cx - clampedLeft - 5));
    const offset = 10;
    const spaceAbove = selectedCandle.wickTop - th - offset;
    const spaceBelow = selectedCandle.wickBottom + offset;
    let isBelow = false;
    let top = spaceAbove;
    if (spaceAbove >= 4) { top = spaceAbove; isBelow = false; }
    else if (spaceBelow + th <= plotHeight - 4) { top = spaceBelow; isBelow = true; }
    else { top = Math.max(4, spaceAbove); isBelow = false; }
    tooltipPos = { left: clampedLeft, top, isBelow, caretLeft };
  }

  const plotStyle = flex ? [styles.flexBox, { minHeight: 0 }] : { height: chartHeight };

  return (
    <View style={[styles.wrapper, flex ? styles.flexBox : null, style]}>
      {/* OHLCV Header */}
      <View style={[styles.ohlcvRow, { marginTop: ohlcvMarginTop, height: ohlcvRowHeight, marginBottom: ohlcvMarginBottom }]}>
        {ohlcvItems.map((item) => (
          <Text key={item.label} style={ohlcvStyles.ohlcvItem} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            <Text style={ohlcvStyles.ohlcvLabel}>{item.label}: </Text>
            <Text style={[ohlcvStyles.ohlcvValue, item.color ? { color: item.color } : null]}>{item.value}</Text>
          </Text>
        ))}
      </View>

      {/* Graph Area */}
      <View
        ref={containerRef}
        style={[styles.container, plotStyle, styleWidth > 0 ? { width: styleWidth } : null]}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        onTouchStartCapture={onGraphTouchStartCapture}
        onTouchStart={onGraphTouchStart}
        onTouchMove={onGraphTouchMove}
        onTouchEnd={onGraphTouchEnd}
        onTouchCancel={onGraphTouchCancel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {plotWidth > 0 && plotHeight > 0 && candles.length > 0 && (
          <Svg width={plotWidth} height={plotHeight} style={StyleSheet.absoluteFill}>
            {gridLines.map((y, i) => (
              <Line key={`g-${i}`} x1={0} y1={y} x2={plotWidth} y2={y} stroke="#EEF2F6" strokeWidth={1} strokeDasharray="3 4" />
            ))}
            <Line x1={0} y1={axisBottomY} x2={plotWidth} y2={axisBottomY} stroke="#E2E8F0" strokeWidth={1} />

            {/* Selected crosshair */}
            {selectedCandle && (
              <Line x1={selectedCandle.cx} y1={0} x2={selectedCandle.cx} y2={axisBottomY} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.7} />
            )}

            {candles.map((c) => (
              <CandleMark key={`c-${c.index}`} c={c} selected={selectedIndex === c.index} volumeBottomY={volumeBottomY} />
            ))}
          </Svg>
        )}

        {/* Tooltip */}
        {selectedCandle && tooltipPos && (
          <View pointerEvents="none" onLayout={onTooltipLayout} style={[styles.tooltipCard, { left: tooltipPos.left, top: tooltipPos.top }]}>
            <View style={styles.tooltipFirstLine}>
              <Text style={[styles.tooltipPrice, { color: selectedCandle.color }]}>₹{formatPrice(selectedCandle.close)}</Text>
            </View>
            <Text style={styles.tooltipDate}>{formatDateTime(selectedCandle.raw?.cdate, selectedCandle.raw?.time)}</Text>
            <View style={[tooltipPos.isBelow ? styles.caretUp : styles.caretDown, { left: tooltipPos.caretLeft }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const createOhlcvStyles = (f) => ({
  ohlcvItem: { flexShrink: 1, fontSize: f(13, 14.5), lineHeight: f(18, 22) },
  ohlcvLabel: { fontSize: f(13, 14.5), lineHeight: f(18, 22), fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  ohlcvValue: { fontSize: f(13, 14.5), lineHeight: f(18, 22), fontFamily: 'Inter_600SemiBold', color: '#1E293B', fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  flexBox: { flex: 1, minHeight: 0, width: '100%' },
  ohlcvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEF2F6' },
  container: { width: '100%', position: 'relative', overflow: 'hidden' },
  tooltipCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 99,
  },
  tooltipFirstLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tooltipPrice: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  tooltipDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#64748B', marginTop: 2 },
  caretDown: {
    position: 'absolute', bottom: -5, width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF',
  },
  caretUp: {
    position: 'absolute', top: -5, width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFFFFF',
  },
});
