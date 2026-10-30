import { jwtDecode } from 'jwt-decode';

export function tokenExpiry(token) {
  try {
    const { exp } = jwtDecode(token);
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function tokenIdentity(token) {
  try {
    const email = jwtDecode(token).user_data?.email;
    const value = Array.isArray(email) ? email[0] : email;
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super('The signed-in session changed.');
    this.name = 'SessionChangedError';
  }
}

// Decoding here only schedules renewal; signature/identity validation is backend-only.
export function createTokenSession({
  storage,
  renew,
  onExpired = () => {},
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  windowTarget = null,
  documentTarget = null,
  refreshBeforeMs = 5 * 60 * 1000,
  retryMs = 15 * 1000,
}) {
  let currentToken = storage.getItem('token') || null;
  let generation = 0;
  let started = false;
  let timer = null;
  let pending = null;
  let retryAt = 0;
  const listeners = new Set();

  function cancelTimer() {
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  function invalidatePending() {
    generation += 1;
    pending?.controller.abort();
    pending = null;
    retryAt = 0;
    cancelTimer();
  }

  function schedule() {
    cancelTimer();
    if (!started || !currentToken) return;
    const expiry = tokenExpiry(currentToken);
    const due = retryAt > now() ? Math.min(retryAt, expiry) : expiry - refreshBeforeMs;
    timer = setTimer(() => {
      timer = null;
      getValidToken().catch(() => {});
    }, Math.min(2147483647, Math.max(0, due - now())));
  }

  function update(value, persist = true) {
    const changed = currentToken !== value;
    currentToken = value;
    if (persist) {
      if (value) storage.setItem('token', value);
      else storage.removeItem('token');
    }
    if (changed) listeners.forEach((listener) => listener(value));
    schedule();
  }

  function syncFromStorage() {
    const stored = storage.getItem('token') || null;
    if (stored === currentToken) return;
    const sameUser = stored && currentToken && tokenIdentity(stored)
      && tokenIdentity(stored) === tokenIdentity(currentToken);
    if (!sameUser) invalidatePending();
    retryAt = 0;
    update(stored, false);
  }

  function setToken(value) {
    if (value === currentToken && storage.getItem('token') === value) return;
    invalidatePending();
    update(value || null);
  }

  function clear() {
    invalidatePending();
    update(null);
  }

  function expire() {
    const hadToken = Boolean(currentToken);
    clear();
    if (hadToken) onExpired();
  }

  function changedSessionResult(expectedGeneration, originalToken) {
    syncFromStorage();
    if (generation === expectedGeneration && currentToken
      && tokenIdentity(currentToken) === tokenIdentity(originalToken)
      && tokenExpiry(currentToken) > now()) {
      return currentToken;
    }
    throw new SessionChangedError();
  }

  async function getValidToken() {
    syncFromStorage();
    if (!currentToken) return null;
    const expiry = tokenExpiry(currentToken);
    if (expiry <= now()) {
      expire();
      throw new Error('Session token expired; sign in again.');
    }
    if (expiry - now() > refreshBeforeMs || retryAt > now()) return currentToken;
    if (pending) return pending.promise;

    const originalToken = currentToken;
    const expectedGeneration = generation;
    const controller = new AbortController();
    const operation = (async () => {
      try {
        const refreshed = await renew(originalToken, controller.signal);
        if (generation !== expectedGeneration || storage.getItem('token') !== originalToken) {
          return changedSessionResult(expectedGeneration, originalToken);
        }
        if (!refreshed || tokenExpiry(refreshed) <= now() + refreshBeforeMs
          || !tokenIdentity(refreshed) || tokenIdentity(refreshed) !== tokenIdentity(originalToken)) {
          throw new Error('Invalid token renewal response.');
        }
        retryAt = 0;
        update(refreshed);
        return refreshed;
      } catch (error) {
        if (generation !== expectedGeneration || storage.getItem('token') !== originalToken) {
          return changedSessionResult(expectedGeneration, originalToken);
        }
        if (error.response?.status === 401 || error.response?.status === 403
          || tokenExpiry(originalToken) <= now()) {
          expire();
          throw error;
        }
        // A temporary network/server failure need not interrupt a still-valid session.
        retryAt = now() + retryMs;
        schedule();
        return originalToken;
      } finally {
        if (pending?.controller === controller) pending = null;
      }
    })();
    pending = { promise: operation, controller };
    return operation;
  }

  function wake() {
    getValidToken().catch(() => {});
  }

  function onVisibility() {
    if (documentTarget?.visibilityState === 'visible') wake();
  }

  function onStorage(event) {
    if (event.key === 'token' || event.key === null) {
      syncFromStorage();
      wake();
    }
  }

  return {
    getValidToken,
    setToken,
    clear,
    getToken() {
      syncFromStorage();
      return currentToken;
    },
    rejectToken(rejectedToken) {
      syncFromStorage();
      // A late 401 for an earlier token must not log out a newer session.
      if (rejectedToken && currentToken === rejectedToken) expire();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;
      started = true;
      syncFromStorage();
      schedule();
      windowTarget?.addEventListener('storage', onStorage);
      windowTarget?.addEventListener('focus', wake);
      windowTarget?.addEventListener('online', wake);
      documentTarget?.addEventListener('visibilitychange', onVisibility);
    },
    stop() {
      started = false;
      invalidatePending();
      windowTarget?.removeEventListener('storage', onStorage);
      windowTarget?.removeEventListener('focus', wake);
      windowTarget?.removeEventListener('online', wake);
      documentTarget?.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
