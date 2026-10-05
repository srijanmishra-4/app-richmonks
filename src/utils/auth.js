import { getItem, setItem, removeItem } from '@/utils/storage';

const AUTH_KEY = 'richmonks_auth';
const clearListeners = new Set();

export function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenExpiry(token) {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === 'number' ? exp : null;
}

// A token without a readable `exp` is treated as expired.
export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  return exp == null || Math.floor(Date.now() / 1000) >= exp;
}

function firstText(...values) {
  const found = values.find((value) => value != null && String(value).trim() !== '');
  return found == null ? '' : String(found).trim();
}

export async function setAuthData(result) {
  const nested = result?.user && typeof result.user === 'object' ? result.user : {};
  const claims = decodeJwt(result?.token) || {};
  const token = result?.token;
  if (!token || isTokenExpired(token)) throw new Error('Invalid session received. Please try again.');
  const data = {
    token,
    id: result?.id ?? nested.id ?? claims.id,
    full_name: firstText(result?.full_name, result?.fullName, result?.name, nested.full_name, nested.fullName, nested.name, claims.full_name, claims.name),
    email: firstText(result?.email, nested.email, claims.email),
    contact: firstText(result?.contact, result?.mobile, result?.phone, nested.contact, nested.mobile, nested.phone, claims.contact, claims.mobile, claims.phone),
    dob: firstText(result?.dob, result?.date_of_birth, nested.dob, nested.date_of_birth, claims.dob),
    platform: result?.platform ?? nested.platform,
  };
  await setItem(AUTH_KEY, JSON.stringify(data));
  return data;
}

const PROFILE_FIELDS = ['full_name', 'email', 'contact', 'dob'];

export async function updateAuthFields(fields) {
  const current = await getAuthData();
  if (!current?.token) return null;
  const next = { ...current };
  PROFILE_FIELDS.forEach((key) => { if (fields?.[key]) next[key] = fields[key]; });
  await setItem(AUTH_KEY, JSON.stringify(next));
  return next;
}

export async function getAuthData() {
  let data = null;
  try { data = JSON.parse(await getItem(AUTH_KEY)); } catch {}
  if (!data?.token) return null;
  if (isTokenExpired(data.token)) {
    await clearAuthData();
    return null;
  }
  return data;
}

export async function clearAuthData() {
  await removeItem(AUTH_KEY);
  clearListeners.forEach((listener) => listener());
}

export async function getToken() {
  return (await getAuthData())?.token ?? null;
}

export async function isAuthenticated() {
  return !!(await getToken());
}

export function onAuthCleared(listener) {
  clearListeners.add(listener);
  return () => clearListeners.delete(listener);
}
