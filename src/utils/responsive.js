import { useMemo } from 'react';
import { Dimensions, StyleSheet, useWindowDimensions } from 'react-native';

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
