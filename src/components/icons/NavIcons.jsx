import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Lightweight SVG icon components extracted from the project's assets/icons/nav/ SVGs.
 * Each icon accepts `size` and `color` props for flexible theming.
 * All icons default to 24×24 matching the original SVG viewBox.
 */

export const HomeContainIcon = memo(function HomeContainIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z" fill={color} />
      <Path d="M17 15.5H15V17.5H17V15.5Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
});

export const HomeOutlineIcon = memo(function HomeOutlineIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z" fill="transparent" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 15.5H15V17.5H17V15.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
});

export const WatchlistContainIcon = memo(function WatchlistContainIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 17.9808V9.70753C4 6.07416 4 4.25748 5.17157 3.12874C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.12874C20 4.25748 20 6.07416 20 9.70753V17.9808C20 20.2867 20 21.4396 19.2272 21.8523C17.7305 22.6514 14.9232 19.9852 13.59 19.1824C12.8168 18.7168 12.4302 18.484 12 18.484C11.5698 18.484 11.1832 18.7168 10.41 19.1824C9.0768 19.9852 6.26947 22.6514 4.77285 21.8523C4 21.4396 4 20.2867 4 17.9808Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const WatchlistOutlineIcon = memo(function WatchlistOutlineIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 17.9808V9.70753C4 6.07416 4 4.25748 5.17157 3.12874C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.12874C20 4.25748 20 6.07416 20 9.70753V17.9808C20 20.2867 20 21.4396 19.2272 21.8523C17.7305 22.6514 14.9232 19.9852 13.59 19.1824C12.8168 18.7168 12.4302 18.484 12 18.484C11.5698 18.484 11.1832 18.7168 10.41 19.1824C9.0768 19.9852 6.26947 22.6514 4.77285 21.8523C4 21.4396 4 20.2867 4 17.9808Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const TradesContainIcon = memo(function TradesContainIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 9V15C10 15.9319 10 16.3978 9.84776 16.7654C9.64477 17.2554 9.25542 17.6448 8.76537 17.8478C8.39782 18 7.93188 18 7 18C6.06812 18 5.60218 18 5.23463 17.8478C4.74458 17.6448 4.35523 17.2554 4.15224 16.7654C4 16.3978 4 15.9319 4 15V9C4 8.06812 4 7.60218 4.15224 7.23463C4.35523 6.74458 4.74458 6.35523 5.23463 6.15224C5.60218 6 6.06812 6 7 6C7.93188 6 8.39782 6 8.76537 6.15224C9.25542 6.35523 9.64477 6.74458 9.84776 7.23463C10 7.60218 10 8.06812 10 9Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 14V15C20 15.9319 20 16.3978 19.8478 16.7654C19.6448 17.2554 19.2554 17.6448 18.7654 17.8478C18.3978 18 17.9319 18 17 18C16.0681 18 15.6022 18 15.2346 17.8478C14.7446 17.6448 14.3552 17.2554 14.1522 16.7654C14 16.3978 14 15.9319 14 15V14C14 13.0681 14 12.6022 14.1522 12.2346C14.3552 11.7446 14.7446 11.3552 15.2346 11.1522C15.6022 11 16.0681 11 17 11C17.9319 11 18.3978 11 18.7654 11.1522C19.2554 11.3552 19.6448 11.7446 19.8478 12.2346C20 12.6022 20 13.0681 20 14Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 11V3M17 18V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 6V3M7 18V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const TradesOutlineIcon = memo(function TradesOutlineIcon({ size = 24, color = '#0071A9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 9V15C10 15.9319 10 16.3978 9.84776 16.7654C9.64477 17.2554 9.25542 17.6448 8.76537 17.8478C8.39782 18 7.93188 18 7 18C6.06812 18 5.60218 18 5.23463 17.8478C4.74458 17.6448 4.35523 17.2554 4.15224 16.7654C4 16.3978 4 15.9319 4 15V9C4 8.06812 4 7.60218 4.15224 7.23463C4.35523 6.74458 4.74458 6.35523 5.23463 6.15224C5.60218 6 6.06812 6 7 6C7.93188 6 8.39782 6 8.76537 6.15224C9.25542 6.35523 9.64477 6.74458 9.84776 7.23463C10 7.60218 10 8.06812 10 9Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 14V15C20 15.9319 20 16.3978 19.8478 16.7654C19.6448 17.2554 19.2554 17.6448 18.7654 17.8478C18.3978 18 17.9319 18 17 18C16.0681 18 15.6022 18 15.2346 17.8478C14.7446 17.6448 14.3552 17.2554 14.1522 16.7654C14 16.3978 14 15.9319 14 15V14C14 13.0681 14 12.6022 14.1522 12.2346C14.3552 11.7446 14.7446 11.3552 15.2346 11.1522C15.6022 11 16.0681 11 17 11C17.9319 11 18.3978 11 18.7654 11.1522C19.2554 11.3552 19.6448 11.7446 19.8478 12.2346C20 12.6022 20 13.0681 20 14Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 11V3M17 18V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 6V3M7 18V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const SearchIcon = memo(function SearchIcon({ size = 24, color = '#565656' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 17L21 21" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
