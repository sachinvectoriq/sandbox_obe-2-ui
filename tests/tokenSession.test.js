import test from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { createTokenSession, tokenExpiry, SessionChangedError } from '../src/services/tokenSession.js';

function token(expiryMs, email = 'person@example.test', suffix = 'test') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    exp: expiryMs / 1000, user_data: { email: [email], group: 'user' },
  })}.${suffix}`;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fixture({ remaining = 3600000, renew } = {}) {
  let clock = 1800000000000;
  let nextId = 0;
  const timers = new Map();
  const saved = new Map([['token', token(clock + remaining)]]);
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  };
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  documentTarget.visibilityState = 'visible';
  let calls = 0;
  let expired = 0;
  const session = createTokenSession({
    storage, windowTarget, documentTarget,
    now: () => clock,
    setTimer: (fn, delay) => {
      const id = ++nextId;
      timers.set(id, { fn, at: clock + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    renew: (old, signal) => {
      calls += 1;
      return renew ? renew(old, signal, clock) : Promise.resolve(token(clock + 3600000));
    },
    onExpired: () => { expired += 1; },
  });
  session.start();
  return {
    session, storage, windowTarget, documentTarget, timers,
    calls: () => calls,
    expired: () => expired,
    now: () => clock,
    advance: (ms) => { clock += ms; },
    async fireTimer() {
      const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      clock = Math.max(clock, timer.at);
      timers.delete(id);
      timer.fn();
      // Wait for the scheduled operation, including its async catch/finally.
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    },
  };
}

test('refreshes five minutes before expiry and repeats across many hours', async () => {
  const f = fixture();
  const first = f.session.getToken();
  assert.equal([...f.timers.values()][0].at, f.now() + 55 * 60000);
  for (let i = 1; i <= 12; i += 1) {
    await f.fireTimer();
    assert.equal(f.calls(), i);
    assert.equal(tokenExpiry(f.session.getToken()), f.now() + 3600000);
    assert.equal(f.timers.size, 1);
  }
  assert.notEqual(f.session.getToken(), first);
  assert.equal(f.expired(), 0);
  f.session.stop();
});

test('concurrent API requests share exactly one renewal', async () => {
  const renewal = deferred();
  const f = fixture({ remaining: 60000, renew: () => renewal.promise });
  const requests = Array.from({ length: 20 }, () => f.session.getValidToken());
  assert.equal(f.calls(), 1);
  const fresh = token(f.now() + 3600000);
  renewal.resolve(fresh);
  assert.deepEqual(await Promise.all(requests), Array(20).fill(fresh));
  assert.equal(f.storage.getItem('token'), fresh);
  f.session.stop();
});

test('logout aborts renewal and a late response cannot restore a token', async () => {
  const renewal = deferred();
  let signal;
  const f = fixture({ remaining: 60000, renew: (_, requestSignal) => { signal = requestSignal; return renewal.promise; } });
  const request = f.session.getValidToken();
  f.session.clear();
  assert.equal(signal.aborted, true);
  assert.equal(f.timers.size, 0);
  renewal.resolve(token(f.now() + 3600000));
  await assert.rejects(request, SessionChangedError);
  assert.equal(f.storage.getItem('token'), null);
  assert.equal(f.session.getToken(), null);
  assert.equal(await f.session.getValidToken(), null);
  assert.equal(f.calls(), 1);
  f.session.stop();
});

test('another tab logout is respected even before the storage event arrives', async () => {
  const renewal = deferred();
  const f = fixture({ remaining: 60000, renew: () => renewal.promise });
  const request = f.session.getValidToken();
  f.storage.removeItem('token');
  renewal.resolve(token(f.now() + 3600000));
  await assert.rejects(request, SessionChangedError);
  assert.equal(f.storage.getItem('token'), null);
  assert.equal(f.timers.size, 0);
  f.session.stop();
});

test('a late renewal cannot replace a new login or run its pending action as another user', async () => {
  const renewal = deferred();
  const f = fixture({ remaining: 60000, renew: () => renewal.promise });
  const request = f.session.getValidToken();
  f.session.clear();
  const newUser = token(f.now() + 3600000, 'other@example.test');
  f.session.setToken(newUser);
  renewal.resolve(token(f.now() + 3600000));
  await assert.rejects(request, SessionChangedError);
  assert.equal(f.storage.getItem('token'), newUser);
  f.session.stop();
});

test('adopts a newer same-user token from another tab without overwriting it', async () => {
  const renewal = deferred();
  const f = fixture({ remaining: 60000, renew: () => renewal.promise });
  const request = f.session.getValidToken();
  const newer = token(f.now() + 3700000);
  f.storage.setItem('token', newer);
  renewal.resolve(token(f.now() + 3600000));
  assert.equal(await request, newer);
  assert.equal(f.session.getToken(), newer);
  f.session.stop();
});

test('temporary failure keeps the valid token and applies retry backoff', async () => {
  const f = fixture({ remaining: 60000, renew: () => Promise.reject(new Error('offline')) });
  const old = f.session.getToken();
  assert.equal(await f.session.getValidToken(), old);
  assert.equal(f.expired(), 0);
  assert.equal([...f.timers.values()][0].at, f.now() + 15000);
  assert.equal(await f.session.getValidToken(), old);
  assert.equal(f.calls(), 1);
  await f.fireTimer();
  assert.equal(f.calls(), 2);
  f.session.stop();
});

test('server auth rejection clears the token and does not retry forever', async () => {
  const rejection = Object.assign(new Error('rejected'), { response: { status: 401 } });
  const f = fixture({ remaining: 60000, renew: () => Promise.reject(rejection) });
  await assert.rejects(f.session.getValidToken(), /rejected/);
  assert.equal(f.session.getToken(), null);
  assert.equal(f.expired(), 1);
  assert.equal(f.timers.size, 0);
  assert.equal(await f.session.getValidToken(), null);
  f.session.stop();
});

test('already-expired tokens are never offered for renewal', async () => {
  const f = fixture({ remaining: -1000 });
  await assert.rejects(f.session.getValidToken(), /expired/);
  assert.equal(f.calls(), 0);
  assert.equal(f.expired(), 1);
  f.session.stop();
});

test('a token expiring while offline ends the session rather than extending itself', async () => {
  const renewal = deferred();
  const f = fixture({ remaining: 1000, renew: () => renewal.promise });
  const request = f.session.getValidToken();
  f.advance(2000);
  renewal.reject(new Error('offline'));
  await assert.rejects(request, /offline/);
  assert.equal(f.expired(), 1);
  assert.equal(f.storage.getItem('token'), null);
  f.session.stop();
});

test('invalid or wrong-user renewal responses cannot replace the stored token', async () => {
  for (const renew of [() => Promise.resolve('malformed'), (_, __, now) => Promise.resolve(token(now + 3600000, 'other@example.test'))]) {
    const f = fixture({ remaining: 60000, renew });
    const old = f.session.getToken();
    assert.equal(await f.session.getValidToken(), old);
    assert.equal(f.session.getToken(), old);
    assert.equal(f.calls(), 1);
    f.session.stop();
  }
});

test('storage/focus/online/visibility events reschedule and cleanup correctly', async () => {
  const f = fixture();
  const changes = [];
  f.session.subscribe((value) => changes.push(value));
  f.session.start();
  assert.equal(f.timers.size, 1);
  f.advance(56 * 60000);
  f.windowTarget.dispatchEvent(new Event('focus'));
  f.windowTarget.dispatchEvent(new Event('online'));
  f.documentTarget.dispatchEvent(new Event('visibilitychange'));
  await f.session.getValidToken();
  assert.equal(f.calls(), 1);
  assert.equal(changes.length, 1);
  f.storage.removeItem('token');
  const storageEvent = new Event('storage');
  Object.defineProperty(storageEvent, 'key', { value: 'token' });
  f.windowTarget.dispatchEvent(storageEvent);
  assert.equal(changes.at(-1), null);
  assert.equal(f.timers.size, 0);
  f.session.stop();
  f.windowTarget.dispatchEvent(new Event('focus'));
  assert.equal(f.calls(), 1);
});

test('late 401 for an old token does not clear a refreshed token', () => {
  const f = fixture();
  const old = f.session.getToken();
  const next = token(f.now() + 3700000);
  f.session.setToken(next);
  f.session.rejectToken(old);
  assert.equal(f.session.getToken(), next);
  assert.equal(f.expired(), 0);
  f.session.rejectToken(next);
  assert.equal(f.session.getToken(), null);
  assert.equal(f.expired(), 1);
  f.session.stop();
});
