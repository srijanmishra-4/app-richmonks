import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { getAuthData, setAuthData, updateAuthFields, clearAuthData, onAuthCleared, getTokenExpiry, isTokenExpired } from '@/utils/auth';

// setTimeout overflows above ~24.8 days, and the JWT lives ~30 days.
const MAX_TIMEOUT = 2 ** 31 - 1;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthData().then(setAuth).catch(() => setAuth(null)).finally(() => setIsLoading(false));
    return onAuthCleared(() => setAuth(null));
  }, []);

  useEffect(() => {
    if (!auth?.token) return undefined;
    let timer;
    const check = () => {
      clearTimeout(timer);
      if (isTokenExpired(auth.token)) { clearAuthData(); return; }
      timer = setTimeout(check, Math.min(getTokenExpiry(auth.token) * 1000 - Date.now(), MAX_TIMEOUT));
    };
    check();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [auth]);

  const signIn = useCallback(async (result) => setAuth(await setAuthData(result)), []);
  const updateUser = useCallback(async (fields) => {
    const next = await updateAuthFields(fields);
    if (next) setAuth(next);
    return next;
  }, []);
  const signOut = useCallback(() => clearAuthData(), []);

  const value = useMemo(() => {
    const { token = null, ...user } = auth ?? {};
    return { token, user: auth ? user : null, isAuthenticated: !!token && !isTokenExpired(token), isLoading, signIn, updateUser, signOut };
  }, [auth, isLoading, signIn, updateUser, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
