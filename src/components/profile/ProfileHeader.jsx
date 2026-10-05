import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';

export default function ProfileHeader({ title, onBack, id = 'profile-back' }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" id={id} style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
        <View style={styles.backIcon}><ChevronRightIcon size={18} color="#64748B" /></View>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontFamily: 'Inter_600SemiBold', color: '#0F172A', letterSpacing: -0.2 },
});
