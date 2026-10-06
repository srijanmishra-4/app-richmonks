import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ComingSoon() {
  return (
    <View style={styles.root}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>Coming Soon</Text>
      </View>
    </View>
  );
}

export default memo(ComingSoon);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF6FB', borderWidth: 1, borderColor: '#BFDBFE' },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0071A9', letterSpacing: 0.2 },
});
