import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import config from '@/utils/config';
import { connectSocket, onSocketEvent } from '@/utils/socket';

const CommonDataContext = createContext(null);

const COMMON_API = `${config.api}/api/common-api`;

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export function CommonDataProvider({ children }) {
  const [symbols, setSymbols] = useState([]);
  const [symbolListTimestamp, setSymbolListTimestamp] = useState('');
  const [industries, setIndustries] = useState([]);
  const [industryListTimestamp, setIndustryListTimestamp] = useState('');
  const [nearExpiry, setNearExpiry] = useState('');
  const [nextExpiry, setNextExpiry] = useState('');
  const [allExpiryDates, setAllExpiryDates] = useState([]);
  const [strikePricesAndPrices, setStrikePricesAndPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── REST fetches (concurrent, fire once) ──
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.allSettled([
        fetchJson(`${COMMON_API}/getSymbolList`),
        fetchJson(`${COMMON_API}/getIndustryList`),
        fetchJson(`${COMMON_API}/getExpiryDt`),
        fetchJson(`${COMMON_API}/getAllExpiryDates`),
      ]);

      if (cancelled) return;

      const errors = [];

      // Symbol list
      if (results[0].status === 'fulfilled') {
        const r = results[0].value?.result;
        setSymbols(Array.isArray(r?.symbols) ? r.symbols : []);
        setSymbolListTimestamp(r?.timestamp ?? '');
      } else {
        errors.push(results[0].reason);
      }

      // Industry list
      if (results[1].status === 'fulfilled') {
        const r = results[1].value?.result;
        setIndustries(Array.isArray(r?.IndustryList) ? r.IndustryList : []);
        setIndustryListTimestamp(r?.timestamp ?? '');
      } else {
        errors.push(results[1].reason);
      }

      // Expiry
      if (results[2].status === 'fulfilled') {
        const r = results[2].value?.result;
        setNearExpiry(r?.nearExpiry ?? '');
        setNextExpiry(r?.nextExpiry ?? '');
      } else {
        errors.push(results[2].reason);
      }

      // All expiry dates
      if (results[3].status === 'fulfilled') {
        const r = results[3].value?.result;
        setAllExpiryDates(Array.isArray(r) ? r : []);
      } else {
        errors.push(results[3].reason);
      }

      if (errors.length) setError(errors[0]);
      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // ── Socket: strike prices ──
  // Requested on app load, after every reconnect, and on each REC_DATA_UPDATED.
  useEffect(() => {
    const socket = connectSocket();
    const unsub = onSocketEvent('REC_STRIKE_PR_AND_PRICES', (result, err) => {
      if (!err && result && typeof result === 'object') setStrikePricesAndPrices(result);
    });
    const request = () => socket.emit('GET_STRIKE_PR_AND_PRICES');
    const unsubUpdated = onSocketEvent('REC_DATA_UPDATED', request);
    socket.on('connect', request);
    if (socket.connected) request();
    return () => { unsub(); unsubUpdated(); socket.off('connect', request); };
  }, []);

  const value = useMemo(() => ({
    symbols, symbolListTimestamp,
    industries, industryListTimestamp,
    nearExpiry, nextExpiry,
    allExpiryDates,
    strikePricesAndPrices,
    loading, error,
  }), [symbols, symbolListTimestamp, industries, industryListTimestamp, nearExpiry, nextExpiry, allExpiryDates, strikePricesAndPrices, loading, error]);

  return <CommonDataContext.Provider value={value}>{children}</CommonDataContext.Provider>;
}

export function useCommonData() {
  const value = useContext(CommonDataContext);
  if (!value) throw new Error('useCommonData must be used within a CommonDataProvider');
  return value;
}
