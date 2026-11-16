import { memo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const MUTED = '#64748B';
const SUBTLE = '#94A3B8';

const THEMES = {
  green: {
    icon: '#16A34A',
    halo: '#E3F6E8',
    title: '#15803D',
    card: '#F4FBF6',
    border: '#D7F0DF',
    glow: 'rgba(22, 163, 74, 0.08)',
  },
  red: {
    icon: '#B42318',
    halo: '#FBE4E3',
    title: '#B42318',
    card: '#FDF5F5',
    border: '#F6DEDD',
    glow: 'rgba(180, 35, 24, 0.08)',
  },
  yellow: {
    icon: '#F5B000',
    halo: '#FDF0CC',
    title: '#C98A00',
    card: '#FFFBEF',
    border: '#F8EAC2',
    glow: 'rgba(245, 176, 0, 0.10)',
  },
};

const BIASES = {
  bullish: { title: 'BULLISH', glyph: 'bull', theme: 'green' },
  bearish: { title: 'BEARISH', glyph: 'bear', theme: 'red' },
  sideways: { title: 'SIDEWAYS', glyph: 'sideways', theme: 'yellow' },
  sidewaysbullish: { title: 'SIDEWAYS/BULLISH', glyph: 'sideways', theme: 'yellow' },
  sidewaysbearish: { title: 'SIDEWAYS/BEARISH', glyph: 'sideways', theme: 'yellow' },
};

const GLYPHS = {
  bull: 'M31.5 52.5C31 47.5 34.5 44.5 39.5 44.3L46 44C49 43.6 51 41.8 53 39.4C55.5 36.6 58.4 36.2 60.8 36.9C61.4 36 61.7 35.1 61.5 34C61.4 33.2 61.7 32.6 62.3 32.4C63.2 33.6 63.8 34.8 64.2 35.8L66.2 35.8C67 34.4 68.2 33.2 69.6 32.8C69.8 34.6 69 36.2 67.6 37.2L67.6 38.6C68.8 39.5 69.6 40.7 69.6 42C69.6 43.2 68.7 44 67.5 43.8L64.6 43.4C63.4 44.6 62 45.2 60.8 45.2L61.6 47.4L64.8 49.6C65.6 50.2 65.8 51.2 65.2 52L63 55.2C62.4 56 61.3 56 60.8 55.2C60.4 54.6 60.5 53.8 61 53.2L62.2 51.6L58.8 49.8C57.6 51.2 56.4 52.6 55.6 53.6L57.8 55.4C58.6 56 58.7 57.1 58 57.8L54.8 60.6C54 61.3 52.8 61 52.4 60.1C52.1 59.4 52.4 58.6 53 58.2L54.5 57.1L51.5 55.6C48.5 57 45 57.2 42.4 56.8L41.2 58.4L44.4 61.8C45 62.5 44.9 63.6 44.1 64.1C43.4 64.6 42.4 64.4 41.9 63.7L38.4 59.4C37.9 58.8 37.9 58 38.3 57.4L39.4 55.4C38.2 55 37.1 54.4 36.2 53.6C35.4 55.2 35.4 57 35.8 58.8L36.6 62.4C36.8 63.4 36.1 64.3 35.1 64.3C34.3 64.3 33.7 63.8 33.5 63L32.6 58.6C32.4 57.4 32.4 56.2 32.6 55C31.9 54.4 31.6 53.5 31.5 52.5Z',
  bear: 'M29.2 51C29 46.8 31.4 44.6 35 44.2L44 43.2C47.5 42.8 49.6 40.8 52.6 40.6C55.6 40.4 57.8 41.8 59 43.8L60.4 44.4C60.8 43.4 61.8 42.9 62.8 43.2C63.6 43.5 64 44.3 63.9 45.1L68.8 47.6C70 48.2 70.2 49.6 69.3 50.3C68.8 50.7 68 50.8 67.3 50.6L64.6 50.6C63.2 50.6 62.1 51.3 61.6 52.4L61.6 58.6C61.6 59.4 61 60 60.2 60L58.2 60C57.4 60 56.8 59.4 56.8 58.6L56.8 55.8L55 55.8L55 58.6C55 59.4 54.4 60 53.6 60L51.8 60C51 60 50.4 59.4 50.4 58.6L50.4 55.6L39.6 55.6L39.6 58.6C39.6 59.4 39 60 38.2 60L36.4 60C35.6 60 35 59.4 35 58.6L35 55.8L33.6 55.4L33.6 58.6C33.6 59.4 33 60 32.2 60L30.6 60C29.8 60 29.2 59.4 29.2 58.6Z',
  sideways: 'M28.6 50L38.6 40.6L38.6 46.9L61.4 46.9L61.4 40.6L71.4 50L61.4 59.4L61.4 53.1L38.6 53.1L38.6 59.4Z',
};

function resolveBias(bias) {
  if (typeof bias !== 'string') return null;
  return BIASES[bias.toLowerCase().replace(/[^a-z]/g, '')] ?? null;
}

function parsePercent(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;
  const str = val.trim();
  if (!str) return null;
  const negative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
  const num = parseFloat(str.replace(/[%,()+\-\s]/g, ''));
  if (!Number.isFinite(num)) return null;
  return negative ? -Math.abs(num) : num;
}

function formatPercent(num) {
  if (num == null) return '—';
  const abs = Number(Math.abs(num).toFixed(2));
  if (abs === 0) return '0%';
  return `${num > 0 ? '+' : '-'}${abs}%`;
}

function SentimentIcon({ glyph, theme, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill={theme.halo} />
      <Circle cx="50" cy="50" r="36.5" fill={theme.icon} />
      {glyph === 'sideways' ? (
        <Path d={GLYPHS.sideways} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round" />
      ) : (
        <Path d={GLYPHS[glyph]} fill="#FFFFFF" />
      )}
    </Svg>
  );
}

function TrendMark({ direction, color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      {direction === 0 ? (
        <Path d="M3 6H9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <Path
          d={direction > 0 ? 'M6 2.5L10 9H2Z' : 'M6 9.5L10 3H2Z'}
          fill={color}
          stroke={color}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function Metric({ label, value, hint, styles }) {
  const num = parsePercent(value);
  const direction = num == null || Number(num.toFixed(2)) === 0 ? 0 : num > 0 ? 1 : -1;
  const color = direction > 0 ? GREEN : direction < 0 ? RED : MUTED;
  const badge = direction > 0 ? styles.badgeUp : direction < 0 ? styles.badgeDown : styles.badgeFlat;

  return (
    <View style={styles.metric}>
      <View style={[styles.badge, badge]}>
        <TrendMark direction={direction} color={color} size={styles.trend.width} />
      </View>
      <View style={styles.metricBody}>
        <Text style={styles.metricLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label}</Text>
        <Text style={[styles.metricValue, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {formatPercent(num)}
        </Text>
        <Text style={styles.compare} maxFontSizeMultiplier={1.1}>{hint}</Text>
      </View>
    </View>
  );
}

function MarketBiasCard({ bias, comment, priceChange, futureOi }) {
  const styles = useFluidStyles(createStyles);
  const meta = resolveBias(bias);
  if (!meta) return null;

  const theme = THEMES[meta.theme];
  const description = typeof comment === 'string' ? comment.trim() : '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, boxShadow: `0 6px 20px ${theme.glow}` },
      ]}
    >
      <View style={styles.top}>
        <SentimentIcon glyph={meta.glyph} theme={theme} size={styles.icon.width} />
        <View style={styles.heading}>
          <Text style={styles.eyebrow} numberOfLines={1} maxFontSizeMultiplier={1.1}>MARKET BIAS</Text>
          <Text style={[styles.title, { color: theme.title }]} maxFontSizeMultiplier={1.1}>
            {meta.title}
          </Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2} maxFontSizeMultiplier={1.2}>{description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Price" value={priceChange} hint="vs previous close" styles={styles} />
        <View style={styles.divider} />
        <Metric label="Fut OI" value={futureOi} hint="vs previous oi" styles={styles} />
      </View>
    </View>
  );
}

export default memo(MarketBiasCard);

const createStyles = (f) => ({
  card: {
    marginHorizontal: f(16, 24),
    marginBottom: f(28, 36),
    paddingHorizontal: f(12, 14),
    paddingVertical: f(10, 12),
    borderRadius: f(14, 16),
    borderWidth: 1,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: f(10, 12) },
  icon: { width: f(44, 52) },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: f(8.5, 9.5),
    lineHeight: f(12, 13),
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.1,
    color: MUTED,
  },
  title: {
    marginTop: f(3, 4),
    fontSize: f(16, 18),
    lineHeight: f(20, 22),
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  description: {
    marginTop: f(3, 4),
    fontSize: f(10.5, 11.5),
    lineHeight: f(15, 16),
    fontFamily: 'Inter_400Regular',
    color: '#334155',
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: f(10, 12),
    paddingVertical: f(8, 10),
    paddingHorizontal: f(8, 10),
    borderRadius: f(10, 12),
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  metric: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: f(10, 12) },
  divider: { width: 1, alignSelf: 'stretch', marginHorizontal: f(8, 10), backgroundColor: 'rgba(148, 163, 184, 0.25)' },
  badge: { width: f(22, 26), height: f(22, 26), borderRadius: f(11, 13), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badgeUp: { backgroundColor: '#E3F6E8' },
  badgeDown: { backgroundColor: '#FBE4E3' },
  badgeFlat: { backgroundColor: '#F1F5F9' },
  trend: { width: f(9, 10) },
  metricBody: { flex: 1, minWidth: 0 },
  metricLabel: { fontSize: f(11, 12), lineHeight: f(14, 16), fontFamily: 'Inter_500Medium', color: MUTED },
  metricValue: { marginTop: 1, fontSize: f(14, 16), lineHeight: f(18, 20), fontFamily: 'Inter_600SemiBold' },
  compare: { marginTop: 1, fontSize: f(10.5, 11.5), lineHeight: f(14, 15), fontFamily: 'Inter_400Regular', color: SUBTLE },
});
