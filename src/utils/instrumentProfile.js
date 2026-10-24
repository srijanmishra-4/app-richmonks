import { router } from 'expo-router';

function cleanSymbol(symbol) {
  const name = String(symbol ?? '').trim();
  if (!name || name === '—') return '';
  return name;
}

function strikeParam(value) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(num) ? String(num) : '';
}

export function optionSide(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'PE' || raw === 'PUT' || raw === 'P') return 'PE';
  if (raw === 'CE' || raw === 'CALL' || raw === 'C') return 'CE';
  return raw;
}

function optionPeriod(symbol, expiry) {
  if (String(symbol).toUpperCase() === 'NIFTY' && String(expiry ?? '').startsWith('weekly')) return 'weekly';
  return 'monthly';
}

export function profileExpiry(value) {
  const expiry = String(value ?? '').trim();
  return expiry || 'near';
}

export function openFutureProfile({ symbol, expiry = 'near' } = {}) {
  const name = cleanSymbol(symbol);
  if (!name) return;
  router.push({
    pathname: '/home/profile/futures',
    params: { symbol: name, expiry: profileExpiry(expiry) },
  });
}

export function openOptionProfile({ symbol, strike, optionType, expiry = 'near' } = {}) {
  const name = cleanSymbol(symbol);
  if (!name) return;
  const expiryState = profileExpiry(expiry);
  router.push({
    pathname: '/home/profile/options',
    params: {
      symbol: name,
      strike_pr: strikeParam(strike),
      option_type: optionSide(optionType),
      expiry: expiryState,
      period: optionPeriod(name, expiryState),
    },
  });
}
