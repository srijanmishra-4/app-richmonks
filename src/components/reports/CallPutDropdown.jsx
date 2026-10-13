import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, Platform, StyleSheet } from 'react-native';

export const CALL_PUT_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'put', label: 'Put' },
];

function CallPutDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (nodeContains(menuRef.current, target) || nodeContains(anchorRef.current, target)) return;
      setOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  const selected = CALL_PUT_OPTIONS.find((item) => item.value === value) || CALL_PUT_OPTIONS[0];

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 88);
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
          accessibilityLabel="Select Option Type"
          accessibilityState={{ expanded: open }}
          style={[styles.btn, open ? styles.btnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <Text style={styles.btnText} numberOfLines={1}>{selected.label}</Text>
          <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <View
          collapsable={false}
          onStartShouldSetResponder={() => true}
          onResponderRelease={close}
          onTouchEnd={close}
          {...(Platform.OS === 'web' ? { onClick: close } : null)}
          style={[
            styles.overlay,
            {
              width: Dimensions.get('screen').width,
              height: Dimensions.get('screen').height,
            },
          ]}
        >
          {anchor ? (
            <View
              ref={menuRef}
              collapsable={false}
              onTouchEnd={(event) => event.stopPropagation?.()}
              {...(Platform.OS === 'web' ? { onClick: (event) => event.stopPropagation() } : null)}
              style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}
            >
              {CALL_PUT_OPTIONS.map((item) => {
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

function nodeContains(node, target) {
  if (!node || !target || typeof node.contains !== 'function') return false;
  return node.contains(target);
}

export default memo(CallPutDropdown);

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  pointer: { cursor: 'pointer' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    minWidth: 72,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    gap: 6,
  },
  btnOpen: { borderColor: '#0071A9' },
  btnText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  caret: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  menu: {
    position: 'absolute',
    zIndex: 2,
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 8 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  menuTextActive: { color: '#0071A9', fontFamily: 'Inter_600SemiBold' },
});
