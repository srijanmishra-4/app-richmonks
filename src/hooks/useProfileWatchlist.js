import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { watchlistApi } from '@/utils/api';

// Same expiry buckets the add-watchlist screen sends, so a profile check finds
// a contract that was saved from there. Weekly contracts stay "Near"/"Next"/"Far"
// and are distinguished by `type`.
const EXPIRY_STATE = {
  near: 'Near',
  next: 'Next',
  far: 'Far',
  weeklyNear: 'Near',
  weeklyNext: 'Next',
  weeklyFar: 'Far',
};

function expiryState(expiry) {
  const key = String(expiry ?? '').trim() || 'near';
  return EXPIRY_STATE[key] ?? 'Near';
}

function strikeValue(value) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(num)) return '';
  return Number.isInteger(num) ? String(Math.trunc(num)) : String(num);
}

function buildContract({ kind, symbol, expiry, optionType, strike }) {
  const name = String(symbol ?? '').trim();
  if (!name) return null;
  const expiry_state = expiryState(expiry);
  if (kind === 'options') {
    const option_type = String(optionType ?? '').trim().toUpperCase();
    const strike_pr = strikeValue(strike);
    if (!option_type || !strike_pr) return null;
    const type = String(expiry ?? '').trim().startsWith('weekly') ? 'weekly' : 'monthly';
    return {
      key: `options|${name}|${option_type}|${strike_pr}|${expiry_state}|${type}`,
      check: { symbol: name, option_type, strike_pr, expiry_state },
      add: { symbol: name, option_type, strike_pr, expiry_state, type },
    };
  }
  return {
    key: `futures|${name}|${expiry_state}`,
    check: { symbol: name, expiry_state },
    add: { symbol: name, expiry_state },
  };
}

function addedId(data) {
  const id = data?.result?.id ?? data?.id ?? null;
  return id == null || id === '' ? null : id;
}

const EMPTY = { added: false, id: null, ready: false, busy: false };

export function useProfileWatchlist({ kind, symbol, expiry, optionType, strike, onError }) {
  const contract = useMemo(
    () => buildContract({ kind, symbol, expiry, optionType, strike }),
    [kind, symbol, expiry, optionType, strike],
  );
  const key = contract?.key ?? '';
  const [watch, setWatch] = useState({ key, ...EMPTY });
  if (watch.key !== key) setWatch({ key, ...EMPTY });

  const shown = watch.key === key ? watch : { key, ...EMPTY };
  const gen = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    const token = ++gen.current;
    busyRef.current = false;
    const current = contract;
    if (!current) return undefined;
    let active = true;
    const request = kind === 'options' ? watchlistApi.checkOption(current.check) : watchlistApi.checkFuture(current.check);
    request.then((data) => {
      if (!active || gen.current !== token) return;
      const id = data?.id ?? null;
      const isAdded = Boolean(data?.isAdded) && id != null && id !== '';
      setWatch((prev) => (prev.key !== current.key ? prev : { key: current.key, added: isAdded, id: isAdded ? id : null, ready: true, busy: false }));
    }).catch(() => {
      if (!active || gen.current !== token) return;
      setWatch((prev) => (prev.key !== current.key ? prev : { key: current.key, added: false, id: null, ready: true, busy: false }));
    });
    return () => { active = false; };
  }, [contract, key, kind]);

  const toggle = useCallback(() => {
    if (!contract || !shown.ready || busyRef.current) return;
    const token = gen.current;
    const fail = (err) => {
      if (gen.current !== token) return;
      onError?.(err?.message || 'Something went wrong. Please try again.');
    };

    if (shown.added) {
      const id = shown.id;
      if (!id) {
        onError?.('Something went wrong. Please try again.');
        return;
      }
      busyRef.current = true;
      setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: false, busy: true }));
      const remove = kind === 'options' ? watchlistApi.removeOption(id) : watchlistApi.removeFuture(id);
      remove.then(() => {
        if (gen.current !== token) return;
        setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: false, id: null, busy: false }));
      }).catch((err) => {
        if (gen.current !== token) return;
        setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: true, id, busy: false }));
        fail(err);
      }).finally(() => {
        if (gen.current === token) busyRef.current = false;
      });
      return;
    }

    busyRef.current = true;
    setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: true, busy: true }));
    const add = kind === 'options' ? watchlistApi.addOption(contract.add) : watchlistApi.addFuture(contract.add);
    add.then((data) => {
      if (gen.current !== token) return;
      const id = addedId(data);
      if (!id) {
        setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: false, id: null, busy: false }));
        onError?.('Something went wrong. Please try again.');
        return;
      }
      setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: true, id, busy: false }));
    }).catch((err) => {
      if (gen.current !== token) return;
      setWatch((prev) => (prev.key !== key ? prev : { ...prev, added: false, id: null, busy: false }));
      fail(err);
    }).finally(() => {
      if (gen.current === token) busyRef.current = false;
    });
  }, [contract, shown.ready, shown.added, shown.id, key, kind, onError]);

  return { added: shown.added, ready: shown.ready, busy: shown.busy, toggle };
}
