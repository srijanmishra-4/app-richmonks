import { memo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFluidStyles } from '@/utils/responsive';
import TakeawayText, { BLUE, TEXT } from './TakeawayText';

const CARD_BG = '#F2F8FC';
const CARD_BORDER = '#D6E8F2';
const DIVIDER = '#DCE8EF';
const BULB = '#D97706';
const BULB_BG = '#FEF3C7';
const BULB_RING = '#FDE68A';

function BulbIcon({ size, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 18h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 22h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IntradayMovement({ data, insights, symbol }) {
  const styles = useFluidStyles(createStyles);
  const raw = Array.isArray(data) ? data : Array.isArray(insights) ? insights : [];
  const list = raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
  if (!list.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.bulbRing}>
          <View style={styles.bulbCircle}>
            <BulbIcon size={styles.bulb.width} color={BULB} />
          </View>
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.1}>RM Insights</Text>
      </View>
      <View style={styles.content}>
        {list.map((item, index) => (
          <View key={`${index}-${item.slice(0, 16)}`} style={[styles.row, index === list.length - 1 && styles.lastRow]}>
            <View style={styles.dot} />
            <TakeawayText text={item} symbol={symbol} style={styles.text} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(IntradayMovement);

const createStyles = (f) => {
  const ring = f(36, 40);
  const circle = f(26, 28);
  const lineHeight = f(22, 24);
  const dot = f(5, 6);
  return {
    card: { marginHorizontal: f(16, 24), marginTop: f(40, 48), backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: f(16, 18), paddingHorizontal: f(20, 24), paddingTop: f(14, 16), paddingBottom: f(16, 18) },
    header: { flexDirection: 'row', alignItems: 'center' },
    bulbRing: { width: ring, height: ring, borderRadius: ring / 2, backgroundColor: 'rgba(253, 230, 138, 0.45)', alignItems: 'center', justifyContent: 'center' },
    bulbCircle: { width: circle, height: circle, borderRadius: circle / 2, backgroundColor: BULB_BG, borderWidth: 1, borderColor: BULB_RING, alignItems: 'center', justifyContent: 'center' },
    bulb: { width: f(14, 15) },
    title: { marginLeft: f(12, 14), fontSize: f(15, 16), lineHeight: f(20, 22), fontFamily: 'Inter_700Bold', color: TEXT },
    content: { marginTop: f(10, 12) },
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: f(12, 14), borderBottomWidth: 1, borderBottomColor: DIVIDER },
    lastRow: { borderBottomWidth: 0, paddingBottom: 0 },
    dot: { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: BLUE, marginTop: (lineHeight - dot) / 2, marginRight: f(16, 18) },
    text: { flex: 1 },
  };
};
