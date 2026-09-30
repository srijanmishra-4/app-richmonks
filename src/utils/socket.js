import { io } from 'socket.io-client';

import config from '@/utils/config';

// One shared connection to the same origin as the REST API, on Socket.IO's default
// path and namespace. The backend speaks `GET_X` (client) -> `REC_X` (server) over
// that single connection, so every screen multiplexes listeners here instead of
// opening its own socket.

const REQUEST_PREFIX = 'GET_';
const RESPONSE_PREFIX = 'REC_';
const DEFAULT_TIMEOUT = 15000;
const GENERIC_ERROR = 'Something went wrong. Please try again.';

let socket = null;
let state = { status: 'idle', error: null };
const stateListeners = new Set();

function setState(status, error = null) {
  state = { status, error };
  stateListeners.forEach((listener) => listener(state));
}

function socketError(message, code) {
  const error = new Error(message);
  error.code = code; // 'timeout' | 'response' | 'connection'
  return error;
}

// Successful payloads look like { message, statusCode, result }. Anything without a
// statusCode is handed over untouched rather than guessed at.
function readResponse(data) {
  const statusCode = data?.statusCode;
  if (statusCode === undefined) return { result: data, error: null };
  if (statusCode === 200) return { result: data.result, error: null };
  return { result: null, error: socketError(data?.message || GENERIC_ERROR, 'response') };
}

const toResponseEvent = (event) => (event.startsWith(REQUEST_PREFIX) ? `${RESPONSE_PREFIX}${event.slice(REQUEST_PREFIX.length)}` : event);

// Created on first use and kept for the lifetime of the app. `socket.active` tells us
// whether Socket.IO's built-in reconnection is still going, so we never retry by hand.
export function getSocket() {
  if (socket) return socket;

  socket = io(config.api);
  setState(socket.connected ? 'connected' : 'connecting');
  socket.on('connect', () => setState('connected'));
  socket.on('disconnect', () => setState(socket.active ? 'connecting' : 'disconnected'));
  socket.on('connect_error', (error) => setState(socket.active ? 'connecting' : 'disconnected', error));
  return socket;
}

export function connectSocket() {
  const client = getSocket();
  if (!client.connected) client.connect();
  return client;
}

// Central lifecycle control (logout, background policy later) — components must not call this.
export function disconnectSocket() {
  socket?.disconnect();
}

export const getSocketState = () => state;

export function onSocketState(listener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

let lastLoggedEvent = '';
let lastLoggedTime = 0;

function logSocketResponse(event, data) {
  if (event === 'REC_DATA_UPDATED') return;
  const now = Date.now();
  if (lastLoggedEvent === event && now - lastLoggedTime < 50) return;
  lastLoggedEvent = event;
  lastLoggedTime = now;
  try {
    const formatted = typeof data === 'object' && data !== null ? JSON.stringify(data, null, 2) : String(data);
    console.log(`[SOCKET] ${event}\n--------------------------------\n${formatted}\n--------------------------------`);
  } catch (_) {
    console.log(`[SOCKET] ${event}\n--------------------------------\n`, data, `\n--------------------------------`);
  }
}

/**
 * Listen to a server event (e.g. `REC_MARKET_DASHBOARD`) for as long as the consumer
 * needs it — the backend re-emits these as market data refreshes. The handler receives
 * the unwrapped `result` plus an error when the payload carried a non-200 statusCode.
 * Returns an unsubscribe that removes only this listener.
 */
export function onSocketEvent(event, handler) {
  const client = connectSocket();
  const listener = (data) => {
    logSocketResponse(event, data);
    const { result, error } = readResponse(data);
    handler(result, error, data);
  };
  client.on(event, listener);
  return () => client.off(event, listener);
}

/**
 * Emit `GET_X` and resolve with the `result` of the matching `REC_X`. The backend does
 * not always report failures, so every request is bounded by a timeout; the listener and
 * the timer are torn down together and never touch other consumers of the shared socket.
 */
export function socketRequest(event, payload, { timeout = DEFAULT_TIMEOUT, responseEvent = toResponseEvent(event) } = {}) {
  return new Promise((resolve, reject) => {
    const client = connectSocket();
    let timer;

    const settle = (settleWith, value) => {
      clearTimeout(timer);
      client.off(responseEvent, onResponse);
      settleWith(value);
    };

    function onResponse(data) {
      logSocketResponse(responseEvent, data);
      const { result, error } = readResponse(data);
      if (error) settle(reject, error);
      else settle(resolve, result);
    }

    timer = setTimeout(() => settle(reject, socketError(`Timed out waiting for ${responseEvent}.`, 'timeout')), timeout);
    client.on(responseEvent, onResponse);
    if (payload === undefined) client.emit(event);
    else client.emit(event, payload);
  });
}
