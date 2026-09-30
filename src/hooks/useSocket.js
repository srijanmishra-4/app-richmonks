import { useEffect, useRef, useState } from 'react';

import { getSocketState, onSocketEvent, onSocketState } from '@/utils/socket';

/**
 * Subscribe to one server event over the shared socket. The handler is read through a
 * ref, so passing an inline callback does not re-subscribe on every rerender and the
 * event can never end up with duplicate listeners. Unsubscribes on unmount, or when
 * `event` changes or `enabled` turns false, without touching other consumers.
 *
 * The handler is called as `(result, error)` with the payload already unwrapped.
 */
export function useSocketEvent(event, handler, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!event || !enabled) return undefined;
    return onSocketEvent(event, (result, error) => handlerRef.current?.(result, error));
  }, [event, enabled]);
}

// Current connection state as `{ status, error }`, where status is
// 'idle' | 'connecting' | 'connected' | 'disconnected'.
export function useSocketState() {
  const [state, setState] = useState(getSocketState);

  useEffect(() => {
    setState(getSocketState());
    return onSocketState(setState);
  }, []);

  return state;
}
