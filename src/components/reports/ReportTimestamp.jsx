import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ClockIcon } from '@/components/ReportIconComponent';

function ReportTimestamp({ value }) {
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

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, maxWidth: '48%' },
  text: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#64748B' },
});
