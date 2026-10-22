import { memo, useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, Platform, StyleSheet } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';

export const STOCK_RANK_DROPDOWN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'top20', label: 'Top 20' },
  { value: 'bottom20', label: 'Bottom 20' },
];

function StockRankDropdown({ value, onChange }) {
  const styles = useFluidStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const anchorRef = useRef(null);

  const selected = STOCK_RANK_DROPDOWN_OPTIONS.find((item) => item.value === value) || STOCK_RANK_DROPDOWN_OPTIONS[0];

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 104);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x + width - menuWidth, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 4, width: menuWidth });
      setOpen(true);
    });
  }, [open]);

  return (
    <View style={styles.wrap}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Select ranking filter"
          accessibilityState={{ expanded: open }}
          style={[styles.btn, open ? styles.btnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <Text style={styles.btnText} numberOfLines={1}>{selected.label}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuBackdrop} onPress={() => setOpen(false)} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {STOCK_RANK_DROPDOWN_OPTIONS.map((item) => {
                const active = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setOpen(false);
                      onChange(item.value);
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
              })}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default memo(StockRankDropdown);

const createStyles = (f) => ({
  wrap: { justifyContent: 'center' },
  pointer: { cursor: 'pointer' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: f(30, 36),
    paddingHorizontal: f(8, 12),
    borderRadius: f(8, 10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: f(4, 6),
  },
  btnOpen: { borderColor: '#0071A9' },
  btnText: { fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: f(9, 11), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium', color: '#64748B' },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  menu: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: f(8, 10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingVertical: f(4, 6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  menuItem: { paddingHorizontal: f(10, 14), paddingVertical: f(7, 10) },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: '#0071A9', fontFamily: 'Inter_600SemiBold' },
});
