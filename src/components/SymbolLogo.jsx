import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import { cdnApi } from '@/utils/api';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { BREAKPOINTS } from '@/constants/breakpoints';

export const SYMBOL_LOGO_SIZE = 28;
export const SYMBOL_LOGO_GAP = 16;

// Room for a logo beside the symbol:
//   wider than xl, or from 470 up to lg.
// From lg through xl the home tables share a row, so the logo stays off.
const SYMBOL_LOGO_MIN_WIDTH = 470;

export function useShowSymbolLogo() {
  const { width } = useBreakpoint();
  return width > BREAKPOINTS.xl || (width >= SYMBOL_LOGO_MIN_WIDTH && width < BREAKPOINTS.lg);
}

export function useShowReportSymbolLogo() {
  const { width } = useBreakpoint();
  return (width >= BREAKPOINTS.md && width <= BREAKPOINTS.lg) || width >= BREAKPOINTS.xl;
}

export function SymbolWithLogo({ symbol, showLogo, children }) {
  if (!showLogo) return children;
  return (
    <View style={styles.row}>
      <SymbolLogo key={symbol || 'logo'} symbol={symbol} />
      <View style={styles.copy}>{children}</View>
    </View>
  );
}

export default function SymbolLogo({ symbol }) {
  const [failed, setFailed] = useState(false);
  const label = String(symbol || '').trim();
  const usable = label && label !== '—';

  if (!usable || failed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.initials} allowFontScaling={false}>{usable ? label.slice(0, 2).toUpperCase() : ''}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: cdnApi(label) }}
      style={styles.logo}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={`${label} logo`}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SYMBOL_LOGO_GAP, minWidth: 0, width: '100%' },
  copy: { flex: 1, minWidth: 0 },
  logo: { width: SYMBOL_LOGO_SIZE, height: SYMBOL_LOGO_SIZE },
  fallback: { width: SYMBOL_LOGO_SIZE, height: SYMBOL_LOGO_SIZE, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  initials: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#64748B' },
});
