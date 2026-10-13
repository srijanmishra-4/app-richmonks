import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';

const STRONG = 'Strong';
const WEAK = 'Weak';
const EMPTY_ROWS = [];

function isStrongRemark(remark) {
  const value = String(remark ?? '').trim().toLowerCase();
  return value === 's' || value === 'strong';
}

function isWeakRemark(remark) {
  const value = String(remark ?? '').trim().toLowerCase();
  return value === 'w' || value === 'weak';
}

function partitionRows(rows) {
  const strong = [];
  const weak = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const remark = row?.remark;
    if (isStrongRemark(remark)) strong.push(row);
    else if (isWeakRemark(remark)) weak.push(row);
  }
  return { [STRONG]: strong, [WEAK]: weak };
}

/**
 * Strong/Weak list filter. Rows are split once when the source changes, so a
 * tap only swaps to a ready list. The button updates immediately; the table
 * follows on the deferred value so a large list does not block the press.
 */
export function useStrongWeakFilter(rows, { enabled = true } = {}) {
  const list = Array.isArray(rows) ? rows : EMPTY_ROWS;
  const [value, setValue] = useState(null);
  const deferredValue = useDeferredValue(value);
  const buckets = useMemo(() => partitionRows(list), [list]);
  const active = enabled && (deferredValue === STRONG || deferredValue === WEAK) ? deferredValue : null;

  const clear = useCallback(() => setValue(null), []);

  return {
    value,
    onChange: setValue,
    clear,
    rows: active ? buckets[active] : list,
    pending: enabled && value !== deferredValue,
  };
}

const FilterButton = memo(function FilterButton({ label, selected, activeStyle, activeTextStyle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.button,
        selected ? activeStyle : null,
        Platform.OS === 'web' ? styles.pointer : null,
      ]}
    >
      <Text style={[styles.label, selected ? activeTextStyle : null]}>{label}</Text>
    </Pressable>
  );
});

function StrongWeakFilter({ value, onChange, style }) {
  const selectStrong = useCallback(() => {
    onChange(value === STRONG ? null : STRONG);
  }, [onChange, value]);

  const selectWeak = useCallback(() => {
    onChange(value === WEAK ? null : WEAK);
  }, [onChange, value]);

  return (
    <View style={[styles.row, style]}>
      <FilterButton
        label={STRONG}
        selected={value === STRONG}
        activeStyle={styles.strongButton}
        activeTextStyle={styles.strongLabel}
        onPress={selectStrong}
      />
      <FilterButton
        label={WEAK}
        selected={value === WEAK}
        activeStyle={styles.weakButton}
        activeTextStyle={styles.weakLabel}
        onPress={selectWeak}
      />
    </View>
  );
}

export default memo(StrongWeakFilter);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointer: { cursor: 'pointer' },
  button: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  strongButton: {
    backgroundColor: '#E5F6EA',
    borderColor: '#16A34A',
  },
  weakButton: {
    backgroundColor: '#FCE8EC',
    borderColor: '#DC2626',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  strongLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: '#16A34A',
  },
  weakLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: '#DC2626',
  },
});
