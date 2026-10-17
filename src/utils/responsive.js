import { useMemo } from 'react';
import { Dimensions, StyleSheet, useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/constants/breakpoints';

// Design baseline width in dp; sizes match the design at 375 and are capped on either side.
const BASE = 375;

export const clamp = (min, v, max) => Math.min(Math.max(v, min), max);

const scaleFor = (width) => (size, min = size * 0.85, max = size * 1.15) => Math.round(clamp(min, (width / BASE) * size, max) * 2) / 2;

export const fs = (size, min, max) => scaleFor(Dimensions.get('window').width)(size, min, max);

export function useFs() {
  const { width } = useWindowDimensions();
  return useMemo(() => scaleFor(width), [width]);
}

// `factory` receives the bound fs() and must be a stable (module-level) function.
export function useScaledStyles(factory) {
  const scale = useFs();
  return useMemo(() => StyleSheet.create(factory(scale)), [scale, factory]);
}

// ─── Fluid sizing ──────────────────────────────────────────────────────────────
// f(min, max) is CSS `clamp(min, <linear vw>, max)` computed in JS, because
// native styles support neither clamp() nor rem:
//   • desktop (≥ lg): grows linearly from `min` at 1024 to `max` at 1920, capped after.
//   • tablet (sm … lg): `min`.
//   • phone (< sm): `min` scaled by width / 375, held within ±10%.
export const FLUID_FROM = BREAKPOINTS.lg;
export const FLUID_TO = BREAKPOINTS.xxl;

export function fluidFor(width) {
  const t = clamp(0, (width - FLUID_FROM) / (FLUID_TO - FLUID_FROM), 1);
  const phoneScale = width < BREAKPOINTS.sm ? clamp(0.9, width / BASE, 1.1) : 1;
  return (min, max = min) => Math.round((min + (max - min) * t) * phoneScale * 10) / 10;
}

export function useFluid() {
  const { width } = useWindowDimensions();
  return useMemo(() => fluidFor(width), [width]);
}

const fluidStyleCache = new WeakMap();

// `factory(f)` returns a StyleSheet object and must be a stable (module-level)
// function. Results are shared by every instance rendering at the same width.
export function useFluidStyles(factory) {
  const { width } = useWindowDimensions();
  const cached = fluidStyleCache.get(factory);
  if (cached && cached.width === width) return cached.styles;
  const styles = StyleSheet.create(factory(fluidFor(width)));
  fluidStyleCache.set(factory, { width, styles });
  return styles;
}

// Watchlist column beside the home stack on laptops.
export const SIDEBAR_WIDTH = { min: 340, max: 420 };
