import { memo, useState } from 'react';
import { View } from 'react-native';

import PriceRangeBarComponent from '@/components/stock-profile/future/PriceRangeBarComponent';
import ProfileGraph from '@/components/stock-profile/ProfileGraph';
import { useFluidStyles } from '@/utils/responsive';

const PERIODS = [
  { key: '1D', label: '1D', high: 'high', low: 'low', distHigh: 'dist_high', distLow: 'dist_low', series: 'graphData1Day' },
  { key: '5D', label: '5D', high: 'high_5_days', low: 'low_5_days', distHigh: 'dist_high_5_day', distLow: 'dist_low_5_day', series: 'graphData5Days' },
  { key: '10D', label: '10D', high: 'high_10_days', low: 'low_10_days', distHigh: 'dist_high_10_day', distLow: 'dist_low_10_day', series: 'graphData10Days' },
  { key: '20D', label: '20D', high: 'high_20_day', low: 'low_20_day', distHigh: 'dist_high_20_day', distLow: 'dist_low_20_day', series: 'graphData20Days' },
  { key: '30D', label: '30D', high: 'high_30_days', low: 'low_30_days', distHigh: 'dist_high_30_day', distLow: 'dist_low_30_day', series: 'graphData30Days' },
  { key: '60D', label: '60D', high: 'high_60_days', low: 'low_60_days', distHigh: 'dist_high_60_day', distLow: 'dist_low_60_day', series: 'graphData60Days' },
];

function KeyStatsOverview({ profile, graph }) {
  const styles = useFluidStyles(createStyles);
  const [period, setPeriod] = useState('1D');
  const meta = PERIODS.find((item) => item.key === period) ?? PERIODS[0];

  return (
    <View style={styles.section}>
      <PriceRangeBarComponent
        high={profile?.[meta.high]}
        low={profile?.[meta.low]}
        price={profile?.price}
        distanceFromLow={profile?.[meta.distLow] ?? null}
        distanceFromHigh={profile?.[meta.distHigh] ?? null}
      />
      <ProfileGraph data={graph?.[meta.series]} period={period} periods={PERIODS} onPeriodChange={setPeriod} />
    </View>
  );
}

export default memo(KeyStatsOverview);

const createStyles = (f) => ({
  section: { paddingBottom: f(20, 24) },
});
