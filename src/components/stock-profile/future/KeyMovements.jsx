import { memo } from 'react';
import { View, Text } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';
import TakeawayText, { BLUE, TEXT } from './TakeawayText';

const DIVIDER = '#E2E8F0';

function KeyMovements({ data, movements, symbol }) {
  const styles = useFluidStyles(createStyles);
  const raw = Array.isArray(data) ? data : Array.isArray(movements) ? movements : [];
  const list = raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
  if (!list.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.1}>Intraday Movement</Text>
      <View style={styles.content}>
        {list.map((item, index) => (
          <View key={`${index}-${item.slice(0, 16)}`} style={[styles.row, index === 0 && styles.firstRow, index === list.length - 1 && styles.lastRow]}>
            <View style={styles.accent} />
            <TakeawayText text={item} symbol={symbol} style={styles.text} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(KeyMovements);

const createStyles = (f) => ({
  section: { marginHorizontal: f(16, 24), marginTop: f(24, 28) },
  heading: { fontSize: f(16, 17), lineHeight: f(22, 24), fontFamily: 'Inter_700Bold', color: TEXT },
  content: { marginTop: f(8, 10) },
  row: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: f(12, 14), borderBottomWidth: 1, borderBottomColor: DIVIDER },
  firstRow: { paddingTop: f(6, 8) },
  lastRow: { borderBottomWidth: 0, paddingBottom: 0 },
  accent: { width: 3, borderRadius: 2, backgroundColor: BLUE, marginRight: f(16, 18), marginVertical: f(2, 3) },
  text: { flex: 1 },
});
