import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable, { TableHeaderCell } from '@/components/CommonTable';
import ScreenHeader from '@/components/ScreenHeader';
import { SymbolWithLogo, useShowReportSymbolLogo } from '@/components/SymbolLogo';
import { useFluidStyles } from '@/utils/responsive';
import { socketRequest } from '@/utils/socket';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const COL = { symbol: 1.45, tp: 0.9, wap: 1.15, option: 1.15, future: 1.15 };

const TABLE_COLUMNS = [
  { flex: COL.symbol, align: 'left', lines: 2 },
  { flex: COL.tp, align: 'right', lines: 1 },
  { flex: COL.wap, align: 'right', lines: 1 },
  { flex: COL.option, align: 'right', lines: 2 },
  { flex: COL.future, align: 'right', lines: 2 },
];

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
    sign = '';
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

function PriceStack({ price, change, styles }) {
  const text = formatPriceChange(change);
  const color = text.startsWith('+') ? GREEN : text.startsWith('-') ? RED : NEUTRAL;
  return (
    <>
      <Text style={styles.price} numberOfLines={1}>{formatMoney(price)}</Text>
      {text ? <Text style={[styles.change, { color }]} numberOfLines={1}>{text}</Text> : null}
    </>
  );
}

const TrendingOptionsRow = memo(function TrendingOptionsRow({ data }) {
  const styles = useFluidStyles(createStyles);
  const showLogo = useShowReportSymbolLogo();

  return (
    <>
      <View style={[styles.cell, styles.cellSymbol, { flex: COL.symbol }]}>
        <SymbolWithLogo symbol={data?.symbol} showLogo={showLogo}>
          <Text style={styles.symbol} numberOfLines={1} ellipsizeMode="tail">{data?.symbol || '—'}</Text>
          <Text style={styles.strike} numberOfLines={1} ellipsizeMode="tail">{formatStrike(data?.strike_pr)}</Text>
        </SymbolWithLogo>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.tp }]}>
        <Text style={styles.value} numberOfLines={1}>{formatMoney(data?.tp)}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.wap }]}>
        <Text style={styles.value} numberOfLines={1}>{formatMoney(levelValue(data))}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.option }]}>
        <PriceStack price={data?.option_price} change={data?.option_price_change} styles={styles} />
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.future }]}>
        <PriceStack price={data?.future_price} change={data?.future_price_change} styles={styles} />
      </View>
    </>
  );
});

function TrendingOptionsScreen() {
  const styles = useFluidStyles(createStyles);
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
      <TableHeaderCell
        label="Symbol"
        flex={COL.symbol}
        align="left"
        sortKey="symbol"
        getValue={(row) => row?.symbol ?? ''}
        sort={sort}
        onSort={onSort}
        style={styles.cellSymbol}
      />
      <TableHeaderCell
        label="TP"
        flex={COL.tp}
        align="right"
        sortKey="tp"
        getValue={(row) => sortNumber(row?.tp)}
        sort={sort}
        onSort={onSort}
        style={styles.headerCell}
      />
      <TableHeaderCell
        label={levelLabel}
        flex={COL.wap}
        align="right"
        sortKey="value"
        getValue={(row) => sortNumber(levelValue(row))}
        sort={sort}
        onSort={onSort}
        style={styles.headerCell}
      />
      <TableHeaderCell
        label="Option"
        flex={COL.option}
        align="right"
        sortKey="option_price"
        getValue={(row) => sortNumber(row?.option_price)}
        sort={sort}
        onSort={onSort}
        style={styles.headerCell}
      />
      <TableHeaderCell
        label="Future"
        flex={COL.future}
        align="right"
        sortKey="future_price"
        getValue={(row) => sortNumber(row?.future_price)}
        sort={sort}
        onSort={onSort}
        style={styles.headerCell}
      />
    </>
  ), [levelLabel, styles]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label={title} />
      <View style={styles.table}>
        <CommonTable
          data={rows}
          columns={TABLE_COLUMNS}
          loading={loading}
          HeaderComponent={HeaderComponent}
          RowComponent={TrendingOptionsRow}
          keyExtractor={rowKey}
          emptyText="No options to show"
          rowStyle={styles.tableRowStyle}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(TrendingOptionsScreen);

const createStyles = (f) => ({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  table: { flex: 1, minHeight: 0 },
  tableRowStyle: { minHeight: f(52, 64), paddingVertical: f(6, 10) },

  cell: { justifyContent: 'center', minWidth: 0 },
  cellSymbol: { minWidth: 0, paddingLeft: 0, paddingRight: f(4, 8) },
  cellEnd: { alignItems: 'flex-end', minWidth: 0, paddingLeft: f(4, 8), paddingRight: 0 },
  headerCell: { minWidth: 0, paddingLeft: f(4, 8), paddingRight: 0 },

  symbol: { fontSize: f(11.5, 13.5), lineHeight: f(15, 17), fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  strike: { fontSize: f(10, 11.5), lineHeight: f(13, 15), fontFamily: 'Inter_400Regular', color: '#64748B', marginTop: 3 },
  value: { fontSize: f(11.5, 13.5), lineHeight: f(15, 17), fontFamily: 'Inter_500Medium', color: '#1E293B', textAlign: 'right' },
  price: { fontSize: f(11.5, 13.5), lineHeight: f(15, 17), fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  change: { fontSize: f(10, 11.5), lineHeight: f(13, 15), fontFamily: 'Inter_500Medium', marginTop: 3, textAlign: 'right' },
});
