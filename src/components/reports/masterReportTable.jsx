import { memo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';

import { SymbolLink, SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { openFutureProfile } from '@/utils/stockProfile';
import { useFluidStyles } from '@/utils/responsive';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

export const COL = {
  symbol: 1.55,
  chg5: 0.82,
  addition: 1.18,
  rank: 0.48,
  pcr: 0.62,
};

export const MASTER_REPORT_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 2, bars: ['72%', '84%'] },
  { flex: COL.chg5, align: 'right', lines: 1 },
  { flex: COL.addition, align: 'right', lines: 2 },
  { flex: COL.rank, align: 'right', lines: 1 },
  { flex: COL.pcr, align: 'right', lines: 1 },
];

const ROW_TONE = {
  red: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  green: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  blue: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
};

export function masterReportRowStyle(item) {
  const key = String(item?.color ?? '').trim().toLowerCase();
  return ROW_TONE[key] ?? null;
}

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function parseNumeric(val) {
  if (val == null || val === '' || val === '—') return null;
  const raw = String(val).trim();
  if (!raw) return null;
  const negative = raw.startsWith('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const body = raw.replace(/[₹,\s%()+-]/g, '');
  if (!body || !Number.isFinite(parseFloat(body))) return { invalid: true, raw };
  const [intPart, ...decParts] = body.split('.');
  const dec = decParts.length ? `.${decParts.join('')}` : '';
  const num = parseFloat(body);
  return { negative, num, text: `${groupDigits(intPart)}${dec}` };
}

function formatGrouped(val, { signed = false } = {}) {
  const parsed = parseNumeric(val);
  if (!parsed) return '—';
  if (parsed.invalid) return parsed.raw;
  if (!signed || parsed.num === 0) return parsed.negative ? `-${parsed.text}` : parsed.text;
  return `${parsed.negative ? '-' : '+'}${parsed.text}`;
}

function formatMoney(val) {
  const grouped = formatGrouped(val);
  if (grouped === '—') return '—';
  if (grouped.startsWith('-')) return `-₹${grouped.slice(1)}`;
  return `₹${grouped}`;
}

function formatPct(val) {
  const parsed = parseNumeric(val);
  if (!parsed || parsed.invalid) return '';
  if (parsed.num === 0) return '0%';
  return `${parsed.negative ? '-' : '+'}${parsed.text}%`;
}

function formatPcr(val) {
  if (val == null || val === '' || val === '—') return '—';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const rounded = Math.round(num * 100) / 100;
  return String(rounded);
}

export function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const raw = String(val).trim();
  const negative = raw.includes('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const n = parseFloat(raw.replace(/[₹,\s%()+]/g, ''));
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function signedColor(val) {
  const num = sortNumber(val);
  if (num == null || num === 0) return NEUTRAL;
  return num > 0 ? GREEN : RED;
}

function HeaderSort({ label, flex, align = 'right', lines = 2, sortKey, getValue, sort, onSort, style }) {
  const styles = useFluidStyles(createStyles);
  const active = sort?.key === sortKey;
  const alignStyle = align === 'left' ? styles.hLeft : styles.hRight;
  return (
    <Pressable
      onPress={() => onSort({ key: sortKey, getValue })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.hCell, { flex }, alignStyle, Platform.OS === 'web' ? styles.pointer : null, style]}
    >
      {align === 'right' && active ? <Text style={styles.hArrow}>{sort.dir === 'desc' ? '▾' : '▴'}</Text> : null}
      <Text style={[styles.hLabel, align === 'right' ? styles.hLabelRight : null, active ? styles.hLabelActive : null]} numberOfLines={lines} adjustsFontSizeToFit={lines === 1} minimumFontScale={0.75}>{label}</Text>
      {align !== 'right' && active ? <Text style={styles.hArrow}>{sort.dir === 'desc' ? '▾' : '▴'}</Text> : null}
    </Pressable>
  );
}

export const MasterReportRow = memo(function MasterReportRow({ data, expiry }) {
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();
  if (!data) return null;

  const changeText = formatPct(data.price_change);
  const fiveDayText = formatPct(data.price_chg_5_day) || '—';
  const callText = formatGrouped(data.call_addition, { signed: true });
  const putText = formatGrouped(data.put_addition, { signed: true });

  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <SymbolLink label={`Open ${data.symbol} profile`} onPress={() => openFutureProfile({ symbol: data.symbol, expiry })}>
          <SymbolWithLogo symbol={data.symbol} showLogo={showLogo}>
            <View style={styles.stack}>
              <Text style={styles.symbol} numberOfLines={1}>{data.symbol || '—'}</Text>
              <Text style={styles.price} numberOfLines={1}>
                {formatMoney(data.price)}
                {changeText ? <Text style={{ color: signedColor(data.price_change) }}>{` (${changeText})`}</Text> : null}
              </Text>
            </View>
          </SymbolWithLogo>
        </SymbolLink>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.chg5 }]}>
        <Text style={[styles.value, { color: fiveDayText === '—' ? NEUTRAL : signedColor(data.price_chg_5_day) }]} numberOfLines={1}>{fiveDayText}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, styles.stack, { flex: COL.addition }]}>
        <Text style={[styles.value, { color: callText === '—' ? NEUTRAL : signedColor(data.call_addition) }]} numberOfLines={1}>{callText}</Text>
        <Text style={[styles.subValue, { color: putText === '—' ? NEUTRAL : signedColor(data.put_addition) }]} numberOfLines={1}>{putText}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.rank }]}>
        <Text style={styles.value} numberOfLines={1}>{data.rank != null && data.rank !== '' ? String(data.rank) : '—'}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.pcr }]}>
        <Text style={styles.value} numberOfLines={1}>{formatPcr(data.pcr)}</Text>
      </View>
    </>
  );
});

export function MasterReportHeader({ sort, onSort }) {
  const styles = useFluidStyles(createStyles);
  return (
    <>
      <HeaderSort
        label="SYMBOL"
        flex={COL.symbol}
        align="left"
        sortKey="symbol"
        getValue={(row) => row?.symbol ?? ''}
        sort={sort}
        onSort={onSort}
        style={styles.symbolHeader}
      />
      <HeaderSort
        label={'PR CHG\n5 DAYS'}
        flex={COL.chg5}
        sortKey="price_chg_5_day"
        getValue={(row) => sortNumber(row?.price_chg_5_day)}
        sort={sort}
        onSort={onSort}
      />
      <View style={[styles.addHeader, { flex: COL.addition }]}>
        <HeaderSort
          label="CALL ADDITION"
          flex={0}
          lines={1}
          sortKey="call_addition"
          getValue={(row) => sortNumber(row?.call_addition)}
          sort={sort}
          onSort={onSort}
          style={styles.addHeaderCell}
        />
        <HeaderSort
          label="PUT ADDITION"
          flex={0}
          lines={1}
          sortKey="put_addition"
          getValue={(row) => sortNumber(row?.put_addition)}
          sort={sort}
          onSort={onSort}
          style={styles.addHeaderCell}
        />
      </View>
      <HeaderSort
        label="RANK"
        flex={COL.rank}
        sortKey="rank"
        getValue={(row) => sortNumber(row?.rank)}
        sort={sort}
        onSort={onSort}
      />
      <HeaderSort
        label="PCR"
        flex={COL.pcr}
        sortKey="pcr"
        getValue={(row) => sortNumber(row?.pcr)}
        sort={sort}
        onSort={onSort}
      />
    </>
  );
}

const createStyles = (f) => ({
  pointer: { cursor: 'pointer' },
  cell: { minWidth: 0, justifyContent: 'center', paddingLeft: f(2, 4), paddingRight: f(2, 4) },
  cellEnd: { alignItems: 'flex-end', paddingLeft: f(4, 8), paddingRight: 0 },
  stack: { gap: f(2, 3), minWidth: 0 },
  symbol: { fontSize: f(12, 15), lineHeight: f(16, 20), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  price: { fontSize: f(10, 12.5), lineHeight: f(13, 16), fontFamily: 'Inter_500Medium', color: '#0F172A' },
  value: { fontSize: f(11, 14), lineHeight: f(15, 18), fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'right' },
  subValue: { fontSize: f(11, 14), lineHeight: f(15, 18), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  symbolHeader: { paddingLeft: 0, paddingRight: f(2, 4) },
  hCell: { flexDirection: 'row', alignItems: 'center', gap: f(2, 4), minWidth: 0, paddingRight: f(2, 4) },
  hLeft: { justifyContent: 'flex-start' },
  hRight: { justifyContent: 'flex-end', paddingRight: 0 },
  hLabel: { flexShrink: 1, fontSize: f(9, 11.5), lineHeight: f(12, 15), fontFamily: 'Inter_500Medium', color: '#94A3B8', letterSpacing: 0.2, textTransform: 'uppercase' },
  hLabelRight: { flex: 1, textAlign: 'right' },
  hLabelActive: { color: '#64748B' },
  hArrow: { fontSize: f(8, 11), lineHeight: f(12, 15), color: '#64748B' },
  addHeader: { minWidth: 0, justifyContent: 'flex-end', gap: f(2, 4) },
  addHeaderCell: { alignSelf: 'stretch', flexGrow: 0 },
});
