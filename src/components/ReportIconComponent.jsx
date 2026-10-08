import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export const SortAscIcon = memo(function SortAscIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2.66675 9.33325H5.61414C6.23421 9.33325 6.54424 9.33325 6.62683 9.51999C6.70941 9.70679 6.49845 9.93079 6.07652 10.3789L3.65135 12.9543C3.22943 13.4024 3.01846 13.6264 3.10105 13.8132C3.18363 13.9999 3.49367 13.9999 4.11373 13.9999H6.66675" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.66675 6L4.07046 2.87018C4.33065 2.29006 4.46073 2 4.66675 2C4.87276 2 5.00285 2.29006 5.26303 2.87018L6.66675 6" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.6667 13.3334V2.66675M11.6667 13.3334C11.1999 13.3334 10.3277 12.0039 10 11.6667M11.6667 13.3334C12.1335 13.3334 13.0057 12.0039 13.3333 11.6667" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const SortDescIcon = memo(function SortDescIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2.66675 9.33325H5.61414C6.23421 9.33325 6.54424 9.33325 6.62683 9.51999C6.70941 9.70679 6.49845 9.93079 6.07652 10.3789L3.65135 12.9543C3.22943 13.4024 3.01846 13.6264 3.10105 13.8132C3.18363 13.9999 3.49367 13.9999 4.11373 13.9999H6.66675" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.66675 6L4.07046 2.87018C4.33065 2.29006 4.46073 2 4.66675 2C4.87276 2 5.00285 2.29006 5.26303 2.87018L6.66675 6" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.6667 2.66675V13.3334M11.6667 2.66675C11.1999 2.66675 10.3277 3.99625 10 4.33345M11.6667 2.66675C12.1335 2.66675 13.0057 3.99625 13.3333 4.33345" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const SortNoneIcon = memo(function SortNoneIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2.66675 9.33325H5.61414C6.23421 9.33325 6.54424 9.33325 6.62683 9.51999C6.70941 9.70679 6.49845 9.93079 6.07652 10.3789L3.65135 12.9543C3.22943 13.4024 3.01846 13.6264 3.10105 13.8132C3.18363 13.9999 3.49367 13.9999 4.11373 13.9999H6.66675" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.66675 6L4.07046 2.87018C4.33065 2.29006 4.46073 2 4.66675 2C4.87276 2 5.00285 2.29006 5.26303 2.87018L6.66675 6" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.6667 13.3334V2.66675M11.6667 13.3334C11.1999 13.3334 10.3277 12.0039 10 11.6667M11.6667 13.3334C12.1335 13.3334 13.0057 12.0039 13.3333 11.6667" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const FilterIcon = memo(function FilterIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M5.90497 8.3374C4.24601 7.09707 3.06376 5.73277 2.41823 4.96578C2.2184 4.72835 2.15292 4.5546 2.11355 4.24853C1.97874 3.20053 1.91134 2.67653 2.21863 2.33827C2.52593 2 3.06936 2 4.15622 2H11.8438C12.9307 2 13.4741 2 13.7813 2.33827C14.0887 2.67653 14.0213 3.20053 13.8865 4.24854C13.8471 4.55461 13.7816 4.72836 13.5817 4.96578C12.9353 5.73375 11.7507 7.10047 10.0884 8.34233C9.938 8.45473 9.83887 8.6378 9.82047 8.84093C9.6558 10.6613 9.50393 11.6584 9.4094 12.1628C9.25687 12.9771 8.10213 13.4671 7.484 13.9042C7.11607 14.1644 6.66953 13.8547 6.62185 13.4519C6.53095 12.6841 6.35974 11.1243 6.17285 8.84093C6.15606 8.63593 6.05657 8.45073 5.90497 8.3374Z" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const FlipIcon = memo(function FlipIcon({ size = 16, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4.66675 2.66675V13.3334" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.3333 12.6667V2.66675" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.66675 4.66673C6.66675 4.66673 5.19377 2.66675 4.66673 2.66675C4.13969 2.66674 2.66675 4.66675 2.66675 4.66675" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.3333 11.3333C13.3333 11.3333 11.8603 13.3333 11.3333 13.3333C10.8062 13.3333 9.33325 11.3333 9.33325 11.3333" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const SearchIcon = memo(function SearchIcon({ size = 14, color = '#94A3B8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 17L21 21" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const ClockIcon = memo(function ClockIcon({ size = 14, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke={color} strokeWidth={1.5} />
      <Path d="M12 8V12L14.5 14.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export default function ReportIconComponent({ name, size = 16, color = '#64748B', ...props }) {
  switch (name) {
    case 'sort-asc':
    case 'sortAsc':
      return <SortAscIcon size={size} color={color} {...props} />;
    case 'sort-desc':
    case 'sortDesc':
      return <SortDescIcon size={size} color={color} {...props} />;
    case 'sort':
    case 'sortNone':
    case 'sortDefault':
      return <SortNoneIcon size={size} color={color} {...props} />;
    case 'filter':
      return <FilterIcon size={size} color={color} {...props} />;
    case 'flip':
      return <FlipIcon size={size} color={color} {...props} />;
    case 'search':
      return <SearchIcon size={size} color={color} {...props} />;
    case 'clock':
      return <ClockIcon size={size} color={color} {...props} />;
    default:
      return null;
  }
}
