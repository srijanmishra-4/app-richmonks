import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

import { onSocketEvent } from '@/utils/socket';

// One REC_DATA_UPDATED listener for the signed-in app. Only the focused scope
// refreshes; other mounted scopes are marked stale and refresh once when they
// regain focus. Components register a GET_* and drop it on unmount, so a
// screen that has left the tree is not in the map and is not requested.

const RefreshContext = createContext(null);
const ScopeContext = createContext(null);

function logDataUpdated(data) {
  console.log('[SOCKET] DATA UPDATED', data);
}

export function RefreshProvider({ children }) {
  const screensRef = useRef(new Map());
  const staleRef = useRef(new Set());
  const activeRef = useRef(null);

  const register = useCallback((screenId, refresh) => {
    let bucket = screensRef.current.get(screenId);
    if (!bucket) {
      bucket = new Set();
      screensRef.current.set(screenId, bucket);
    }
    bucket.add(refresh);
    return () => {
      bucket.delete(refresh);
      if (bucket.size === 0) {
        screensRef.current.delete(screenId);
        staleRef.current.delete(screenId);
      }
    };
  }, []);

  const refreshScreen = useCallback((screenId) => {
    const bucket = screensRef.current.get(screenId);
    if (!bucket?.size) return Promise.resolve();
    const tasks = Array.from(bucket, (refresh) => {
      try {
        return refresh();
      } catch (error) {
        return Promise.reject(error);
      }
    });
    return Promise.allSettled(tasks);
  }, []);

  const setActiveScreen = useCallback((id) => {
    activeRef.current = id;
    if (staleRef.current.delete(id)) refreshScreen(id);
  }, [refreshScreen]);

  useEffect(() => onSocketEvent('REC_DATA_UPDATED', (result, error, raw) => {
    const payload = raw !== undefined ? raw : result;
    logDataUpdated(payload);
    const active = activeRef.current;
    Array.from(screensRef.current.keys()).forEach((id) => {
      if (id === active) refreshScreen(id);
      else staleRef.current.add(id);
    });
  }), [refreshScreen]);

  const value = useMemo(
    () => ({ register, refreshScreen, setActiveScreen }),
    [register, refreshScreen, setActiveScreen],
  );

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function RefreshScope({ id, children }) {
  const api = useContext(RefreshContext);
  useFocusEffect(useCallback(() => {
    api?.setActiveScreen(id);
  }, [api, id]));
  return <ScopeContext.Provider value={id}>{children}</ScopeContext.Provider>;
}

export function useRegisterRefresh(refresh) {
  const screenId = useContext(ScopeContext);
  const api = useContext(RefreshContext);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!screenId || !api) return undefined;
    return api.register(screenId, () => refreshRef.current?.());
  }, [api, screenId]);
}

export function useScreenRefresh() {
  const screenId = useContext(ScopeContext);
  const api = useContext(RefreshContext);
  return useCallback(() => {
    if (!screenId || !api) return Promise.resolve();
    return api.refreshScreen(screenId);
  }, [screenId, api]);
}
