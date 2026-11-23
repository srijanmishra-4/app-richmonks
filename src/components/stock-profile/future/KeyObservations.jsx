import { memo } from 'react';
import { View, Text } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';
import TakeawayText, { BLUE, TEXT } from './TakeawayText';

function KeyObservations({ data, observations, symbol }) {
  const styles = useFluidStyles(createStyles);
  const raw = Array.isArray(data) ? data : Array.isArray(observations) ? observations : [];
  const list = raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
  if (!list.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.1}>Key Observation</Text>
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

export default memo(KeyObservations);

const createStyles = (f) => {
  const dot = f(7, 8);
  const lineHeight = f(22, 24);
  const gap = f(12, 14);
  return {
    section: { marginHorizontal: f(16, 24), marginTop: f(40, 48) },
    heading: { fontSize: f(16, 17), lineHeight: f(22, 24), fontFamily: 'Inter_700Bold', color: TEXT },
    content: { marginTop: f(14, 16) },
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: gap },
    lastRow: { paddingBottom: 0 },
    dot: { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: BLUE, marginTop: (lineHeight - dot) / 2, marginRight: f(12, 14) },
    text: { flex: 1 },
  };
};
