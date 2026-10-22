import { memo } from 'react';
import { View, Text } from 'react-native';
import { ClockIcon } from '@/components/ReportIconComponent';
import { useFluidStyles } from '@/utils/responsive';

function ReportTimestamp({ value }) {
  const styles = useFluidStyles(createStyles);
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;

  return (
    <View style={styles.wrap}>
      <ClockIcon size={12} color="#64748B" />
      <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.1}>{text}</Text>
    </View>
  );
}

export default memo(ReportTimestamp);

const createStyles = (f) => ({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: f(4, 6), flexShrink: 1, maxWidth: '48%' },
  text: { flexShrink: 1, fontSize: f(12, 14), lineHeight: f(16, 20), fontFamily: 'Inter_500Medium', color: '#64748B' },
});
