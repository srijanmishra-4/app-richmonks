import { Linking, Platform } from 'react-native';

import { decodeJwt } from '@/utils/auth';

export const TERMS_URL = 'https://www.richmonks.in/terms-of-use';
export const PRIVACY_URL = 'https://www.richmonks.in/privacy-policy';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function openExternal(url) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url);
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

const NESTED_KEYS = ['result', 'data', 'profile', 'user', 'userData', 'user_data', 'details', 'account', 'claims'];

function pickIdentity(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
  const name = text(user.full_name || user.fullName || user.name || user.user_name || user.userName);
  const first = text(user.first_name || user.firstName);
  const last = text(user.last_name || user.lastName);
  const mapped = {
    name: name || [first, last].filter(Boolean).join(' '),
    email: text(user.email || user.email_id || user.emailId),
    contact: text(user.contact || user.mobile || user.phone || user.mobile_no || user.mobileNo || user.phone_number || user.phoneNumber),
    dob: text(user.dob || user.date_of_birth || user.dateOfBirth),
  };
  return mapped.name || mapped.email || mapped.contact || mapped.dob ? mapped : null;
}

export function mapProfile(payload) {
  const queue = [payload];
  const seen = new Set();
  while (queue.length && seen.size < 12) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    const mapped = pickIdentity(current);
    if (mapped) return mapped;
    NESTED_KEYS.forEach((key) => {
      const next = current[key];
      if (next && typeof next === 'object') queue.push(next);
    });
  }
  return { name: '', email: '', contact: '', dob: '' };
}

export function sessionIdentity(user, token) {
  return mapProfile({ user, claims: decodeJwt(token) });
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value || '').trim());
}

export function parseDob(value) {
  const str = text(value);
  if (!str) return null;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return null;
}

export function formatDob(date) {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export function toApiDob(date) {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
