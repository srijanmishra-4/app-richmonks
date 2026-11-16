import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

const STROKE = 2;

export const BackChevronIcon = memo(function BackChevronIcon({ size = 24, color = '#0F172A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const BookmarkIcon = memo(function BookmarkIcon({ size = 24, color = '#0F172A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5v15.5l-6-4-6 4V5Z" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    </Svg>
  );
});

export const SearchIcon = memo(function SearchIcon({ size = 24, color = '#0F172A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" stroke={color} strokeWidth={STROKE} />
      <Path d="M20 20l-4-4" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
});
