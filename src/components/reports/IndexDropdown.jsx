import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, Platform, StyleSheet } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';

export const INDEX_OPTIONS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];

function IndexDropdown({ value, onChange }) {
  const styles = useFluidStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onPointerDown = (e) => {
      if (nodeContains(menuRef.current, e.target) || nodeContains(anchorRef.current, e.target)) return;
      setOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointerDown, true), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', onPointerDown, true); };
  }, [open]);

  const selected = INDEX_OPTIONS.includes(value) ? value : INDEX_OPTIONS[0];

  const toggle = useCallback(() => {
    if (open) { setOpen(false); return; }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 100);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 4, width: menuWidth });
      setOpen(true);
    });
  }, [open]);

  return (
    <View style={styles.wrap}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Select Index" accessibilityState={{ expanded: open }} style={[styles.btn, open && styles.btnOpen, Platform.OS === 'web' && styles.pointer]}>
          <Text style={styles.btnText} numberOfLines={1}>{selected}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      {open ? <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <View collapsable={false} onStartShouldSetResponder={() => true} onResponderRelease={close} onTouchEnd={close} {...(Platform.OS === 'web' ? { onClick: close } : null)} style={[styles.overlay, { width: Dimensions.get('screen').width, height: Dimensions.get('screen').height }]}>
          {anchor ? (
            <View ref={menuRef} collapsable={false} onTouchEnd={(e) => e.stopPropagation?.()} {...(Platform.OS === 'web' ? { onClick: (e) => e.stopPropagation() } : null)} style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {INDEX_OPTIONS.map((item) => {
                const active = item === value;
                return (
                  <Pressable key={item} onPress={() => { setOpen(false); onChange(item); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.menuItem, active && styles.menuItemActive, Platform.OS === 'web' && styles.pointer]}>
                    <Text style={[styles.menuText, active && styles.menuTextActive]} numberOfLines={1}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal> : null}
    </View>
  );
}

function nodeContains(node, target) {
  return !!(node && target && typeof node.contains === 'function' && node.contains(target));
}

export default memo(IndexDropdown);

const createStyles = (f) => ({
  wrap: { justifyContent: 'center' },
  pointer: { cursor: 'pointer' },
  btn: { flexDirection: 'row', alignItems: 'center', height: f(30, 36), minWidth: f(92, 110), paddingHorizontal: f(8, 12), borderRadius: f(8, 10), borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'space-between', gap: f(4, 6) },
  btnOpen: { borderColor: '#0071A9' },
  btnText: { fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: f(9, 11), lineHeight: f(12, 14), fontFamily: 'Inter_500Medium', color: '#64748B' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.01)' },
  menu: { position: 'absolute', zIndex: 2, elevation: 4, backgroundColor: '#FFFFFF', borderRadius: f(8, 10), borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', paddingVertical: f(4, 6), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  menuItem: { paddingHorizontal: f(10, 14), paddingVertical: f(7, 10) },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: f(12, 14), lineHeight: f(16, 18), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: '#0071A9', fontFamily: 'Inter_600SemiBold' },
});
