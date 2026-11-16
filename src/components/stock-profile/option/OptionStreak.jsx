import { memo } from 'react';
import { View, Text } from 'react-native';

import { useFluidStyles } from '@/utils/responsive';

const TEXT = '#0F172A';
const NEUTRAL = '#64748B';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TONES = {
  S: { letter: 'S', bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  N: { letter: 'N', bg: '#E0F2FE', text: '#0071A9', border: '#BAE6FD' },
  W: { letter: 'W', bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
};
const EMPTY = { letter: '', bg: '#F8FAFC', text: NEUTRAL, border: '#E2E8F0' };

function monthName(token) {
  const s = String(token ?? '').slice(0, 3).toLowerCase();
  const i = MONTHS.findIndex((item) => item.toLowerCase() === s);
  return i >= 0 ? MONTHS[i] : '';
}

function dateParts(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
  }
  const s = String(val ?? '').trim();
  if (!s || /^(null|undefined|nan|-|—)$/i.test(s)) return { day: '', month: '' };
  let m = s.match(/(\d{1,2})[\s,./-]+([A-Za-z]{3,})/);
  if (m && monthName(m[2])) return { day: String(Number(m[1])), month: monthName(m[2]) };
  m = s.match(/([A-Za-z]{3,})[\s,./-]+(\d{1,2})/);
  if (m && monthName(m[1])) return { day: String(Number(m[2])), month: monthName(m[1]) };
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m && MONTHS[Number(m[2]) - 1]) return { day: String(Number(m[3])), month: MONTHS[Number(m[2]) - 1] };
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m && MONTHS[Number(m[2]) - 1]) return { day: String(Number(m[1])), month: MONTHS[Number(m[2]) - 1] };
  return { day: '', month: '' };
}

function expiryText(val) {
  const parts = dateParts(val);
  return parts.day && parts.month ? `${parts.day} ${parts.month}` : '';
}

function strikeText(strike) {
  const raw = String(strike ?? '').replace(/[₹,\s]/g, '').trim();
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(strike).trim();
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function sideLabel(optionType) {
  const side = String(optionType ?? '').trim().toUpperCase();
  if (side === 'CE' || side === 'CALL' || side === 'C') return 'Call';
  if (side === 'PE' || side === 'PUT' || side === 'P') return 'Put';
  return '';
}

function remarkTone(remark) {
  const s = String(remark ?? '').trim().toLowerCase();
  if (s === 's' || s === 'strong') return TONES.S;
  if (s === 'n' || s === 'neutral') return TONES.N;
  if (s === 'w' || s === 'weak') return TONES.W;
  return EMPTY;
}

function OptionStreak({ option_streak, symbol, strike, optionType, expiry }) {
  const styles = useFluidStyles(createStyles);
  const rows = Array.isArray(option_streak) ? option_streak : [];
  const title = [String(symbol ?? '').trim(), strikeText(strike), sideLabel(optionType), expiryText(expiry)].filter(Boolean).join(' ');
  const last = rows.length - 1;

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.1}>{title}</Text> : null}
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.1}>10 Day Performance</Text>
      {rows.length ? (
        <View style={styles.track}>
          {rows.map((item, i) => {
            const tone = remarkTone(item?.remark);
            const date = dateParts(item?.date);
            return (
              <View key={`${item?.date ?? 'day'}-${i}`} style={styles.item}>
                <View style={styles.node}>
                  <View style={[styles.rail, i === 0 ? styles.railStart : null, i === last ? styles.railEnd : null]} />
                  <View style={[styles.circle, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[styles.letter, { color: tone.text }]} maxFontSizeMultiplier={1.1}>{tone.letter}</Text>
                  </View>
                </View>
                <Text style={styles.day} maxFontSizeMultiplier={1.1}>{date.day || '—'}</Text>
                {date.month ? <Text style={styles.month} maxFontSizeMultiplier={1.1}>{date.month}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default memo(OptionStreak);

const createStyles = (f) => {
  const size = f(22, 26);
  return {
    wrap: { marginHorizontal: f(16, 24), marginTop: f(14, 18), marginBottom: f(16, 20) },
    title: { fontSize: f(16, 18), lineHeight: f(22, 24), fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2, color: TEXT },
    subtitle: { marginTop: f(2, 3), fontSize: f(12, 13), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: NEUTRAL },
    track: { marginTop: f(16, 20), flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
    item: { flex: 1, minWidth: 0, alignItems: 'center' },
    node: { width: '100%', height: size, alignItems: 'center', justifyContent: 'center' },
    rail: { position: 'absolute', left: 0, right: 0, top: (size - 1) / 2, height: 1, backgroundColor: '#D5DEE8' },
    railStart: { left: '50%' },
    railEnd: { right: '50%' },
    circle: { width: size, height: size, borderRadius: size / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    letter: { fontSize: f(11, 12), lineHeight: f(13, 14), fontFamily: 'Inter_700Bold', textAlign: 'center' },
    day: { marginTop: f(6, 7), fontSize: f(11, 12), lineHeight: f(13, 14), fontFamily: 'Inter_600SemiBold', color: TEXT, textAlign: 'center' },
    month: { fontSize: f(10, 11), lineHeight: f(12, 13), fontFamily: 'Inter_500Medium', color: NEUTRAL, textAlign: 'center' },
  };
};
