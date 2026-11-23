import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';

export const BLUE = '#0071A9';
export const TEXT = '#0F172A';
export const BODY = '#1E293B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const BADGE_BG = '#E5F1F7';

const UP_WORDS = /^\W*(?:\w+\W+){0,2}?(above|up|higher|gain(?:ed)?|ris(?:e|en)|rose|increased?|jump(?:ed)?)\b/i;
const DOWN_WORDS = /^\W*(?:\w+\W+){0,2}?(below|down|lower|fall(?:en)?|fell|drop(?:ped)?|decreased?|declined?)\b/i;
const PERCENT = '[+-]?\\d+(?:\\.\\d+)?%';
// "N Days" at the end of a sentence ("...for the Last 6 Days"); "100 Day High" stays plain.
const DAYS = '\\b\\d+\\s+Days?(?=[\\s.!]*$)';
const LEADING_TICKER = '^[A-Z][A-Z0-9&-]+\\b';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildPattern(symbol) {
  const sym = typeof symbol === 'string' && symbol.trim() ? escapeRegex(symbol.trim()) : null;
  const parts = [`(${sym ? `\\b${sym}(?![A-Za-z0-9])` : LEADING_TICKER})`, `(${PERCENT})`, `(${DAYS})`];
  return new RegExp(parts.join('|'), 'g');
}

function percentTone(match, after) {
  if (match.startsWith('-') || DOWN_WORDS.test(after)) return 'down';
  if (match.startsWith('+') || UP_WORDS.test(after)) return 'up';
  return 'neutral';
}

export function tokenize(text, symbol) {
  const pattern = buildPattern(symbol);
  const tokens = [];
  let last = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1]) tokens.push({ type: 'symbol', value: m[1] });
    else if (m[2]) tokens.push({ type: 'percent', value: m[2], tone: percentTone(m[2], text.slice(pattern.lastIndex, pattern.lastIndex + 40)) });
    else if (m[3]) tokens.push({ type: 'days', value: m[3] });
    last = pattern.lastIndex;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

function TakeawayText({ text, symbol, style }) {
  const styles = useFluidStyles(createStyles);
  const tokens = useMemo(() => tokenize(text, symbol), [text, symbol]);

  return (
    <Text style={[styles.text, style]} maxFontSizeMultiplier={1.1}>
      {tokens.map((token, index) => {
        if (token.type === 'symbol') return <Text key={index} style={styles.symbol}>{token.value}</Text>;
        if (token.type === 'percent') {
          const tone = token.tone === 'up' ? styles.up : token.tone === 'down' ? styles.down : null;
          return <Text key={index} style={[styles.percent, tone]}>{token.value}</Text>;
        }
        if (token.type === 'days') {
          return (
            <View key={index} style={styles.badge}>
              <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>{token.value}</Text>
            </View>
          );
        }
        return token.value;
      })}
    </Text>
  );
}

export default memo(TakeawayText);

const createStyles = (f) => ({
  text: { fontSize: f(13, 14), lineHeight: f(22, 24), fontFamily: 'Inter_400Regular', color: BODY },
  symbol: { fontFamily: 'Inter_700Bold', color: TEXT },
  percent: { fontFamily: 'Inter_700Bold', color: TEXT },
  up: { color: GREEN },
  down: { color: RED },
  badge: { backgroundColor: BADGE_BG, borderRadius: 9999, paddingHorizontal: f(8, 9), paddingVertical: f(2, 3), marginLeft: f(2, 3) },
  badgeText: { fontSize: f(10, 11), lineHeight: f(13, 14), fontFamily: 'Inter_600SemiBold', color: BLUE },
});
