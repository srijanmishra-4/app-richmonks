import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, Dimensions, Platform, StyleSheet } from 'react-native';
import { useCommonData } from '@/context/CommonDataContext';

function IndustryDropdown({ value, onChange, style }) {
  const { industries } = useCommonData();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const anchorRef = useRef(null);

  const options = useMemo(() => {
    const list = [{ id: null, label: 'All Industries' }];
    if (Array.isArray(industries)) {
      industries.forEach((ind) => {
        if (ind?.industry) list.push({ id: ind.id, label: ind.industry });
      });
    }
    return list;
  }, [industries]);

  const selected = options.find((item) => item.id === value) || options[0];

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 160);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 4, width: menuWidth });
      setOpen(true);
    });
  }, [open]);

  return (
    <View style={[styles.wrap, style]}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Select Industry"
          accessibilityState={{ expanded: open }}
          style={[styles.btn, open ? styles.btnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <Text style={styles.btnText} numberOfLines={1} ellipsizeMode="tail">{selected.label}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <View collapsable={false} onTouchEnd={() => setOpen(false)} style={[styles.menuBackdrop, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              <FlatList
                data={options}
                keyExtractor={(item, index) => `${item.id ?? 'all'}-${index}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.id === value;
                  return (
                    <Pressable
                      onPress={() => {
                        setOpen(false);
                        onChange?.(item.id);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}
                    >
                      <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
                showsVerticalScrollIndicator={true}
                style={styles.list}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default memo(IndustryDropdown);

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', flexShrink: 1, maxWidth: 125 },
  pointer: { cursor: 'pointer' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 4,
    minWidth: 78,
  },
  btnOpen: { borderColor: '#0071A9' },
  btnText: { flexShrink: 1, fontSize: 11.5, lineHeight: 15, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: 8.5, lineHeight: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  menu: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  list: { maxHeight: 240 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 8 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: '#0071A9', fontFamily: 'Inter_600SemiBold' },
});
