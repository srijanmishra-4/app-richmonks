import config from '@/utils/config';
import { getToken, clearAuthData } from '@/utils/auth';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

async function request(url, { method = 'POST', body, auth = false } = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (!token) throw new Error('Your session has expired. Please login again.');
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Unable to connect. Please check your internet connection.');
  }

  const data = await response.json().catch(() => null);
  if (auth && response.status === 401) await clearAuthData();
  if (!response.ok || (typeof data?.status === 'number' && data.status >= 400)) throw new Error(data?.message || GENERIC_ERROR);
  return data;
}

export const authApi = {
  login: (mobile) => request(`${config.auth}/v2/login`, { body: { mobile } }),
  signup: (payload) => request(`${config.auth}/v2/signup`, { body: payload }),
  verifyOtp: (mobile, otp) => request(`${config.auth}/v2/otp/verify`, { body: { mobile, otp } }),
  resendOtp: (mobile) => request(`${config.auth}/v2/otp/resend`, { body: { mobile } }),
};

export const profileApi = {
  get: () => request(`${config.api}/api/profile`, { method: 'GET', auth: true }),
  update: (body) => request(`${config.api}/api/profile`, { method: 'POST', auth: true, body }),
};

// Authenticated calls to the main API: attaches the stored JWT and logs out on 401.
export const apiRequest = (path, options) => request(`${config.api}${path}`, { method: 'GET', auth: true, ...options });

export const watchlistApi = {
  futures: () => request(`${config.watchlist}/futures/`, { method: 'GET', auth: true }),
  options: () => request(`${config.watchlist}/options/`, { method: 'GET', auth: true }),
  addFuture: (body) => request(`${config.watchlist}/futures/add`, { method: 'POST', auth: true, body }),
  addOption: (body) => request(`${config.watchlist}/options/add`, { method: 'POST', auth: true, body }),
  removeFuture: (id) => request(`${config.watchlist}/futures/remove`, { method: 'POST', auth: true, body: { id } }),
  removeOption: (id) => request(`${config.watchlist}/options/remove`, { method: 'POST', auth: true, body: { id } }),
};

// Returns the logo URL for <Image>; a JSON request cannot read a PNG.
export const cdnApi = (symbol) => `${config.cdn}/logos/${symbol}.png`;