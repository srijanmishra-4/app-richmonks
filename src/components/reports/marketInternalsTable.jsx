import { memo } from 'react';
import { View, Text } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';

export const GREEN = '#16A34A';
export const RED = '#DC2626';
export const NEUTRAL = '#64748B';
export const NORMAL = '#0F172A';

export const COL = { metric: 1.8, today: 1.0, yesterday: 1.1 };
export const MARKET_INTERNALS_COLUMNS = [
  { flex: COL.metric, align: 'left', lines: 1 },
  { flex: COL.today, align: 'right', lines: 1 },
  { flex: COL.yesterday, align: 'right', lines: 1 },
];

const PERCENTAGE_METRICS = new Set([
  'NF 1D', 'NF 5D', 'PPL 1D %', 'PPL 5D %', 'PPL 10D %', 'PPL 30D %', 'PPL 60D %',
  'TOP 20 1D PPL', 'BOTTOM 20 PPL', 'TOP 20 ROLL RETURN', 'MKT ROLL RETURN',
  'MWPL 5D', 'MWPL MOM', 'POSITIVE PPP CALL', 'POSITIVE PPP PUT', 'POSITIVE PPP TOTAL',
]);

export function isPercentageMetric(title) {
  if (!title) return false;
  const n = String(title).trim().toUpperCase();
  return PERCENTAGE_METRICS.has(n) || n.endsWith('%') || n.includes(' PPL') || n.includes('RETURN');
}

export function parseNumber(val) {
  if (val == null || val === '' || val === '—' || val === '-') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const clean = val.trim().replace(/[₹,\s%]/g, '');
    if (!clean) return null;
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function getValueColor(val, isPercentage) {
  if (!isPercentage) return NORMAL;
  const n = parseNumber(val);
  if (n === null) return NORMAL;
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return NEUTRAL;
}

export function renderMetricValue(val) {
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) {
    if (!val.length) return '—';
    return val.map((item) => (item == null ? '' : typeof item === 'object' ? JSON.stringify(item) : String(item))).filter(Boolean).join(', ') || '—';
  }
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return '—'; }
  }
  return String(val);
}

export const MarketInternalsRow = memo(function MarketInternalsRow({ data }) {
  const styles = useFluidStyles(createStyles);
  if (!data) return null;
  const isPct = isPercentageMetric(data.title);
  const todayColor = getValueColor(data.today, isPct);
  const yesterdayColor = getValueColor(data.yesterday, isPct);

  return (
    <>
      <View style={[styles.cell, { flex: COL.metric }]}>
        <Text style={styles.metricText} numberOfLines={2}>{renderMetricValue(data.title)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.today }]}>
        <Text style={[styles.valueText, { color: todayColor }]} numberOfLines={1}>{renderMetricValue(data.today)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.yesterday }]}>
        <Text style={[styles.valueText, { color: yesterdayColor }]} numberOfLines={1}>{renderMetricValue(data.yesterday)}</Text>
      </View>
    </>
  );
});

export function MarketInternalsHeader() {
  const styles = useFluidStyles(createStyles);
  return (
    <>
      <View style={[styles.hCell, { flex: COL.metric }]}>
        <Text style={styles.hLabel}>METRIC</Text>
      </View>
      <View style={[styles.hCell, styles.cellEnd, { flex: COL.today }]}>
        <Text style={[styles.hLabel, styles.hLabelRight]}>TODAY</Text>
      </View>
      <View style={[styles.hCell, styles.cellEnd, { flex: COL.yesterday }]}>
        <Text style={[styles.hLabel, styles.hLabelRight]}>PREVIOUS DAY</Text>
      </View>
    </>
  );
}

const createStyles = (f) => ({
  cell: { minWidth: 0, justifyContent: 'center', paddingRight: f(6, 12) },
  hCell: { minWidth: 0, justifyContent: 'center', paddingRight: f(6, 12) },
  cellEnd: { alignItems: 'flex-end', paddingRight: f(2, 6), paddingLeft: f(6, 12) },
  metricText: { fontSize: f(12, 14.5), lineHeight: f(16, 19), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  valueText: { fontSize: f(12, 14.5), lineHeight: f(16, 19), fontFamily: 'Inter_500Medium', textAlign: 'right' },
  hLabel: { fontSize: f(10, 12), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase' },
  hLabelRight: { textAlign: 'right' },
});
