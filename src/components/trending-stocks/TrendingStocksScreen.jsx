import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonTable, { TableHeaderCell } from '@/components/CommonTable';
import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import { socketRequest } from '@/utils/socket';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const COL = { symbol: 1.32, value: 1.18, cmp: 0.86 };

const REPORT_TITLES = {
  abv_wap: 'Above WAP',
  blw_wap: 'Below WAP',
  abv_intraday_high: 'Above Intraday High',
  blw_intraday_low: 'Below Intraday Low',
  abv_yesterday_high: "Above Yesterday's High",
  blw_yesterday_low: "Below Yesterday's Low",
  abv_prev_week_high: "Above Previous Week's High",
  blw_prev_week_low: "Below Previous Week's Low",
  abv_prev_month_high: "Above Previous Month's High",
  blw_prev_month_low: "Below Previous Month's Low",
  top_gainers: 'Top Gainers',
  top_losers: 'Top Losers',
  cr_2_day_low: 'Crossing 2 Day Low',
  br_2_day_high: 'Breaking 2 Day High',
  algo_positive_trends: 'Positive Algo Trends',
  algo_negative_trends: 'Negative Algo Trends',
};

const KEY_FALLBACK = {
  abv_wap: 'Wap',
  blw_wap: 'Wap',
  abv_intraday_high: 'Intraday High',
  blw_intraday_low: 'Intraday Low',
  abv_yesterday_high: 'Yesterday High',
  blw_yesterday_low: "Yesterday's Low",
  abv_prev_week_high: 'Prev Week High',
  blw_prev_week_low: 'Prev Week Low',
  abv_prev_month_high: 'Prev Month High',
  blw_prev_month_low: 'Prev Month Low',
  top_gainers: 'Wap',
  top_losers: 'Wap',
  cr_2_day_low: 'Day Low',
  br_2_day_high: 'Day High',
  algo_positive_trends: 'Future Tp',
  algo_negative_trends: 'Future Tp',
};

function paramString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function normalizeStocks(payload) {
  if (!payload || typeof payload !== 'object') return { key: '', data: [] };
  let key = payload.key || payload.header || '';
  let list = [];
  if (Array.isArray(payload.data)) list = payload.data;
  else if (Array.isArray(payload.result)) list = payload.result;
  else if (Array.isArray(payload.stocks)) list = payload.stocks;
  else if (Array.isArray(payload.list)) list = payload.list;
  if (!key && list.length > 0 && list[0]?.key) key = list[0].key;
  const data = list.map((item) => ({
    symbol: item.symbol || item.name || item.stock_name || '—',
    price: item.price ?? item.cmp ?? item.close ?? '—',
    price_change: item.price_change ?? item.change_percent ?? item.percent_change ?? item.pChange ?? item.change ?? '',
    key: item.key || key || '',
    value: item.value ?? item.level ?? item.val ?? '—',
  }));
  return { key, data };
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

const TrendingStocksRow = memo(function TrendingStocksRow({ data }) {
  const change = formatPriceChange(data?.price_change);
  const color = change.startsWith('+') ? GREEN : change.startsWith('-') ? RED : NEUTRAL;
  return (
    <>
      <View style={[styles.cell, { flex: COL.symbol }]}>
        <Text style={styles.symbol} numberOfLines={1}>{data?.symbol || '—'}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, { flex: COL.value }]}>
        <Text style={styles.value} numberOfLines={1}>{data?.value == null || data?.value === '' || data?.value === '—' ? '—' : `₹${formatGrouped(data.value)}`}</Text>
      </View>
      <View style={[styles.cell, styles.cellEnd, styles.cmpCell, { flex: COL.cmp }]}>
        <Text style={styles.price} numberOfLines={1}>{data?.price == null || data?.price === '' || data?.price === '—' ? '—' : `₹${formatGrouped(data.price)}`}</Text>
        {change ? <Text style={[styles.change, { color }]} numberOfLines={1}>{change}</Text> : null}
      </View>
    </>
  );
});

function TrendingStocksScreen() {
  const params = useLocalSearchParams();
  const report = paramString(params.report);
  const [rows, setRows] = useState([]);
  const [valueKey, setValueKey] = useState('');
  const [loading, setLoading] = useState(true);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);
  const middleLabel = valueKey || KEY_FALLBACK[report] || 'Value';
  const title = REPORT_TITLES[report] || 'Trending Stocks';

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
      return socketRequest('GET_MARKET_INSIGHTS', { report })
        .then((res) => {
          if (gen !== genRef.current) return null;
          const normalized = normalizeStocks(res);
          setRows(normalized.data);
          setValueKey(normalized.key);
          setLoading(false);
          return res;
        })
        .catch((err) => {
          if (gen !== genRef.current) return null;
          console.log('[TrendingStocks] Socket fetch error:', err?.message);
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
  }, [report]);

  const HeaderComponent = useCallback(({ sort, onSort }) => (
    <>
      <TableHeaderCell label="Symbol" flex={COL.symbol} align="left" sortKey="symbol" getValue={(row) => row?.symbol ?? ''} sort={sort} onSort={onSort} />
      <TableHeaderCell label={middleLabel} flex={COL.value} align="right" sortKey="value" getValue={(row) => sortNumber(row?.value)} sort={sort} onSort={onSort} />
      <TableHeaderCell label="CMP" flex={COL.cmp} align="right" sortKey="price" getValue={(row) => sortNumber(row?.price)} sort={sort} onSort={onSort} style={styles.cmpCell} />
    </>
  ), [middleLabel]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <View style={styles.backIcon}><ChevronRightIcon size={22} color="#0F172A" /></View>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
      {loading ? (
        <View style={styles.loader}><RMLoader /></View>
      ) : (
        <View style={styles.table}>
          <CommonTable data={rows} HeaderComponent={HeaderComponent} RowComponent={TrendingStocksRow} emptyText="No stocks to show" />
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(TrendingStocksScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, paddingTop: 16, paddingBottom: 14 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  table: { flex: 1, minHeight: 0 },
  cell: { justifyContent: 'center', paddingRight: 4 },
  cellEnd: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 4 },
  cmpCell: { marginLeft: 12 },
  symbol: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  value: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#1E293B', textAlign: 'right' },
  price: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', color: '#0F172A', textAlign: 'right' },
  change: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_500Medium', marginTop: 6, textAlign: 'right' },
});
