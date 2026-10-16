import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';

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

const CARD_TITLES = [
  "Above Yesterday's High",
  "Below Yesterday's Low",
  'Above Intraday High',
  'Below Intraday Low',
];

const HEADER_FONT_MAX = 12;
const GRID_GAP = 10;
const CARD_BORDER = 1;

// Narrow phones (~320pt wide) get tighter chrome and a slightly lower font floor so the
// longest title still fits on one line.
const SPACING_REGULAR = { padH: 10, iconSize: 14, rowGap: 6, fontMin: 10 };
const SPACING_COMPACT = { padH: 7, iconSize: 12, rowGap: 4, fontMin: 9 };
const COMPACT_GRID_WIDTH = 310;

function getStatValue(stats, key) {
  if (!Array.isArray(stats)) return '—';
  const entry = stats.find((item) => item != null && item[key] !== undefined);
  if (!entry) return '—';
  const val = entry[key];
  return val != null ? val : '—';
}

function getSpacing(gridWidth) {
  return gridWidth > 0 && gridWidth < COMPACT_GRID_WIDTH ? SPACING_COMPACT : SPACING_REGULAR;
}

function computeTitleSlotWidth(gridWidth, spacing) {
  if (gridWidth <= 0) return 0;
  const cardWidth = (gridWidth - GRID_GAP) / 2;
  const contentWidth = cardWidth - (CARD_BORDER + spacing.padH) * 2;
  return Math.max(0, contentWidth - spacing.iconSize - spacing.rowGap);
}

/**
 * Text width scales linearly with font size, so the longest title measured at
 * HEADER_FONT_MAX is enough to derive the one size that fits every card.
 */
function resolveHeaderFontSize(slotWidth, maxTitleWidth, fontMin) {
  if (slotWidth <= 0 || maxTitleWidth <= 0) return fontMin;

  // 1px guard absorbs sub-pixel rounding that would otherwise trigger an ellipsis.
  const usable = slotWidth - 1;
  if (maxTitleWidth <= usable) return HEADER_FONT_MAX;

  const fitted = Math.floor(HEADER_FONT_MAX * (usable / maxTitleWidth) * 10) / 10;
  return Math.min(HEADER_FONT_MAX, Math.max(fontMin, fitted));
}

/**
 * Renders every title once at HEADER_FONT_MAX inside an off-screen row wide enough that
 * nothing can wrap, so each onLayout width is the text's natural single-line width.
 */
function TitleWidthMeasurer({ titles, onMeasured }) {
  const widthsRef = useRef([]);

  const handleLayout = useCallback(
    (index, event) => {
      const width = event.nativeEvent.layout.width;
      if (!width) return;
      widthsRef.current[index] = width;

      if (titles.some((_, i) => !widthsRef.current[i])) return;
      onMeasured(Math.max(...titles.map((_, i) => widthsRef.current[i])));
    },
    [onMeasured, titles],
  );

  return (
    <View
      style={styles.measureRoot}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {titles.map((title, index) => (
        <Text
          key={title}
          style={styles.measureText}
          onLayout={(event) => handleLayout(index, event)}
        >
          {title}
        </Text>
      ))}
    </View>
  );
}

function StatCard({ type = 'green', isUpTrend, title, value, titleFontSize, spacing }) {
  const isGreen = type === 'green';
  const color = isGreen ? GREEN : RED;
  const TrendIcon = isUpTrend ? TradeUpIcon : TradeDownIcon;
  const ArrowIcon = isUpTrend ? ArrowUpIcon : ArrowDownIcon;
  const countText = value != null && value !== '—' ? `${value} Stocks` : '— Stocks';
  const titleLineHeight = Math.ceil(titleFontSize * 1.35);

  return (
    <View
      style={[
        styles.card,
        isGreen ? styles.cardGreen : styles.cardRed,
        { paddingHorizontal: spacing.padH },
      ]}
    >
      <View style={[styles.cardTopRow, { gap: spacing.rowGap }]}>
        <TrendIcon size={spacing.iconSize} color={color} />
        <View style={styles.cardTitleSlot}>
          <Text
            style={[
              styles.cardTitle,
              { fontSize: titleFontSize, lineHeight: titleLineHeight },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      </View>
      <View style={styles.cardBottomRow}>
        <ArrowIcon size={18} color={color} />
        <Text style={[styles.cardCount, { color }]}>{countText}</Text>
      </View>
    </View>
  );
}

import { useBreakpoint } from '@/hooks/useBreakpoint';

function BullVsBearSection() {
  const { isDesktop } = useBreakpoint();
  const [bullVsBear, setBullVsBear] = useState(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [maxTitleWidth, setMaxTitleWidth] = useState(0);
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

  const handleGridLayout = useCallback((event) => {
    const next = event.nativeEvent.layout.width;
    setGridWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  }, []);

  const handleTitlesMeasured = useCallback((width) => {
    setMaxTitleWidth((prev) => (Math.abs(prev - width) > 0.5 ? width : prev));
  }, []);

  const spacing = getSpacing(gridWidth);
  const headerFontSize = resolveHeaderFontSize(
    computeTitleSlotWidth(gridWidth, spacing),
    maxTitleWidth,
    spacing.fontMin,
  );

  const bullCount = bullVsBear?.data?.bull ?? bullVsBear?.bull ?? '—';
  const bearCount = bullVsBear?.data?.bear ?? bullVsBear?.bear ?? '—';

  const abvHigh = getStatValue(fnoStats, 'abv_high');
  const belowLow = getStatValue(fnoStats, 'below_low');
  const abvIntradayHigh = getStatValue(fnoStats, 'abv_intraday_high');
  const blwIntradayLow = getStatValue(fnoStats, 'blw_intraday_low');

  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer]}>
      <TitleWidthMeasurer titles={CARD_TITLES} onMeasured={handleTitlesMeasured} />

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

      <View style={styles.grid} onLayout={handleGridLayout}>
        <View style={styles.gridColumn}>
          <View style={styles.gridCell}>
            <StatCard
              type="green"
              isUpTrend
              title={CARD_TITLES[0]}
              value={abvHigh}
              titleFontSize={headerFontSize}
              spacing={spacing}
            />
          </View>
          <View style={styles.gridCell}>
            <StatCard
              type="green"
              isUpTrend
              title={CARD_TITLES[2]}
              value={abvIntradayHigh}
              titleFontSize={headerFontSize}
              spacing={spacing}
            />
          </View>
        </View>
        <View style={styles.gridColumn}>
          <View style={styles.gridCell}>
            <StatCard
              type="red"
              isUpTrend={false}
              title={CARD_TITLES[1]}
              value={belowLow}
              titleFontSize={headerFontSize}
              spacing={spacing}
            />
          </View>
          <View style={styles.gridCell}>
            <StatCard
              type="red"
              isUpTrend={false}
              title={CARD_TITLES[3]}
              value={blwIntradayLow}
              titleFontSize={headerFontSize}
              spacing={spacing}
            />
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/home/bull-vs-bear')}
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
  desktopContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  measureRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4000,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  measureText: {
    alignSelf: 'flex-start',
    fontFamily: 'Inter_600SemiBold',
    fontSize: HEADER_FONT_MAX,
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
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: GRID_GAP,
  },
  gridColumn: {
    flex: 1,
    gap: GRID_GAP,
  },
  gridCell: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: CARD_BORDER,
    paddingVertical: 12,
    justifyContent: 'space-between',
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
    minHeight: Math.ceil(HEADER_FONT_MAX * 1.35),
  },
  cardTitleSlot: {
    flex: 1,
    overflow: 'hidden',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardCount: {
    fontSize: 14,
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
