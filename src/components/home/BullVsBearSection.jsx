import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';

import { socketRequest } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';
import { useFnoStats } from '@/context/FnoStatsContext';
import {
  BullIcon,
  BearIcon,
  TradeUpIcon,
  TradeDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@/components/icons/HomeIcons';

const GREEN = '#16A34A';
const RED = '#DC2626';

function getStatValue(stats, key) {
  if (!Array.isArray(stats)) return '—';
  const entry = stats.find((item) => item != null && item[key] !== undefined);
  if (!entry) return '—';
  const val = entry[key];
  return val != null ? val : '—';
}

function StatCard({ type = 'green', isUpTrend, title, value }) {
  const isGreen = type === 'green';
  const color = isGreen ? GREEN : RED;
  const TrendIcon = isUpTrend ? TradeUpIcon : TradeDownIcon;
  const ArrowIcon = isUpTrend ? ArrowUpIcon : ArrowDownIcon;
  const countText = value != null && value !== '—' ? `${value} Stocks` : '— Stocks';

  return (
    <View style={[styles.card, isGreen ? styles.cardGreen : styles.cardRed]}>
      <View style={styles.cardTopRow}>
        <TrendIcon size={14} color={color} />
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.cardBottomRow}>
        <ArrowIcon size={18} color={color} />
        <Text style={[styles.cardCount, { color }]}>{countText}</Text>
      </View>
    </View>
  );
}

function BullVsBearSection() {
  const [bullVsBear, setBullVsBear] = useState(null);
  const fnoStats = useFnoStats();

  const fetchBullVsBear = useCallback(() => socketRequest('GET_BULL_VS_BEAR'), []);

  useSocketEvent('REC_BULL_VS_BEAR', (res) => {
    if (res) {
      console.log('[SOCKET] REC_BULL_VS_BEAR', res);
      setBullVsBear(res);
    }
  });

  useEffect(() => {
    fetchBullVsBear().catch(() => {});
  }, [fetchBullVsBear]);

  useRegisterRefresh(fetchBullVsBear);

  const bullCount = bullVsBear?.data?.bull ?? bullVsBear?.bull ?? '—';
  const bearCount = bullVsBear?.data?.bear ?? bullVsBear?.bear ?? '—';

  const abvHigh = getStatValue(fnoStats, 'abv_high');
  const belowLow = getStatValue(fnoStats, 'below_low');
  const abvIntradayHigh = getStatValue(fnoStats, 'abv_intraday_high');
  const blwIntradayLow = getStatValue(fnoStats, 'blw_intraday_low');

  return (
    <View style={styles.container}>
      {/* Top Bulls vs Bears Battle Header */}
      <View style={styles.battleHeader}>
        <View style={styles.sideCol}>
          <Text style={styles.sideLabel}>BULLS</Text>
          <Text style={[styles.sideCount, { color: GREEN }]}>{bullCount}</Text>
        </View>

        <View style={styles.centerGroup}>
          <View style={[styles.avatarBox, styles.avatarBoxBull]}>
            <BullIcon width={22} height={28} />
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={[styles.avatarBox, styles.avatarBoxBear]}>
            <BearIcon width={22} height={28} />
          </View>
        </View>

        <View style={styles.sideCol}>
          <Text style={styles.sideLabel}>BEARS</Text>
          <Text style={[styles.sideCount, { color: RED }]}>{bearCount}</Text>
        </View>
      </View>

      {/* 2-Column Grid of Statistic Cards */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatCard
            type="green"
            isUpTrend
            title="Above Yesterday's High"
            value={abvHigh}
          />
          <StatCard
            type="red"
            isUpTrend={false}
            title="Below Yesterday's Low"
            value={belowLow}
          />
        </View>
        <View style={styles.gridRow}>
          <StatCard
            type="green"
            isUpTrend
            title="Above Intraday High"
            value={abvIntradayHigh}
          />
          <StatCard
            type="red"
            isUpTrend={false}
            title="Below Intraday Low"
            value={blwIntradayLow}
          />
        </View>
      </View>

      {/* View Report Button */}
      <Pressable
        style={[styles.reportBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
        accessibilityRole="button"
        accessibilityLabel="View Report"
      >
        <Text style={styles.reportBtnText}>View Report →</Text>
      </Pressable>
    </View>
  );
}

export default memo(BullVsBearSection);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  battleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sideCol: {
    flex: 1,
    alignItems: 'center',
  },
  sideLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sideCount: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBoxBull: {
    backgroundColor: '#DCFCE7',
  },
  avatarBoxBear: {
    backgroundColor: '#FEE2E2',
  },
  vsText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#94A3B8',
  },
  grid: {
    marginTop: 10,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cardGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  cardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
    flexShrink: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardCount: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
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
