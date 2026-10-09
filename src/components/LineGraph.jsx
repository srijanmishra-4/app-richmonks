import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const dismissListeners = new Set();
export function dismissAllLineGraphTooltips() {
  dismissListeners.forEach((fn) => fn());
}
export let lastLineGraphTouchTime = 0;

function parsePriceChangeNumber(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str) return null;
  const cleaned = str.replace(/[₹,()%+]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  if (str.includes('-') && num > 0) return -num;
  return num;
}

function getPointColor(raw) {
  let changeNum = null;
  if (typeof raw === 'object' && raw !== null) {
    changeNum = parsePriceChangeNumber(raw.price_change) ?? parsePriceChangeNumber(raw.price_change_value);
  } else {
    changeNum = parsePriceChangeNumber(raw);
  }
  if (changeNum == null || changeNum === 0) return '#94A3B8';
  return changeNum > 0 ? '#10B981' : '#EF4444';
}

function formatTooltipPrice(price) {
  if (price == null || price === '') return '₹0';
  const clean = String(price).replace(/[₹,]/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return `₹${price}`;
  const hasDecimals = clean.includes('.');
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function formatTooltipPercent(pct) {
  if (pct == null || pct === '') return '(0.00%)';
  const num = parsePriceChangeNumber(pct);
  if (num == null) return `(${pct}%)`;
  const absStr = Math.abs(num).toFixed(2);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `(${sign}${absStr}%)`;
}

function formatDateTime(cdate, time, timestamp) {
  let dateStr = '';
  if (cdate) {
    const str = String(cdate).trim();
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let day, monthIdx;
        if (parts[0].length === 4) {
          day = parseInt(parts[2], 10);
          monthIdx = parseInt(parts[1], 10) - 1;
        } else {
          day = parseInt(parts[0], 10);
          monthIdx = parseInt(parts[1], 10) - 1;
        }
        if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
          dateStr = `${day} ${months[monthIdx]}`;
        }
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
  if (timestamp) {
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${d.getDate()} ${months[d.getMonth()]} ${hours}:${mins}`;
      }
    } catch (_) {}
  }
  return '';
}

function findNearestPointIndex(touchX, points) {
  if (!points || points.length === 0) return -1;
  if (points.length === 1) return 0;
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const diff = Math.abs(points[i].x - touchX);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

export default function LineGraph({ data = [], height = 190, style, onPointSelect, captureOnStart = false }) {
  const [layout, setLayout] = useState({ width: 0, height });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [tooltipSize, setTooltipSize] = useState({ width: 130, height: 44 });
  const selectedIndexRef = useRef(-1);
  const directionRef = useRef(null);
  const touchRef = useRef(null);

  const clearSelection = useCallback(() => {
    selectedIndexRef.current = -1;
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    dismissListeners.add(clearSelection);
    return () => dismissListeners.delete(clearSelection);
  }, [clearSelection]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebOutside = () => {
        if (Date.now() - lastLineGraphTouchTime > 150) clearSelection();
      };
      window.addEventListener('pointerdown', handleWebOutside, true);
      return () => window.removeEventListener('pointerdown', handleWebOutside, true);
    }
  }, [clearSelection]);

  useEffect(() => {
    clearSelection();
  }, [data, clearSelection]);

  const onLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0) setLayout({ width: w, height: h || height });
  }, [height]);

  const onTooltipLayout = useCallback((e) => {
    const { width: tw, height: th } = e.nativeEvent.layout;
    if (tw > 0 && th > 0) {
      setTooltipSize((prev) => (prev.width !== tw || prev.height !== th ? { width: tw, height: th } : prev));
    }
  }, []);

  const axisLeft = 6;
  const axisRight = 6;
  const padTop = 26;
  const padBottom = 22;
  const pointGapLeft = 12;
  const pointGapRight = 8;
  const xAxisGap = 12;
  const axisBottomY = layout.height - padBottom + 2;
  const plotFloorY = axisBottomY - xAxisGap;

  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || layout.width <= 0) return [];
    const valid = data.map((d, index) => {
      const p = parseFloat(String(d?.price ?? '').replace(/,/g, ''));
      return { raw: d, index, price: isNaN(p) ? 0 : p };
    });

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < valid.length; i++) {
      if (valid[i].price < min) min = valid[i].price;
      if (valid[i].price > max) max = valid[i].price;
    }
    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 0;
    }
    const range = max === min ? 0 : max - min;
    const startX = axisLeft + pointGapLeft;
    const endX = layout.width - axisRight - pointGapRight;
    const usableW = Math.max(1, endX - startX);
    const usableH = Math.max(1, plotFloorY - padTop);
    const n = valid.length;

    return valid.map((item, i) => {
      const x = n === 1 ? layout.width / 2 : startX + (i / (n - 1)) * usableW;
      const y = n === 1 || range === 0 ? padTop + usableH / 2 : padTop + usableH - ((item.price - min) / range) * usableH;
      return {
        ...item,
        x,
        y,
        color: getPointColor(item.raw),
      };
    });
  }, [data, layout.width, layout.height, axisLeft, axisRight, padTop, plotFloorY, pointGapLeft, pointGapRight]);

  const pointsRef = useRef(points);
  pointsRef.current = points;

  const handleTouch = useCallback((touchX) => {
    lastLineGraphTouchTime = Date.now();
    const pts = pointsRef.current;
    if (!pts || pts.length === 0) return;
    const idx = findNearestPointIndex(touchX, pts);
    if (idx !== -1 && idx !== selectedIndexRef.current) {
      selectedIndexRef.current = idx;
      setSelectedIndex(idx);
      if (onPointSelect) onPointSelect(pts[idx].raw, idx);
    }
  }, [onPointSelect]);

  const panResponder = useMemo(() => {
    let originX = 0;
    const claimHorizontal = (g) => {
      if (directionRef.current === 'v') return false;
      if (directionRef.current === 'h') return true;
      const ax = Math.abs(g.dx);
      const ay = Math.abs(g.dy);
      if (ax < 10 && ay < 10) return false;
      if (ax > ay * 1.5) {
        directionRef.current = 'h';
        return true;
      }
      directionRef.current = 'v';
      return false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => captureOnStart,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => claimHorizontal(g),
      onMoveShouldSetPanResponderCapture: (_, g) => claimHorizontal(g),
      onPanResponderGrant: (evt, g) => {
        directionRef.current = 'h';
        originX = (evt.nativeEvent.locationX || 0) - (g.dx || 0);
        handleTouch(originX + (g.dx || 0));
      },
      onPanResponderMove: (_, g) => {
        handleTouch(originX + g.dx);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => { directionRef.current = null; },
      onPanResponderRelease: () => { directionRef.current = null; },
    });
  }, [handleTouch, captureOnStart]);

  const onGraphTouchStart = useCallback((e) => {
    lastLineGraphTouchTime = Date.now();
    directionRef.current = null;
    touchRef.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      locX: e.nativeEvent.locationX,
      dx: 0,
      dy: 0,
      cancelled: false,
    };
  }, []);

  const onGraphTouchMove = useCallback((e) => {
    const t = touchRef.current;
    if (!t || t.cancelled) return;
    t.dx = e.nativeEvent.pageX - t.x;
    t.dy = e.nativeEvent.pageY - t.y;
  }, []);

  const onGraphTouchCancel = useCallback(() => {
    if (touchRef.current) touchRef.current.cancelled = true;
    touchRef.current = null;
  }, []);

  const onGraphTouchEnd = useCallback((e) => {
    const t = touchRef.current;
    touchRef.current = null;
    if (!t || t.cancelled || directionRef.current) return;
    const dx = e.nativeEvent.pageX - t.x;
    const dy = e.nativeEvent.pageY - t.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Math.abs(t.dx) < 10 && Math.abs(t.dy) < 10) {
      handleTouch(t.locX + dx);
    }
  }, [handleTouch]);

  const handlePointerMove = useCallback((e) => {
    if (Platform.OS === 'web' && e.nativeEvent) {
      const x = e.nativeEvent.offsetX ?? e.nativeEvent.locationX;
      if (x != null) handleTouch(x);
    }
  }, [handleTouch]);

  const usablePlotH = Math.max(1, plotFloorY - padTop);
  const gradHeight = Math.max(22, Math.round(usablePlotH * 0.25));

  const { linePaths, areaFills } = useMemo(() => {
    if (!points || points.length < 2) return { linePaths: [], areaFills: [] };
    const paths = [];
    const fills = [];
    let currentPath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    let currentColor = points[1].color || '#94A3B8';

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segColor = p2.color || '#94A3B8';

      const gradId = segColor === '#10B981' ? 'grad-green' : segColor === '#EF4444' ? 'grad-red' : 'grad-neutral';
      const y1B = Math.min(plotFloorY, p1.y + gradHeight);
      const y2B = Math.min(plotFloorY, p2.y + gradHeight);
      const areaD = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p2.x.toFixed(1)} ${y2B.toFixed(1)} L ${p1.x.toFixed(1)} ${y1B.toFixed(1)} Z`;
      fills.push({ d: areaD, gradId, key: `fill-${i}` });

      if (segColor === currentColor) {
        currentPath += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      } else {
        paths.push({ d: currentPath, stroke: currentColor, key: `path-${i}` });
        currentPath = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        currentColor = segColor;
      }
    }
    paths.push({ d: currentPath, stroke: currentColor, key: `path-${points.length - 1}` });
    return { linePaths: paths, areaFills: fills };
  }, [points, plotFloorY, gradHeight]);

  const selectedPoint = selectedIndex >= 0 && selectedIndex < points.length ? points[selectedIndex] : null;

  let tooltipPos = null;
  if (selectedPoint && layout.width > 0) {
    const tw = tooltipSize.width || 130;
    const th = tooltipSize.height || 44;
    const targetX = selectedPoint.x - tw / 2;
    const clampedLeft = Math.max(4, Math.min(layout.width - tw - 4, targetX));
    const caretLeft = Math.max(10, Math.min(tw - 20, selectedPoint.x - clampedLeft - 5));

    const offset = 10;
    const spaceAbove = selectedPoint.y - th - offset;
    const spaceBelow = selectedPoint.y + offset;
    let isBelow = false;
    let top = spaceAbove;

    if (spaceAbove >= 4) {
      top = spaceAbove;
      isBelow = false;
    } else if (spaceBelow + th <= layout.height - 4) {
      top = spaceBelow;
      isBelow = true;
    } else {
      top = Math.max(4, spaceAbove);
      isBelow = false;
    }

    tooltipPos = { left: clampedLeft, top, isBelow, caretLeft };
  }

  const selectedPctVal = selectedPoint?.raw?.price_change ?? selectedPoint?.raw?.price_change_value;
  const selectedPctNum = parsePriceChangeNumber(selectedPctVal);
  const pctColor = selectedPctNum > 0 ? '#16A34A' : selectedPctNum < 0 ? '#EF4444' : '#64748B';

  return (
    <View
      style={[styles.container, { height }, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      onTouchStart={onGraphTouchStart}
      onTouchMove={onGraphTouchMove}
      onTouchEnd={onGraphTouchEnd}
      onTouchCancel={onGraphTouchCancel}
      onPointerMove={handlePointerMove}
    >
      {layout.width > 0 && points.length > 0 && (
        <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
          {/* Subtle reference baseline & vertical axis */}
          <Line
            x1={axisLeft}
            y1={padTop - 4}
            x2={axisLeft}
            y2={axisBottomY}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
          <Line
            x1={axisLeft}
            y1={axisBottomY}
            x2={layout.width - axisRight}
            y2={axisBottomY}
            stroke="#E2E8F0"
            strokeWidth={1}
          />

          {/* Selected crosshair line */}
          {selectedPoint && (
            <Line
              x1={selectedPoint.x}
              y1={padTop - 4}
              x2={selectedPoint.x}
              y2={axisBottomY}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Gradient defs for area fills */}
          <Defs>
            <SvgGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#10B981" stopOpacity="0.35" />
              <Stop offset="0.55" stopColor="#10B981" stopOpacity="0.10" />
              <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
            </SvgGradient>
            <SvgGradient id="grad-red" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#EF4444" stopOpacity="0.35" />
              <Stop offset="0.55" stopColor="#EF4444" stopOpacity="0.10" />
              <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
            </SvgGradient>
            <SvgGradient id="grad-neutral" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#94A3B8" stopOpacity="0.22" />
              <Stop offset="0.55" stopColor="#94A3B8" stopOpacity="0.06" />
              <Stop offset="1" stopColor="#94A3B8" stopOpacity="0" />
            </SvgGradient>
          </Defs>

          {/* Subtle area gradient fills */}
          {areaFills.map((f) => (
            <Path key={f.key} d={f.d} fill={`url(#${f.gradId})`} />
          ))}

          {/* Transitioning colored connecting line segments */}
          {linePaths.map((p) => (
            <Path key={p.key} d={p.d} fill="none" stroke={p.stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Dots */}
          {points.map((pt) => {
            const isSelected = selectedIndex === pt.index;
            return (
              <G key={`pt-${pt.index}`}>
                {isSelected && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={7}
                    fill={pt.color}
                    fillOpacity={0.2}
                    stroke={pt.color}
                    strokeWidth={1.5}
                  />
                )}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={3.2}
                  fill={pt.color}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              </G>
            );
          })}
        </Svg>
      )}

      {selectedPoint && tooltipPos && (
        <View
          pointerEvents="none"
          onLayout={onTooltipLayout}
          style={[styles.tooltipCard, { left: tooltipPos.left, top: tooltipPos.top }]}
        >
          <View style={styles.tooltipFirstLine}>
            <Text style={styles.tooltipPrice}>{formatTooltipPrice(selectedPoint.raw?.price)}</Text>
            <Text style={[styles.tooltipPct, { color: pctColor }]}>{formatTooltipPercent(selectedPctVal)}</Text>
          </View>
          <Text style={styles.tooltipDate}>{formatDateTime(selectedPoint.raw?.cdate, selectedPoint.raw?.time, selectedPoint.raw?.timestamp)}</Text>
          <View
            style={[
              tooltipPos.isBelow ? styles.caretUp : styles.caretDown,
              { left: tooltipPos.caretLeft },
            ]}
          />
        </View>
      )}
    </View>
  );
}

export { LineGraph };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
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
  tooltipFirstLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipPrice: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  tooltipPct: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  tooltipDate: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginTop: 2,
  },
  caretDown: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  caretUp: {
    position: 'absolute',
    top: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
});
