import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

/** Trending-up line chart icon from assets/home/trade-up.svg */
export const TradeUpIcon = memo(function TradeUpIcon({ size = 16, color = '#21A947' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M13.3333 8.66671V5.33337H10" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.3333 5.33337L9.99999 8.66671C9.41159 9.25511 9.11746 9.54924 8.75639 9.58177C8.69666 9.58717 8.63666 9.58717 8.57692 9.58177C8.21586 9.54924 7.92172 9.25511 7.33332 8.66671C6.74492 8.07831 6.45076 7.78417 6.0897 7.75164C6.03002 7.74624 5.96996 7.74624 5.91028 7.75164C5.54922 7.78417 5.25503 8.07831 4.66666 8.66671L2.66666 10.6667" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** Trending-down line chart icon from assets/home/trade-down.svg */
export const TradeDownIcon = memo(function TradeDownIcon({ size = 16, color = '#FF0000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M13.3333 7.33337V10.6667H10" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.3334 10.6667L10 7.33337C9.41162 6.74497 9.11749 6.45081 8.75642 6.41829C8.69669 6.41291 8.63669 6.41291 8.57695 6.41829C8.21589 6.45081 7.92175 6.74497 7.33335 7.33337C6.74495 7.92177 6.45079 8.21591 6.08973 8.24844C6.03005 8.25384 5.96999 8.25384 5.91031 8.24844C5.54925 8.21591 5.25506 7.92177 4.66669 7.33337L2.66669 5.33337" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** Upward arrow icon from assets/home/arrow-up-02.svg */
export const ArrowUpIcon = memo(function ArrowUpIcon({ size = 20, color = '#21A947' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 4.58337V15.8334" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 9.16663C15 9.16663 11.3176 4.16663 10 4.16663C8.68233 4.16662 5 9.16663 5 9.16663" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** Downward arrow icon from assets/home/arrow-down-02.svg */
export const ArrowDownIcon = memo(function ArrowDownIcon({ size = 20, color = '#FF0000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 15.4184V4.16833" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 10.835C15 10.835 11.3176 15.8349 10 15.835C8.68233 15.835 5 10.835 5 10.835" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** Bar chart icon from assets/home/chart-no-axes-column-increasing.svg */
export const ChartColumnIcon = memo(function ChartColumnIcon({ size = 18, color = '#FF0000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M15.75 15.75V2.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.25 15.75V5.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.75 15.75V8.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.25 15.75V11.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
