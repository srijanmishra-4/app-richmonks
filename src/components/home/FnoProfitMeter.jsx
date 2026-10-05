import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { socketRequest } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useFnoStats } from '@/context/FnoStatsContext';
import { TradeUpIcon, TradeDownIcon, ArrowUpIcon, ArrowDownIcon, ChartColumnIcon } from '@/components/icons/HomeIcons';

// ─── Formatting ────────────────────────────────────────────────────────────────

function formatIndianCurrency(val) {
  if (val == null || val === '') return '₹0';
  let num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '₹0';
  const negative = num < 0;
  const abs = Math.abs(num);
  let str = String(Math.round(abs));
  if (str.length > 3) {
    const last3 = str.slice(-3);
    const rest = str.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    str = `${rest},${last3}`;
  }
  if (negative) return `- ₹${str}`;
  return `+ ₹${str}`;
}

function formatPctSigned(val) {
  if (val == null || val === '') return '';
  const num = parseFloat(String(val));
  if (isNaN(num)) return '';
  if (num === 0) return '0%';
  if (num > 0) return `+${num}%`;
  return `${num}%`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

function FnoProfitMeter() {
  const [ppl, setPpl] = useState(null);
  const [advDec, setAdvDec] = useState(null);
  const fnoStats = useFnoStats();

  const fetchPpl = useCallback(() => socketRequest('GET_ONE_DAY_PPL'), []);
  const fetchAdvDec = useCallback(() => socketRequest('GET_ADV_DEC_UNCHANGED'), []);

  // Listen for streaming updates
  useSocketEvent('REC_ONE_DAY_PPL', (res) => {
    if (res) setPpl(res);
  });
  useSocketEvent('REC_ADV_DEC_UNCHANGED', (res) => {
    if (res) setAdvDec(res);
  });

  // Initial fetch on mount
  useEffect(() => { fetchPpl().catch(() => {}); }, [fetchPpl]);
  useEffect(() => { fetchAdvDec().catch(() => {}); }, [fetchAdvDec]);

  // Register for REC_DATA_UPDATED refresh
  useRegisterRefresh(fetchPpl);
  useRegisterRefresh(fetchAdvDec);

  // Derived values
  const pl1day = ppl?.pl1day ?? 0;
  const pl1daypercent = parseFloat(ppl?.pl1daypercent ?? '0') || 0;
  const isPositive = pl1daypercent > 0;
  const isNegative = pl1daypercent < 0;
  const plColor = isPositive ? GREEN : isNegative ? RED : NEUTRAL;
  const cdate = ppl?.cdate;

  const advance = advDec?.advance ?? '—';
  const declined = advDec?.declined ?? '—';

  let abvWap = '—';
  let abvWapNum = null;
  if (Array.isArray(fnoStats)) {
    const entry = fnoStats.find((e) => e.abv_wap !== undefined);
    if (entry) {
      abvWap = entry.abv_wap;
      abvWapNum = typeof abvWap === 'number' ? abvWap : parseFloat(abvWap);
    }
  }
  const abvWapColor = abvWapNum == null ? NEUTRAL : abvWapNum >= 50 ? GREEN : RED;
  const abvWapDisplay = abvWapNum != null ? `${abvWapNum}%` : abvWap;

  const HeaderIcon = isNegative ? TradeDownIcon : TradeUpIcon;
  const headerIconColor = isPositive ? GREEN : isNegative ? RED : NEUTRAL;
  const headerIconBg = isPositive ? '#DCFCE7' : isNegative ? '#FEE2E2' : '#F1F5F9';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.headerIconBg, { backgroundColor: headerIconBg }]}>
          <HeaderIcon size={18} color={headerIconColor} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>FNO Profit Meter</Text>
          <Text style={styles.headerSubtitle}>For All FNO Stocks</Text>
        </View>
        {cdate ? <Text style={styles.cdate}>{cdate}</Text> : null}
      </View>

      {/* Main P&L */}
      <View style={styles.plSection}>
        <Text style={[styles.plValue, { color: plColor }]}>{formatIndianCurrency(pl1day)}</Text>
        <Text style={[styles.plPct, { color: plColor }]}>{formatPctSigned(pl1daypercent)}</Text>
      </View>

      {/* Statistics Card */}
      <View style={styles.statsCard}>
        {/* Gainers */}
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: '#DCFCE7' }]}>
            <ArrowUpIcon size={16} color={GREEN} />
          </View>
          <Text style={styles.statLabel}>Gainers</Text>
          <Text style={[styles.statValue, { color: GREEN }]}>{advance}</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Losers */}
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
            <ArrowDownIcon size={16} color={RED} />
          </View>
          <Text style={styles.statLabel}>Losers</Text>
          <Text style={[styles.statValue, { color: RED }]}>{declined}</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Above WAP */}
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: abvWapNum != null && abvWapNum >= 50 ? '#DCFCE7' : '#FEE2E2' }]}>
            <ChartColumnIcon size={14} color={abvWapColor} />
          </View>
          <Text style={styles.statLabel}>Above WAP</Text>
          <Text style={[styles.statValue, { color: abvWapColor }]}>{abvWapDisplay}</Text>
        </View>
      </View>

      {/* View Report Button */}
      <Pressable
        onPress={() => router.push('/home/fno-profit-per-lot')}
        style={[styles.reportBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
        accessibilityRole="button"
        accessibilityLabel="View Report"
      >
        <Text style={styles.reportBtnText}>View Report →</Text>
      </Pressable>
    </View>
  );
}

export default memo(FnoProfitMeter);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    marginTop: 1,
  },
  cdate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  plSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 18,
  },
  plValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  plPct: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    alignSelf: 'stretch',
  },
  reportBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#0071A9',
  },
});
