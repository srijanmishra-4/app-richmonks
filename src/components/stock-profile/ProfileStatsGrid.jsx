import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const BLUE = '#2563EB';
const RED = '#DC2626';
const TEXT = '#0F172A';
const MUTED = '#64748B';

function toNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val == null || typeof val === 'boolean') return null;
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan|-)$/i.test(s)) return null;
  const neg = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));
  const n = Number(s.replace(/[₹,\s%()+\-]/g, ''));
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : null;
}

function numText(val, digits) {
  const n = toNum(val);
  if (n == null) return digits ? `0.${'0'.repeat(digits)}` : '0';
  const abs = Math.abs(n);
  const fixed = digits != null ? abs.toFixed(digits) : (Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 100) / 100));
  const [i, d] = fixed.split('.');
  const g = i.length > 3 ? `${i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${i.slice(-3)}` : i;
  return `${n < 0 ? '-' : ''}${d != null ? `${g}.${d}` : g}`;
}

function chgMeta(val) {
  const n = toNum(val);
  if (n == null) return { text: '0', color: null };
  if (n > 0) return { text: `+${numText(n)}`, color: GREEN };
  if (n < 0) return { text: numText(n), color: RED };
  return { text: '0', color: null };
}

function pctMeta(val) {
  const n = toNum(val);
  if (n == null) return { text: '0', color: null };
  return { text: `${n > 0 ? '+' : n < 0 ? '-' : ''}${numText(Math.abs(n))}%`, color: n > 0 ? GREEN : n < 0 ? RED : null };
}

function textVal(val) {
  if (val == null || typeof val === 'object') return '-';
  const s = String(val).trim();
  if (!s || /^(null|undefined|nan)$/i.test(s)) return '-';
  return s;
}

function dmaStatus(val) {
  if (typeof val === 'boolean') return val ? ['Above', GREEN] : ['Below', RED];
  if (typeof val === 'number') return Number.isFinite(val) ? (val > 0 ? ['Above', GREEN] : ['Below', RED]) : ['-', null];
  const s = textVal(val);
  if (s === '-') return ['-', null];
  const k = s.toLowerCase();
  if (k === 'above' || k === 'abv' || k === 'true' || k === 'y' || k === 'yes' || k === '1') return ['Above', GREEN];
  if (k === 'below' || k === 'blw' || k === 'false' || k === 'n' || k === 'no' || k === '0') return ['Below', RED];
  if (k.includes('above')) return ['Above', GREEN];
  if (k.includes('below')) return ['Below', RED];
  return [s, null];
}

function gbrMeta(val) {
  const s = textVal(val);
  if (s === '-') return { text: '-', color: null };
  const k = s.toLowerCase();
  if (k === 'g' || k === 'green' || k.startsWith('green')) return { text: 'Green', color: GREEN };
  if (k === 'b' || k === 'blue' || k.startsWith('blue')) return { text: 'Blue', color: BLUE };
  if (k === 'r' || k === 'red' || k.startsWith('red')) return { text: 'Red', color: RED };
  return { text: s, color: null };
}

function levelColor(price, level) {
  const p = toNum(price);
  const l = toNum(level);
  if (p == null || l == null) return null;
  return p > l ? GREEN : RED;
}

function rupeeText(val, digits) {
  const text = numText(val, digits);
  if (text.startsWith('-')) return `-₹${text.slice(1)}`;
  return `₹${text}`;
}

function daysRange(low, high) {
  const part = (val) => {
    if (val == null || typeof val === 'boolean' || typeof val === 'object') return null;
    const s = String(val).trim();
    if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return null;
    return rupeeText(val);
  };
  const left = part(low);
  const right = part(high);
  if (left == null && right == null) return '—';
  return `${left ?? '—'} - ${right ?? '—'}`;
}

function optionRows(profile, stats) {
  const oiDay = chgMeta(stats?.chg_in_oi_one_day);
  const oiFive = chgMeta(stats?.chg_in_oi_five_day);
  return [
    [{ label: 'Daily WAP', value: rupeeText(profile?.wap) }, { label: 'Trigger Point', value: rupeeText(stats?.trigger_point) }, { label: "Days' Range", value: daysRange(profile?.low, profile?.high) }],
    [{ label: 'Volume (L)', value: numText(stats?.volume_today) }, { label: 'Peak OI', value: numText(stats?.peak_oi) }, { label: 'OI Value (L)', value: rupeeText(stats?.oi_val_inlakh) }],
    [{ label: 'OI', value: numText(stats?.oi) }, { label: 'ΔOI 1D', value: oiDay.text, color: oiDay.color }, { label: 'ΔOI 5D', value: oiFive.text, color: oiFive.color }],
  ];
}

function futureRows(profile) {
  const price = profile?.price;
  const performance = profile?.price_performance;
  const rolling = profile?.rolling_cost;
  const pain = profile?.pain_point;
  const pivot = profile?.pivot_point;
  const d5 = dmaStatus(performance?.abv_5_dma);
  const d20 = dmaStatus(performance?.abv_20_dma);
  const d100 = dmaStatus(performance?.abv_100_dma);
  const rankChg = chgMeta(profile?.rank_chg_20);
  const volChg = pctMeta(profile?.vol_chg);
  const gbr = gbrMeta(profile?.color);
  return [
    [{ label: 'Rolling Cost', value: rupeeText(rolling), color: levelColor(price, rolling) }, { label: 'Max Pain', value: rupeeText(pain, 2), color: levelColor(price, pain) }, { label: 'Pivot Point', value: rupeeText(pivot), color: levelColor(price, pivot) }],
    [{ label: 'GBR Color', value: gbr.text, color: gbr.color }, { label: 'Buy Above', value: rupeeText(profile?.buy_above) }, { label: 'Sell Below', value: rupeeText(profile?.sell_below) }],
    [{ label: 'Rank. (Δ 20 Days)', value: numText(profile?.rank), hint: rankChg.text, hintColor: rankChg.color }, { label: 'Volume. (Δ %)', value: `${numText(profile?.volume)} L`, hint: volChg.text, hintColor: volChg.color }, { label: 'Price Action', value: textVal(profile?.price_action) }],
    [{ label: '5 DMA', value: d5[0], color: d5[1] }, { label: '20 DMA', value: d20[0], color: d20[1] }, { label: '100 DMA', value: d100[0], color: d100[1] }],
  ];
}

function StockStatisticsGrid({ profile, variant, stats }) {
  const styles = useFluidStyles(createStyles);
  const rows = variant === 'option' ? optionRows(profile, stats) : futureRows(profile);

  return (
    <View style={styles.card}>
      {rows.map((cells, i) => (
        <View key={cells[0].label}>
          {i > 0 ? <View style={styles.hSep} /> : null}
          <View style={styles.row}>
            {cells.map((cell, idx) => (
              <View key={cell.label} style={styles.slot}>
                {idx > 0 ? <View style={styles.vSep} /> : null}
                <View style={styles.cell}>
                  <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{cell.label}</Text>
                  <Text style={[styles.value, { color: cell.color || (cell.value === '-' ? MUTED : TEXT) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{cell.value}</Text>
                  {cell.hint != null ? <Text style={[styles.hint, { color: cell.hintColor || MUTED }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{cell.hint}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default memo(StockStatisticsGrid);

const createStyles = (f) => ({
  card: { marginHorizontal: f(16, 24), marginBottom: f(8, 10) },
  row: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#FFFFFF' },
  hSep: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6EEF5' },
  slot: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  vSep: { width: StyleSheet.hairlineWidth, marginVertical: f(14, 16), backgroundColor: '#E1E8F0' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: f(14, 16), paddingHorizontal: f(8, 10) },
  label: { textAlign: 'center', fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
  value: { marginTop: f(6, 7), textAlign: 'center', fontSize: f(13, 14), lineHeight: f(17, 18), fontFamily: 'Inter_500Medium', color: TEXT },
  hint: { marginTop: f(2, 3), textAlign: 'center', fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
});
