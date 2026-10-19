import { memo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const CHEVRON_ROTATION = { right: 0, down: 90, left: 180, up: 270 };

export const ChevronIcon = memo(function ChevronIcon({ size = 16, color = '#64748B', direction = 'right' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: `${CHEVRON_ROTATION[direction] ?? 0}deg` }] }}>
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const PlusCircleIcon = memo(function PlusCircleIcon({ size = 20, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
});

export const ListFilterIcon = memo(function ListFilterIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M7 12h10M10 18h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
