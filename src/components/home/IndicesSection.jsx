import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, Image, Pressable, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { socketRequest } from '@/utils/socket';
import { cdnApi } from '@/utils/api';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import LineGraph from '@/components/LineGraph';
import { useFluidStyles } from '@/utils/responsive';

const PERIODS = [
  { key: '1D', label: '1 Day', series: 'graphData' },
  { key: '5D', label: '5 Day', series: 'graphData5Days' },
  { key: '30D', label: '30 Day', series: 'graphData30Days' },
];

const GRAPH_EVENT = {
  NIFTY: 'GET_NIFTY_GRAPH',
  BANKNIFTY: 'GET_BANKNIFTY_GRAPH',
};

function formatIndian(val, { withSign = false } = {}) {
  if (val == null || val === '') return '';
  let str = String(val).trim();
  const hasParens = str.startsWith('(') && str.endsWith(')');
  if (hasParens) str = str.slice(1, -1).trim();
  str = str.replace(/[₹,]/g, '').trim();
  if (!str) return '';

  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    sign = '+';
    str = str.slice(1).trim();
  } else if (withSign) {
    sign = '+';
  }

  const parts = str.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : null;

  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = `${grouped},${lastThree}`;
  }

  const res = decPart !== null ? `${intPart}.${decPart}` : intPart;
  const signed = sign ? `${sign}${res}` : res;
  return hasParens ? `(${signed})` : signed;
}

function formatPrice(val) {
  if (val == null || val === '') return '—';
  let str = String(val).trim().replace(/[₹,]/g, '');
  if (!str) return '—';
  let sign = '';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    sign = '';
    str = str.slice(1).trim();
  }
  const formatted = formatIndian(str);
  if (!formatted) return '—';
  return `${sign}₹${formatted}`;
}

function formatPct(val) {
  if (val == null || val === '') return '';
  let str = String(val).trim().replace(/[()%₹]/g, '');
  if (!str) return '';
  let sign = '+';
  if (str.startsWith('-')) {
    sign = '-';
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    sign = '+';
    str = str.slice(1).trim();
  } else {
    const num = parseFloat(str);
    if (!isNaN(num) && num === 0) sign = '';
  }
  return sign ? `(${sign}${str}%)` : `(${str}%)`;
}

function formatPriceChange(val, pct) {
  let v = '';
  if (val != null && val !== '') {
    let str = String(val).trim().replace(/[₹,]/g, '');
    let sign = '+';
    if (str.startsWith('-')) {
      sign = '-';
      str = str.slice(1).trim();
    } else if (str.startsWith('+')) {
      sign = '+';
      str = str.slice(1).trim();
    } else {
      const num = parseFloat(str);
      if (!isNaN(num) && num === 0) sign = '';
    }
    const formatted = formatIndian(str);
    if (formatted) v = `${sign}₹${formatted}`;
  }
  const p = pct != null && pct !== '' ? formatPct(pct) : '';
  return [v, p].filter(Boolean).join(' ');
}

function formatOiChg(val) {
  if (val == null || val === '') return '';
  const formatted = formatIndian(val, { withSign: true });
  return formatted.startsWith('(') ? formatted : `(${formatted})`;
}

function parseNum(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function getIndicatorColor(pct) {
  const t = Math.min(1, Math.max(0, (pct ?? 50) / 100));
  let r, g, b;
  if (t <= 0.5) {
    const f = t / 0.5;
    r = Math.round(239 + (226 - 239) * f);
    g = Math.round(68 + (232 - 68) * f);
    b = Math.round(68 + (240 - 68) * f);
  } else {
    const f = (t - 0.5) / 0.5;
    r = Math.round(226 + (34 - 226) * f);
    g = Math.round(232 + (197 - 232) * f);
    b = Math.round(240 + (94 - 240) * f);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeGraphData(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const list = [];
  for (let i = 0; i < series.length; i++) {
    const pt = series[i];
    if (pt) {
      list.push({
        ...pt,
        price: pt.price != null ? pt.price : pt.close != null ? pt.close : '',
        price_change: pt.price_change ?? pt.change ?? '',
        price_change_value: pt.price_change_value ?? '',
        cdate: pt.cdate ?? '',
        time: pt.time ?? '',
      });
    }
  }
  return list;
}

function graphPayload(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.graphData || value.graphData5Days || value.graphData30Days) return value;
  return value.result && typeof value.result === 'object' ? value.result : null;
}

import { useBreakpoint } from '@/hooks/useBreakpoint';

function IndexLogo({ symbol }) {
  const [failed, setFailed] = useState(false);
  const styles = useFluidStyles(createStyles);
  if (failed) return null;
  return (
    <Image
      source={{ uri: cdnApi(symbol) }}
      style={styles.indexLogo}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={`${symbol} logo`}
    />
  );
}

function IndexIdentity({ symbol, expiryDate, price, changeStr, priceDown, desktop, noTabs }) {
  const styles = useFluidStyles(createStyles);
  return (
    <View style={[
      styles.identityRow,
      desktop ? styles.desktopTitleRow : styles.titleRow,
      desktop && noTabs ? styles.desktopTitleRowNoTabs : null,
    ]}>
      <IndexLogo key={symbol} symbol={symbol} />
      <View style={styles.identityText}>
        <Text style={[styles.symbolTitle, desktop ? styles.desktopSymbolTitle : null]}>
          {symbol === 'NIFTY' ? 'NIFTY FUTURES' : 'BANKNIFTY FUTURES'}
          {expiryDate ? <Text style={[styles.expiryText, desktop ? styles.desktopExpiryText : null]}>   {expiryDate}</Text> : null}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.priceText, desktop ? styles.desktopPriceText : null]}>{price}</Text>
          {changeStr ? (
            <Text style={[styles.changeText, desktop ? styles.desktopChangeText : null, { color: priceDown ? '#DC2626' : '#16A34A' }]}>
              {changeStr}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function IndicesSection({ symbol: fixedSymbol, stackStats = false } = {}) {
  const { isDesktop } = useBreakpoint();
  const styles = useFluidStyles(createStyles);
  const [data, setData] = useState(null);
  const [internalSelected, setInternalSelected] = useState(fixedSymbol || 'NIFTY');
  const selected = fixedSymbol || internalSelected;
  const setSelected = setInternalSelected;
  const [period, setPeriod] = useState('1D');
  const [graphs, setGraphs] = useState({ NIFTY: null, BANKNIFTY: null });

  const fetchIndices = useCallback(() => socketRequest('GET_INDICES_TODAY'), []);
  const fetchGraph = useCallback(
    () => socketRequest(GRAPH_EVENT[selected] || GRAPH_EVENT.NIFTY),
    [selected],
  );

  useSocketEvent('REC_INDICES_TODAY', (res) => {
    if (res) setData(res);
  });
  useSocketEvent('REC_NIFTY_GRAPH', (res) => {
    if (res) setGraphs((prev) => ({ ...prev, NIFTY: res }));
  });
  useSocketEvent('REC_BANKNIFTY_GRAPH', (res) => {
    if (res) setGraphs((prev) => ({ ...prev, BANKNIFTY: res }));
  });

  useEffect(() => {
    fetchIndices().catch(() => {});
  }, [fetchIndices]);

  useEffect(() => {
    fetchGraph().catch(() => {});
  }, [fetchGraph]);

  useRegisterRefresh(fetchIndices);
  useRegisterRefresh(fetchGraph);

  const currentGraph = graphs[selected];

  const chartData = useMemo(() => {
    const raw = graphPayload(currentGraph);
    if (!raw) return [];
    const seriesKey = PERIODS.find((p) => p.key === period)?.series;
    return normalizeGraphData(seriesKey ? raw[seriesKey] : null);
  }, [currentGraph, period]);

  const cdate = data?.cdate || '';
  const expiryDate = data?.expiry_date || '';
  const item = data?.[selected] || {};

  const price = formatPrice(item.price);
  const changeStr = formatPriceChange(item.price_change_value, item.price_change);
  const priceDown = String(item.price_change_value || item.price_change || '').includes('-');

  let lowVal = '';
  let highVal = '';
  if (period === '1D') {
    lowVal = item.low;
    highVal = item.high;
  } else if (period === '5D') {
    lowVal = item.week_low;
    highVal = item.week_high;
  } else {
    lowVal = item.month_low;
    highVal = item.month_high;
  }

  const curPriceNum = parseNum(item.price);
  const lowNum = parseNum(lowVal);
  const highNum = parseNum(highVal);

  let indicatorPct = 50;
  if (highNum > lowNum && curPriceNum > 0) {
    const ratio = (curPriceNum - lowNum) / (highNum - lowNum);
    indicatorPct = Math.min(96, Math.max(4, ratio * 100));
  }

  const callStrong = String(item.call_strength || '').toLowerCase().includes('strong');
  const putStrong = String(item.put_strength || '').toLowerCase().includes('strong');

  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      {isDesktop ? (
        /* Desktop Header: 2 Columns (Left: Status -> Tabs -> Title -> Price; Right: Metrics Table) */
        <View style={[styles.desktopHeaderRow, stackStats && styles.desktopHeaderRowStacked]}>
          <View style={[styles.desktopHeaderLeftCol, stackStats && styles.desktopHeaderLeftColStacked]}>
            <View style={styles.desktopStatusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Market Open</Text>
              {cdate ? <Text style={styles.desktopCdateText}>  ·  {cdate}</Text> : null}
            </View>

            {!fixedSymbol && (
              <View style={styles.desktopTabsContainer}>
                <Pressable
                  onPress={() => setSelected('NIFTY')}
                  style={[styles.desktopTabBtn, selected === 'NIFTY' ? styles.tabBtnActive : null, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === 'NIFTY' }}
                  accessibilityLabel="NIFTY"
                >
                  <Text style={[styles.desktopTabText, selected === 'NIFTY' ? styles.tabTextActive : null]}>NIFTY</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelected('BANKNIFTY')}
                  style={[styles.desktopTabBtn, selected === 'BANKNIFTY' ? styles.tabBtnActive : null, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === 'BANKNIFTY' }}
                  accessibilityLabel="BANKNIFTY"
                >
                  <Text style={[styles.desktopTabText, selected === 'BANKNIFTY' ? styles.tabTextActive : null]}>BANKNIFTY</Text>
                </Pressable>
              </View>
            )}

            <IndexIdentity
              symbol={selected}
              expiryDate={expiryDate}
              price={price}
              changeStr={changeStr}
              priceDown={priceDown}
              desktop
              noTabs={!!fixedSymbol}
            />
          </View>

          <View style={[styles.desktopMetricsTable, stackStats && styles.desktopMetricsTableStacked]}>
            <View style={styles.desktopMetricRow}>
              <Text style={styles.tableLabel}>OI</Text>
              <View style={styles.oiValueRow}>
                <Text style={styles.tableValue}>{item.oi ? formatIndian(item.oi) : '—'}</Text>
                {item.chg_in_oi ? (
                  <Text style={[styles.oiChg, { color: String(item.chg_in_oi).includes('-') ? '#DC2626' : '#16A34A' }]}>
                    {formatOiChg(item.chg_in_oi)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.desktopMetricRow}>
              <Text style={styles.tableLabel}>WAP</Text>
              <Text style={styles.tableValue}>{formatPrice(item.daily_wap)}</Text>
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.desktopMetricRow}>
              <Text style={styles.tableLabel}>Call Strength</Text>
              {item.call_strength ? (
                <View style={[styles.badge, callStrong ? styles.badgeStrong : styles.badgeWeak]}>
                  <Text style={[styles.badgeText, callStrong ? styles.badgeTextStrong : styles.badgeTextWeak]}>
                    {callStrong ? 'Strong' : 'Weak'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tableValue}>—</Text>
              )}
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.desktopMetricRow}>
              <Text style={styles.tableLabel}>Put Strength</Text>
              {item.put_strength ? (
                <View style={[styles.badge, putStrong ? styles.badgeStrong : styles.badgeWeak]}>
                  <Text style={[styles.badgeText, putStrong ? styles.badgeTextStrong : styles.badgeTextWeak]}>
                    {putStrong ? 'Strong' : 'Weak'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tableValue}>—</Text>
              )}
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Top Selector & Market Status (Mobile) */}
          <View style={styles.topRow}>
            <View style={styles.statusCol}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Market Open</Text>
              </View>
              {cdate ? <Text style={styles.cdateText}>{cdate}</Text> : null}
            </View>

            {!fixedSymbol && (
              <View style={styles.tabsContainer}>
                <Pressable
                  onPress={() => setSelected('NIFTY')}
                  style={[styles.tabBtn, selected === 'NIFTY' ? styles.tabBtnActive : null, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === 'NIFTY' }}
                  accessibilityLabel="NIFTY"
                >
                  <Text style={[styles.tabText, selected === 'NIFTY' ? styles.tabTextActive : null]}>NIFTY</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelected('BANKNIFTY')}
                  style={[styles.tabBtn, selected === 'BANKNIFTY' ? styles.tabBtnActive : null, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === 'BANKNIFTY' }}
                  accessibilityLabel="BANKNIFTY"
                >
                  <Text style={[styles.tabText, selected === 'BANKNIFTY' ? styles.tabTextActive : null]}>BANKNIFTY</Text>
                </Pressable>
              </View>
            )}
          </View>

          <IndexIdentity
            symbol={selected}
            expiryDate={expiryDate}
            price={price}
            changeStr={changeStr}
            priceDown={priceDown}
          />

          {/* Metrics Table Card (Mobile) */}
          <View style={styles.tableCard}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>OI</Text>
              <View style={styles.oiValueRow}>
                <Text style={styles.tableValue}>{item.oi ? formatIndian(item.oi) : '—'}</Text>
                {item.chg_in_oi ? (
                  <Text style={[styles.oiChg, { color: String(item.chg_in_oi).includes('-') ? '#DC2626' : '#16A34A' }]}>
                    {formatOiChg(item.chg_in_oi)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>WAP</Text>
              <Text style={styles.tableValue}>{formatPrice(item.daily_wap)}</Text>
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Call Strength</Text>
              {item.call_strength ? (
                <View style={[styles.badge, callStrong ? styles.badgeStrong : styles.badgeWeak]}>
                  <Text style={[styles.badgeText, callStrong ? styles.badgeTextStrong : styles.badgeTextWeak]}>
                    {callStrong ? 'Strong' : 'Weak'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tableValue}>—</Text>
              )}
            </View>

            <View style={styles.tableDivider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Put Strength</Text>
              {item.put_strength ? (
                <View style={[styles.badge, putStrong ? styles.badgeStrong : styles.badgeWeak]}>
                  <Text style={[styles.badgeText, putStrong ? styles.badgeTextStrong : styles.badgeTextWeak]}>
                    {putStrong ? 'Strong' : 'Weak'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tableValue}>—</Text>
              )}
            </View>
          </View>
        </>
      )}

      {/* Graph Area */}
      <View style={[styles.graphContainer, isDesktop && styles.desktopGraphContainer]}>
        <LineGraph data={chartData} height={isDesktop ? 190 : 190} />
      </View>

      {/* High / Low Range Bar */}
      <View style={[styles.rangeRow, isDesktop && styles.desktopRangeRow]}>
        <View style={styles.rangeColLeft}>
          <Text style={styles.rangeLabel}>Low</Text>
          <Text style={styles.rangeVal} numberOfLines={1}>{formatPrice(lowVal)}</Text>
        </View>

        <View style={styles.barWrapper}>
          <LinearGradient
            colors={['#EF4444', '#E2E8F0', '#22C55E']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientBar}
          />
          <View style={[styles.thumb, { left: `${indicatorPct}%`, backgroundColor: getIndicatorColor(indicatorPct) }]} />
        </View>

        <View style={styles.rangeColRight}>
          <Text style={[styles.rangeLabel, { textAlign: 'right' }]}>High</Text>
          <Text style={[styles.rangeVal, { textAlign: 'right' }]} numberOfLines={1}>{formatPrice(highVal)}</Text>
        </View>
      </View>

      {/* Period Buttons (1 Day, 5 Day, 30 Day) */}
      <View style={isDesktop ? styles.desktopBottomRow : styles.periodsRow}>
        <View style={isDesktop ? styles.desktopPeriodsGroup : styles.periodsMobileGroup}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={[
                  styles.periodBtn,
                  isDesktop && styles.desktopPeriodBtn,
                  active ? styles.periodBtnActive : styles.periodBtnInactive,
                  Platform.OS === 'web' ? { cursor: 'pointer' } : null,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={p.label}
              >
                <Text style={[styles.periodText, active ? styles.periodTextActive : styles.periodTextInactive]} numberOfLines={1}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default memo(IndicesSection);

const createStyles = (f) => ({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#0071A9',
  },
  tabText: {
    fontSize: f(12),
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  statusCol: {
    alignItems: 'flex-start',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  statusText: {
    fontSize: f(11, 13),
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  cdateText: {
    fontSize: f(10),
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginTop: 1,
  },
  titleRow: {
    marginTop: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  indexLogo: {
    width: 36,
    height: 36,
  },
  symbolTitle: {
    flexShrink: 1,
    fontSize: f(18),
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  desktopSymbolTitle: {
    fontSize: f(15, 18),
  },
  expiryText: {
    fontSize: f(13),
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  desktopExpiryText: {
    fontSize: f(11, 13),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 10,
    flexWrap: 'wrap',
  },
  priceText: {
    fontSize: f(24),
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  changeText: {
    fontSize: f(14),
    fontFamily: 'Inter_600SemiBold',
  },
  desktopChangeText: {
    fontSize: f(12, 14.5),
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginTop: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  tableDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
  },
  tableLabel: {
    fontSize: f(12, 13.5),
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  tableValue: {
    fontSize: f(12, 13.5),
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  oiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oiChg: {
    fontSize: f(11, 12.5),
    fontFamily: 'Inter_500Medium',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeStrong: {
    backgroundColor: '#DCFCE7',
  },
  badgeWeak: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: f(11, 13),
    fontFamily: 'Inter_600SemiBold',
  },
  badgeTextStrong: {
    color: '#16A34A',
  },
  badgeTextWeak: {
    color: '#EF4444',
  },
  graphContainer: {
    height: 190,
    marginTop: 12,
    marginBottom: 4,
    justifyContent: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeColLeft: {
    alignItems: 'flex-start',
    minWidth: 64,
  },
  rangeColRight: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  rangeLabel: {
    fontSize: f(11, 13),
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  rangeVal: {
    fontSize: f(12, 13.5),
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginTop: 1,
  },
  barWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    marginHorizontal: 8,
    position: 'relative',
  },
  gradientBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  periodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  periodBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#0071A9',
  },
  periodBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodText: {
    fontSize: f(12, 13.5),
  },
  periodTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  periodTextInactive: {
    fontFamily: 'Inter_500Medium',
    color: '#0F172A',
  },
  desktopContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  desktopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 6,
  },
  desktopHeaderLeftCol: {
    flexGrow: 1.15,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 160,
    justifyContent: 'center',
  },
  desktopHeaderRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  desktopHeaderLeftColStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    minWidth: 0,
  },
  desktopStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  desktopCdateText: {
    fontSize: f(11, 13),
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  desktopTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    alignSelf: 'flex-start',
    marginVertical: 6,
    gap: 3,
  },
  desktopTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  desktopTabText: {
    fontSize: f(12.5, 14),
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  desktopTitleRow: {
    marginTop: 2,
  },
  desktopTitleRowNoTabs: {
    marginTop: 6,
    marginBottom: 2,
  },
  desktopPriceText: {
    fontSize: f(20, 26),
  },
  desktopMetricsTable: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 180,
    maxWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  desktopMetricsTableStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  desktopMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  desktopGraphContainer: {
    height: 190,
    marginTop: 12,
    marginBottom: 8,
  },
  desktopRangeRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  desktopBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 2,
  },
  desktopPeriodsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  periodsMobileGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  desktopPeriodBtn: {
    flex: 0,
    minWidth: 80,
    paddingHorizontal: 14,
    height: 32,
  },
});
