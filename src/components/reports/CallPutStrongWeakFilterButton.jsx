import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useFluidStyles } from '@/utils/responsive';

export const CALL_PUT_FILTER_OPTIONS = ['Strong Call', 'Strong Put', 'Weak Call', 'Weak Put', 'Neutral'];

const INITIAL_ROWS = 10;
const EMPTY_ROWS = [];

const MATCHERS = {
  'Strong Call': (r) => r?.call_remark === 'Strong',
  'Strong Put': (r) => r?.put_remark === 'Strong',
  'Weak Call': (r) => r?.call_remark === 'Weak',
  'Weak Put': (r) => r?.put_remark === 'Weak',
  Neutral: (r) => r?.call_remark == null || r?.put_remark == null,
};

/**
 * Filter state + filtered rows for CallPutStrongWeakFilterButton. Rows are bucketed once per
 * source change. On a tap the list is shrunk to INITIAL_ROWS for one frame, which resets
 * FlatList's rendered window so it draws a few rows first and the rest in background batches.
 */
export function useCallPutStrengthFilter(rows) {
  const list = Array.isArray(rows) ? rows : EMPTY_ROWS;
  const [value, setValue] = useState(null);
  const [limitRows, setLimitRows] = useState(false);

  const buckets = useMemo(() => {
    const out = {};
    CALL_PUT_FILTER_OPTIONS.forEach((option) => { out[option] = list.filter(MATCHERS[option]); });
    return out;
  }, [list]);

  const onChange = useCallback((next) => {
    setLimitRows(true);
    setValue(next);
  }, []);
  useEffect(() => {
    if (!limitRows) return undefined;
    const id = requestAnimationFrame(() => setLimitRows(false));
    return () => cancelAnimationFrame(id);
  }, [limitRows, value]);

  const filtered = (value && buckets[value]) || list;
  const visibleRows = useMemo(
    () => (limitRows ? filtered.slice(0, INITIAL_ROWS) : filtered),
    [limitRows, filtered]
  );

  return { value, onChange, rows: visibleRows, limitRows };
}

function CallPutStrongWeakFilterButton({ value, onChange, style, withNeutral = true }) {
  const styles = useFluidStyles(createStyles);
  const handlePress = useCallback((item) => {
    onChange?.(value === item ? null : item);
  }, [onChange, value]);
  const options = withNeutral ? CALL_PUT_FILTER_OPTIONS : CALL_PUT_FILTER_OPTIONS.slice(0, 4);

  return (
    <View style={[styles.row, style]}>
      {options.map((item) => {
        const selected = value === item;
        const tone = item.startsWith('Strong') ? 'strong' : item.startsWith('Weak') ? 'weak' : 'neutral';
        const buttonActiveStyle = tone === 'strong' ? styles.strongButton : tone === 'weak' ? styles.weakButton : styles.buttonActive;
        const labelActiveStyle = tone === 'strong' ? styles.strongLabel : tone === 'weak' ? styles.weakLabel : styles.labelActive;
        return (
          <Pressable
            key={item}
            onPress={() => handlePress(item)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={item}
            style={[styles.button, selected ? buttonActiveStyle : null, Platform.OS === 'web' ? styles.pointer : null]}
          >
            <Text style={[styles.label, selected ? labelActiveStyle : null]} numberOfLines={1}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { CallPutStrongWeakFilterButton as CallPutStrongWeakFilter };
export default memo(CallPutStrongWeakFilterButton);

const createStyles = (f) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' },
  pointer: { cursor: 'pointer' },
  button: {
    flexGrow: 0,
    flexShrink: 1,
    width: f(112, 152),
    minWidth: 0,
    height: f(32, 38),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: f(8, 12),
    borderRadius: f(8, 10),
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  buttonActive: { backgroundColor: '#1E60F6', borderColor: '#1E60F6' },
  strongButton: { backgroundColor: '#E5F6EA', borderColor: '#16A34A' },
  weakButton: { backgroundColor: '#FCE8EC', borderColor: '#DC2626' },
  label: { fontSize: f(10.5, 13), lineHeight: f(14, 17), fontFamily: 'Inter_500Medium', color: '#64748B' },
  labelActive: { fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  strongLabel: { fontFamily: 'Inter_600SemiBold', color: '#16A34A' },
  weakLabel: { fontFamily: 'Inter_600SemiBold', color: '#DC2626' },
});
