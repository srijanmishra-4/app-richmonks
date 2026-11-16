import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ChevronIcon } from '@/components/icons/CommonIcons';
import { useCommonData } from '@/context/CommonDataContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#0071A9';
const MENU_ITEM_H = 36;
const MENU_PAD = 4;
const MENU_MAX_H = MENU_ITEM_H * 7 + MENU_PAD * 2;

function formatStrike(value) {
  if (value == null || value === '') return '—';
  const num = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value);
}

function OptionStrikeDropdown({ symbol, optionType, value, onSelect }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isLaptop } = useBreakpoint();
  const { strikePricesAndPrices } = useCommonData();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const side = String(optionType || '').trim().toUpperCase();
  const raw = strikePricesAndPrices?.[symbol]?.[side];
  const strikes = useMemo(() => {
    const list = Array.isArray(raw) ? raw.filter((item) => item != null && item !== '') : [];
    if (value != null && value !== '' && !list.some((item) => String(item) === String(value))) return [value, ...list];
    return list;
  }, [raw, value]);

  useEffect(() => { setOpen(false); }, [symbol, side]);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!strikes.length) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = 104;
      const contentHeight = strikes.length * MENU_ITEM_H + MENU_PAD * 2;
      const menuHeight = Math.min(Math.max(contentHeight, MENU_ITEM_H), MENU_MAX_H);
      const left = Math.max(8, Math.min(x, windowWidth - menuWidth - 8));
      let top = y + height + 6;
      if (top + menuHeight > windowHeight - 8) top = Math.max(8, y - menuHeight - 6);
      const index = Math.max(0, strikes.findIndex((item) => String(item) === String(value)));
      setAnchor({ left, top, width: menuWidth, height: menuHeight, index, scrollable: contentHeight > MENU_MAX_H });
      setOpen(true);
    });
  }, [open, strikes, value, windowWidth, windowHeight]);

  const select = useCallback((item) => {
    setOpen(false);
    if (String(item) !== String(value)) onSelect?.(item);
  }, [onSelect, value]);

  return (
    <View style={styles.wrap}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={toggle}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Strike ${formatStrike(value)}`}
          accessibilityState={{ expanded: open, disabled: strikes.length === 0 }}
          style={[styles.strike, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <View style={styles.strikeMark}>
            <Text style={[styles.strikeText, isLaptop ? styles.strikeTextWide : null]} numberOfLines={1}>{formatStrike(value)}</Text>
            <View style={styles.strikeUnderline} />
          </View>
          <ChevronIcon size={14} color="#94A3B8" direction="down" />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }]}>
              <FlatList
                data={strikes}
                keyExtractor={(item, index) => `${item}-${index}`}
                getItemLayout={(_, index) => ({ length: MENU_ITEM_H, offset: MENU_PAD + MENU_ITEM_H * index, index })}
                initialScrollIndex={anchor.scrollable ? Math.max(0, anchor.index - 2) : 0}
                scrollEnabled={anchor.scrollable}
                showsVerticalScrollIndicator={anchor.scrollable}
                style={anchor.scrollable ? null : styles.menuFixed}
                contentContainerStyle={styles.menuContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = String(item) === String(value);
                  return (
                    <Pressable onPress={() => select(item)} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                      <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>{formatStrike(item)}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const OPTION_TYPES = ['CE', 'PE'];

function OptionTypeMenu({ value, onSelect }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isLaptop } = useBreakpoint();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const selected = String(value || '').trim().toUpperCase();

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = 72;
      const menuHeight = OPTION_TYPES.length * MENU_ITEM_H + MENU_PAD * 2;
      const left = Math.max(8, Math.min(x, windowWidth - menuWidth - 8));
      let top = y + height + 6;
      if (top + menuHeight > windowHeight - 8) top = Math.max(8, y - menuHeight - 6);
      setAnchor({ left, top, width: menuWidth, height: menuHeight });
      setOpen(true);
    });
  }, [open, windowWidth, windowHeight]);

  const select = useCallback((item) => {
    setOpen(false);
    if (item !== selected) onSelect?.(item);
  }, [onSelect, selected]);

  return (
    <View style={styles.typeWrap}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={toggle}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Option type ${selected || 'none'}`}
          accessibilityState={{ expanded: open }}
          style={[styles.strike, Platform.OS === 'web' ? styles.pointer : null]}
        >
          <View style={styles.strikeMark}>
            <Text style={[styles.strikeText, isLaptop ? styles.strikeTextWide : null]} numberOfLines={1}>{selected || '—'}</Text>
            <View style={styles.strikeUnderline} />
          </View>
          <ChevronIcon size={14} color="#94A3B8" direction="down" />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }]}>
              <View style={styles.menuContent}>
                {OPTION_TYPES.map((item) => {
                  const active = item === selected;
                  return (
                    <Pressable key={item} onPress={() => select(item)} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                      <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default memo(OptionStrikeDropdown);
export const OptionTypeDropdown = memo(OptionTypeMenu);

const styles = StyleSheet.create({
  pointer: { cursor: 'pointer' },
  wrap: { flexShrink: 1, minWidth: 0 },
  typeWrap: { flexShrink: 0 },
  strike: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 6, backgroundColor: 'transparent' },
  strikeMark: { flexShrink: 1, alignItems: 'stretch', justifyContent: 'center' },
  strikeText: { fontSize: 13, lineHeight: 16, fontFamily: 'Inter_500Medium', color: MUTED },
  strikeTextWide: { fontSize: 14, lineHeight: 18 },
  strikeUnderline: { marginTop: 3, height: 0, borderBottomWidth: 1, borderStyle: 'dotted', borderBottomColor: '#94A3B8' },
  menuRoot: { flex: 1 },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuContent: { paddingVertical: MENU_PAD },
  menuFixed: { overflow: 'hidden' },
  menuItem: { height: MENU_ITEM_H, justifyContent: 'center', paddingHorizontal: 10 },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: TEXT },
  menuTextActive: { color: ACCENT, fontFamily: 'Inter_600SemiBold' },
});
