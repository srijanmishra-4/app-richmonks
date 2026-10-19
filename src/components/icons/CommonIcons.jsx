import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export const ListFilterIcon = memo(function ListFilterIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M7 12h10M10 18h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
