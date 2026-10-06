import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable, { TableHeaderCell } from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { socketRequest } from '@/utils/socket';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const COL = { symbol: 1.35, tp: 1, wap: 1.05, option: 1.15, future: 1.15 };

const TABLE_COLUMNS = [{ flex: COL.symbol, align: 'left', lines: 2 }, { flex: COL.tp, align: 'right', lines: 1 }, { flex: COL.wap, align: 'right', lines: 1 }, { flex: COL.option, align: 'right', lines: 2 }, { flex: COL.future, align: 'right', lines: 2 }];

const NARROW_PHONE = 360;
const WIDE_PHONE = 440;

function useOptionsType() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const t = Math.min(1, Math.max(0, (width - NARROW_PHONE) / (WIDE_PHONE - NARROW_PHONE)));
    const symbolSize = 10 + t * 2;
    const priceSize = 10 + t;
    const strikeSize = 9 + t * 2;
    const text = { fontFamily: 'Inter_500Medium' };
    return {
      gap: 16 + t * 2,
      // pad: 2 + t,
      symbol: { ...text, fontSize: symbolSize, lineHeight: symbolSize + 3, color: '#0F172A' },
      strike: { ...text, fontSize: strikeSize, lineHeight: strikeSize + 3, color: '#64748B', marginTop: 4 },
      value: { ...text, fontSize: priceSize, lineHeight: priceSize + 3, color: '#1E293B', textAlign: 'right' },
      price: { ...text, fontSize: priceSize, lineHeight: priceSize + 3, color: '#0F172A', textAlign: 'right' },
      change: { ...text, fontSize: priceSize, lineHeight: priceSize + 3, marginTop: 6 + t * 2, textAlign: 'right' },
    };
  }, [width]);
}

const REPORT_TITLES = {
  abv_wap: 'Above 10% from WAP',
  blw_wap: 'Below WAP',
  vol_buster: 'Volume Buster',
  crossing_yes_low: "Crossing 20% From Yesterday's Low",
  breaching_yes_high: "Breaching 20% From Yesterday's High",
  crossing_yes_high: "Crossing Yesterday's High",
  abv_high_3_days: 'Above 3 Days High',
};

const KEY_FALLBACK = {
  abv_wap: 'WAP',
  blw_wap: 'WAP',
  vol_buster: 'Volume Buster',
  crossing_yes_low: "Yesterday's Low",
  breaching_yes_high: "Yesterday's High",
  crossing_yes_high: "Yesterday's High",
  abv_high_3_days: 'High 3day',
};

function levelValue(data) {
  if (data?.value != null && data?.value !== '') return data.value;
  return data?.wap;
}

function paramString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatGrouped(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }
  if (isNaN(parseFloat(str))) return String(val);
  const parts = str.split('.');
  const dec = parts.length > 1 ? `.${parts[1]}` : '';
  return `${sign}${groupDigits(parts[0])}${dec}`;
}

function formatMoney(val) {
  if (val == null || val === '' || val === '—') return '—';
  const grouped = formatGrouped(val);
  return grouped === '—' ? '—' : `₹${grouped}`;
}

function formatStrike(val) {
  if (val == null || val === '' || val === '—') return 'SP : —';
  const n = Number(String(val).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n)) return `SP : ${val}`;
  return `SP : ${n.toLocaleString('en-IN')}`;
}

function formatPriceChange(val) {
  if (val == null || val === '') return '';
  const clean = String(val).trim().replace(/%/g, '').trim();
  const num = Number(clean);
  if (!Number.isFinite(num)) return String(val);
  const body = clean.replace(/^[+-]/, '');
  if (num > 0) return `+${body} %`;
  if (num < 0) return `-${body} %`;
  return `${body} %`;
}

function sortNumber(val) {
  if (val == null || val === '' || val === '—') return null;
  const n = parseFloat(String(val).replace(/[₹,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rowKey(item, index) {
  return `${item?.symbol ?? ''}-${item?.strike_pr ?? ''}-${index}`;
}

function PriceStack({ price, change, type }) {
  const text = formatPriceChange(change);
  const color = text.startsWith('+') ? GREEN : text.startsWith('-') ? RED : NEUTRAL;
  return (
    <>
      <Text style={type.price} numberOfLines={1}>{formatMoney(price)}</Text>
      {text ? <Text style={[type.change, { color }]} numberOfLines={1}>{text}</Text> : null}
    </>
  );
}

const TrendingOptionsRow = memo(function TrendingOptionsRow({ data }) {
  const type = useOptionsType();
  const end = [styles.cell, styles.cellEnd, { paddingLeft: type.pad, marginLeft: type.gap }];
  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <Text style={type.symbol} numberOfLines={1} ellipsizeMode="tail">{data?.symbol || '—'}</Text>
        <Text style={type.strike} numberOfLines={1} ellipsizeMode="tail">{formatStrike(data?.strike_pr)}</Text>
      </View>
      <View style={[end, { flex: COL.tp }]}>
        <Text style={type.value} numberOfLines={1}>{formatMoney(data?.tp)}</Text>
      </View>
      <View style={[end, { flex: COL.wap }]}>
        <Text style={type.value} numberOfLines={1}>{formatMoney(levelValue(data))}</Text>
      </View>
      <View style={[end, { flex: COL.option }]}>
        <PriceStack price={data?.option_price} change={data?.option_price_change} type={type} />
      </View>
      <View style={[end, { flex: COL.future }]}>
        <PriceStack price={data?.future_price} change={data?.future_price_change} type={type} />
      </View>
    </>
  );
});

function TrendingOptionsScreen() {
  const params = useLocalSearchParams();
  const report = paramString(params.report);
  const optionType = paramString(params.option_type) || 'CE';
  const [rows, setRows] = useState([]);
  const [valueKey, setValueKey] = useState('');
  const [loading, setLoading] = useState(true);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const title = REPORT_TITLES[report] || 'Trending Options';
  const levelLabel = valueKey || KEY_FALLBACK[report] || 'WAP';
  const type = useOptionsType();
  const colGap = useMemo(() => ({ marginLeft: type.gap, minWidth: 0 }), [type.gap]);

  useEffect(() => {
    if (!report) {
      setRows([]);
      setValueKey('');
      setLoading(false);
      return undefined;
    }
    const gen = ++genRef.current;
    setRows([]);
    setValueKey('');
    setLoading(true);
    const task = queueRef.current.then(() => {
      if (gen !== genRef.current) return null;
      return socketRequest('GET_TRENDING_OPTIONS', { report, option: optionType, option_type: optionType })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const list = Array.isArray(res?.data) ? res.data : [];
          setRows(list);
          setValueKey(list.find((item) => item?.key)?.key || '');
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[TrendingOptions] Socket fetch error:', err?.message);
          setRows([]);
          setValueKey('');
          setLoading(false);
          return null;
        });
    });
    queueRef.current = task.then(() => {}, () => {});
    return () => {
      genRef.current += 1;
    };
  }, [report, optionType]);

  const HeaderComponent = useCallback(({ sort, onSort }) => (
    <>
      <TableHeaderCell label="Symbol" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} style={styles.shrink} />
      <TableHeaderCell label="TP" flex={COL.tp} align="right" sortKey="tp" getValue={(row) => sortNumber(row?.tp)} sort={sort} onSort={onSort} style={colGap} />
      <TableHeaderCell label={levelLabel} flex={COL.wap} align="right" sortKey="value" getValue={(row) => sortNumber(levelValue(row))} sort={sort} onSort={onSort} style={colGap} />
      <TableHeaderCell label="Option" flex={COL.option} align="right" sortKey="option_price" getValue={(row) => sortNumber(row?.option_price)} sort={sort} onSort={onSort} style={colGap} />
      <TableHeaderCell label="Future" flex={COL.future} align="right" sortKey="future_price" getValue={(row) => sortNumber(row?.future_price)} sort={sort} onSort={onSort} style={colGap} />
    </>
  ), [colGap, levelLabel]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label={title} />
      <View style={styles.table}>
        <CommonTable data={rows} columns={TABLE_COLUMNS} loading={loading} HeaderComponent={HeaderComponent} RowComponent={TrendingOptionsRow} keyExtractor={rowKey} emptyText="No options to show" />
      </View>
    </SafeAreaView>
  );
}

export default memo(TrendingOptionsScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  table: { flex: 1, minHeight: 0 },
  cell: { justifyContent: 'center', minWidth: 0, overflow: 'hidden' },
  cellEnd: { alignItems: 'flex-end', paddingRight: 0 },
  shrink: { minWidth: 0 },
});
