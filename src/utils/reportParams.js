import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

export const MONTHLY_EXPIRY_OPTIONS = [
  { value: 'near' },
  { value: 'next' },
  { value: 'far' },
];

export const WEEKLY_EXPIRY_OPTIONS = [
  { value: 'weeklyNear' },
  { value: 'weeklyNext' },
  { value: 'weeklyFar' },
];

export function paramString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value == null ? '' : String(value);
}

export function resolveChoice(params, key, options, fallback) {
  const raw = paramString(params?.[key]).trim().toLowerCase();
  if (!raw) return fallback;
  const match = options.find((item) => String(item.value).toLowerCase() === raw);
  return match ? match.value : fallback;
}

export function industryIdFromParam(value) {
  const raw = paramString(value).trim();
  if (!raw || raw.toLowerCase() === 'all') return null;
  return raw;
}

export function queryKey(params) {
  return Object.keys(params).sort().map((key) => `${key}=${params[key] ?? ''}`).join('&');
}

// Route params are strings. Put back the id type the industry list uses so existing === checks still match.
export function useCanonicalIndustryId(industryId, setIndustryId, industries) {
  useEffect(() => {
    if (industryId == null || !Array.isArray(industries)) return;
    const match = industries.find((item) => item != null && String(item.id) === String(industryId));
    if (match && match.id !== industryId) setIndustryId(match.id);
  }, [industryId, industries, setIndustryId]);
}

function rememberIgnore(ignored, key) {
  ignored.add(key);
  if (ignored.size <= 30) return;
  const oldest = ignored.values().next().value;
  ignored.delete(oldest);
}

// URL -> state, same idea as OI Changes. Writes we just made are ignored, including an older one that lands after a newer selection.
export function useReportQuery(rawParams, parse, stateKey, onExternal) {
  const navigation = useNavigation();
  const signature = queryKey(rawParams);
  const pendingRef = useRef([]);
  const ignoredRef = useRef(new Set());
  const snapshotRef = useRef({ rawParams, parse, stateKey, onExternal });

  useEffect(() => {
    snapshotRef.current = { rawParams, parse, stateKey, onExternal };
  });

  useEffect(() => {
    const snap = snapshotRef.current;
    const { filters, serialized } = snap.parse(snap.rawParams);
    const key = queryKey(serialized);
    if (ignoredRef.current.has(key)) {
      ignoredRef.current.delete(key);
      return;
    }
    const pending = pendingRef.current;
    if (pending.length) {
      const index = pending.lastIndexOf(key);
      if (index === -1) return;
      if (index !== pending.length - 1) {
        rememberIgnore(ignoredRef.current, key);
        pending.splice(index, 1);
        return;
      }
      for (let i = 0; i < pending.length - 1; i += 1) rememberIgnore(ignoredRef.current, pending[i]);
      pending.length = 0;
      return;
    }
    if (key !== snap.stateKey) snap.onExternal(filters);
    if (signature !== key) navigation.setParams(serialized);
  }, [navigation, signature]);

  return useCallback((serialized) => {
    pendingRef.current.push(queryKey(serialized));
    navigation.setParams(serialized);
  }, [navigation]);
}
