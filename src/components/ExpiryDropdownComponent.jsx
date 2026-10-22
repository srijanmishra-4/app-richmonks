import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, Platform, StyleSheet } from 'react-native';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import { useCommonData } from '@/context/CommonDataContext';
import { useWideStyles } from '@/utils/responsive';

const PRIMARY = '#0071A9';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTHLY_STATES = ['near', 'next', 'far'];
const WEEKLY_STATES = ['weeklyNear', 'weeklyNext', 'weeklyFar'];

export function formatExpiryDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (match) {
    const month = MONTHS[Number(match[2]) - 1];
    return month ? `${Number(match[3])} ${month}` : str;
  }
  return str;
}

// Weekly expiries can share a date with a monthly one, so they carry a "(W)" suffix.
export function useExpiryOptions(withWeekly = false) {
  const { allExpiryDates, nearExpiry, nextExpiry } = useCommonData();
  return useMemo(() => {
    const states = withWeekly ? [...MONTHLY_STATES, ...WEEKLY_STATES] : MONTHLY_STATES;
    const list = (Array.isArray(allExpiryDates) ? allExpiryDates : []).filter((item) => states.includes(item?.expiry_state));
    if (list.length > 0) {
      list.sort((a, b) => String(a?.expiry_date ?? '').localeCompare(String(b?.expiry_date ?? '')));
      return list.map((item) => {
        const label = formatExpiryDate(item.expiry_date) || item.expiry_date;
        return { value: item.expiry_state, label: WEEKLY_STATES.includes(item.expiry_state) ? `${label} (W)` : label };
      });
    }
    const choices = [];
    if (nearExpiry) choices.push({ value: 'near', label: formatExpiryDate(nearExpiry) || nearExpiry });
    if (nextExpiry) choices.push({ value: 'next', label: formatExpiryDate(nextExpiry) || nextExpiry });
    if (!choices.length) choices.push({ value: 'near', label: 'Near' }, { value: 'next', label: 'Next' });
    return choices;
  }, [allExpiryDates, nearExpiry, nextExpiry, withWeekly]);
}

function ExpiryDropdownComponent({ value, onSelect, withWeekly = false }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const styles = useWideStyles(createStyles);
  const options = useExpiryOptions(withWeekly);
  const current = options.find((item) => item.value === value);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!options.length) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 92);
      const screenWidth = Dimensions.get('window').width;
      const left = Math.max(8, Math.min(x, screenWidth - menuWidth - 8));
      setAnchor({ left, top: y + height + 3, width: menuWidth });
      setOpen(true);
    });
  }, [open, options.length]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} maxFontSizeMultiplier={1.1}>Expiry Date</Text>
      <View ref={anchorRef} collapsable={false}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Expiry Date" accessibilityState={{ expanded: open }} style={[styles.btn, open ? styles.btnOpen : null, Platform.OS === 'web' ? styles.pointer : null]}>
          <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1.1}>{current?.label ?? '—'}</Text>
          <View style={open ? styles.chevronUp : styles.chevronDown}><ChevronRightIcon size={12} color={MUTED} /></View>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.menuRoot}>
          <View collapsable={false} onTouchEnd={() => setOpen(false)} style={[styles.menuBackdrop, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]} />
          {anchor ? (
            <View style={[styles.menu, { left: anchor.left, top: anchor.top, width: anchor.width }]}>
              {options.map((item, index) => {
                const active = item.value === value;
                return (
                  <Pressable key={`${item.value}-${index}`} onPress={() => { setOpen(false); onSelect(item.value); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.menuItem, active ? styles.menuItemActive : null, Platform.OS === 'web' ? styles.pointer : null]}>
                    <Text style={[styles.menuText, active ? styles.menuTextActive : null]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{item.label}</Text>
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

export default memo(ExpiryDropdownComponent);

const createStyles = (f, s) => ({
  pointer: { cursor: 'pointer' },
  wrap: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: f(6, 10, 8) },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: f(30, 36), minWidth: f(80, 100), paddingHorizontal: f(8, 12, 10), borderRadius: f(8, 10), borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, backgroundColor: '#FFFFFF', gap: f(6, 8) },
  btnOpen: { borderColor: PRIMARY },
  chevronDown: { transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },
  menuRoot: { flex: 1 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject },
  menu: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: f(8, 10), borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, paddingVertical: f(4, 6), shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  menuItem: { paddingHorizontal: f(10, 14, 12), paddingVertical: f(7, 10, 9) },
  menuItemActive: { backgroundColor: '#F8FAFC' },
  menuTextActive: { color: PRIMARY },
  label: { fontSize: f(11.5, 13.5, s(12)), lineHeight: f(16, 18, s(16)), fontFamily: 'Inter_500Medium', color: MUTED },
  value: { fontSize: f(12, 14, s(13)), lineHeight: f(16, 18, s(17)), fontFamily: 'Inter_600SemiBold', color: TEXT },
  menuText: { fontSize: f(12, 14, s(12)), lineHeight: f(16, 18, s(16)), fontFamily: 'Inter_500Medium', color: TEXT },
});
