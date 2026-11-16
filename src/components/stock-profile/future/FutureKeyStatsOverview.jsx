import { memo, useState } from 'react';
import { View } from 'react-native';

import PriceRangeBarComponent from '@/components/stock-profile/future/PriceRangeBarComponent';
import ProfileGraph from '@/components/stock-profile/ProfileGraph';
import { useFluidStyles } from '@/utils/responsive';

const PERIODS = [
  { key: '1D', label: '1 Day', high: 'high', low: 'low', series: 'graphData1Day' },
  { key: '5D', label: '5 Day', high: 'high_5_days', low: 'low_5_days', series: 'graphData5Days' },
  { key: '30D', label: '30 Day', high: 'high_30_days', low: 'low_30_days', series: 'graphData30Days' },
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
        wap={profile?.wap}
      />
      <ProfileGraph data={graph?.[meta.series]} period={period} onPeriodChange={setPeriod} />
    </View>
  );
}

export default memo(KeyStatsOverview);

const createStyles = (f) => ({
  section: { paddingBottom: f(20, 24) },
});
