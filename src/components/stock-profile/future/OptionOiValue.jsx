import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';

function toNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null || typeof val === 'boolean') return null;
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return null;
  const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
  const n = Number(s.replace(/[₹,\s%()+\-]/g, ''));
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : null;
}

function grouped(intPart) {
  if (intPart.length <= 3) return intPart;
  return `${intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${intPart.slice(-3)}`;
}

function moneyBody(n) {
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return `${grouped(i)}.${d}`;
}

function formatValue(val) {
  const n = toNum(val);
  if (n == null) return '-';
  const body = moneyBody(n);
  return n < 0 ? `-₹${body}` : `₹${body}`;
}

function additionMeta(val) {
  const n = toNum(val);
  if (n == null) return { text: '-', color: MUTED, dir: 0 };
  const body = moneyBody(n);
  if (n > 0) return { text: `+₹${body}`, color: GREEN, dir: 1 };
  if (n < 0) return { text: `-₹${body}`, color: RED, dir: -1 };
  return { text: `₹${body}`, color: MUTED, dir: 0 };
}

function Arrow({ up, color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d={up ? 'M6 10V2M2.5 5.5L6 2l3.5 3.5' : 'M6 2v8M2.5 6.5L6 10l3.5-3.5'} stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatPcr(val) {
  const n = toNum(val);
  if (n == null) return '-';
  return n.toFixed(2);
}

function OIPanel({ label, oiValue, addition, styles, wide }) {
  const add = additionMeta(addition);
  return (
    <View style={[styles.panel, wide ? styles.panelWide : null]}>
      <Text style={styles.panelLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text>
      <Text style={[styles.oiLabel, wide ? styles.oiLabelWide : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>OI Value</Text>
      <Text style={[styles.oiValue, wide ? styles.oiValueWide : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{formatValue(oiValue)}</Text>
      <View style={styles.panelDivider} />
      <View style={styles.additionRow}>
        <Text style={styles.additionLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>Addition</Text>
        <View style={styles.additionValueWrap}>
          {add.dir !== 0 ? <Arrow up={add.dir > 0} color={add.color} size={styles.arrow.width} /> : null}
          <Text style={[styles.additionValue, wide ? styles.additionValueWide : null, { color: add.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>{add.text}</Text>
        </View>
      </View>
    </View>
  );
}

function OptionOiValue({ pcr, optionData }) {
  const { isLaptop } = useBreakpoint();
  const styles = useFluidStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title} maxFontSizeMultiplier={1.1}>OI Value</Text>
        <View style={styles.pcrWrap}>
          <Text style={styles.pcrLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>PCR</Text>
          <Text style={styles.pcrValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{formatPcr(pcr)}</Text>
        </View>
      </View>
      <View style={styles.panels}>
        <OIPanel label="CALL" oiValue={optionData?.call_value} addition={optionData?.call_addition_val} styles={styles} wide={isLaptop} />
        <OIPanel label="PUT" oiValue={optionData?.put_value} addition={optionData?.put_addition_val} styles={styles} wide={isLaptop} />
      </View>
    </View>
  );
}

export default memo(OptionOiValue);

const createStyles = (f) => ({
  wrap: { marginHorizontal: f(16, 24), marginTop: f(18, 22) },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: f(10, 12), marginBottom: f(16, 18) },
  title: { flex: 1, minWidth: 0, fontSize: f(16, 17), lineHeight: f(20, 22), fontFamily: 'Inter_600SemiBold', color: TEXT },
  pcrWrap: { flexDirection: 'row', alignItems: 'center', gap: f(6, 8), backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: f(12, 14), paddingVertical: f(6, 7) },
  pcrLabel: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED, letterSpacing: 0.6 },
  pcrValue: { fontSize: f(13, 14), lineHeight: f(16, 18), fontFamily: 'Inter_600SemiBold', color: TEXT, fontVariant: ['tabular-nums'] },
  panels: { flexDirection: 'row', gap: f(10, 12) },
  panel: { flex: 1, minWidth: 0, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: f(12, 14), paddingHorizontal: f(12, 14), paddingTop: f(14, 16), paddingBottom: f(14, 16) },
  panelWide: { paddingTop: f(12, 14), paddingBottom: f(12, 14) },
  panelLabel: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_600SemiBold', color: '#334155', letterSpacing: 0.8 },
  oiLabel: { marginTop: f(12, 14), fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_400Regular', color: MUTED },
  oiLabelWide: { marginTop: f(10, 12) },
  oiValue: { marginTop: f(6, 7), fontSize: f(20, 24), lineHeight: f(22, 24), fontFamily: 'Inter_600SemiBold', color: TEXT, fontVariant: ['tabular-nums'] },
  oiValueWide: { fontSize: f(18, 20), lineHeight: f(22, 24) },
  panelDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginTop: f(14, 16), marginBottom: f(12, 14) },
  additionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: f(6, 8) },
  additionLabel: { flexShrink: 0, fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_400Regular', color: MUTED },
  additionValueWrap: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: f(3, 4) },
  arrow: { width: f(10, 11) },
  additionValue: { flexShrink: 1, fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', textAlign: 'right', fontVariant: ['tabular-nums'] },
  additionValueWide: { fontSize: f(12, 13), lineHeight: f(16, 17) },
});
