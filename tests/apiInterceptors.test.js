import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { Buffer } from 'node:buffer';
import { installSessionInterceptors } from '../src/services/apiInterceptors.js';

function token(email = 'user@example.test', suffix = 'old') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: Date.now() / 1000 + 3600, user_data: { email } })}.${suffix}`;
}

function unauthorized(config, code = 'expired_token') {
  return new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    status: 401, data: { code }, headers: {}, config,
  });
}

test('attaches the renewed token before sending the original request body', async () => {
  const refreshed = token();
  const client = axios.create({ adapter: async (config) => {
    assert.equal(config.headers.get('Authorization'), `Bearer ${refreshed}`);
    assert.deepEqual(JSON.parse(config.data), { message: 'hello' });
    return { status: 200, data: {}, headers: {}, config };
  } });
  installSessionInterceptors(client, { getValidToken: async () => refreshed });
  await client.post('/api/chat/query', { message: 'hello' });
});

test('retries a middleware rejection with a newer same-user token exactly once', async () => {
  const old = token();
  const fresh = token('user@example.test', 'fresh');
  let current = old;
  let attempts = 0;
  const client = axios.create({ adapter: async (config) => {
    attempts += 1;
    if (attempts === 1) {
      current = fresh;
      throw unauthorized(config);
    }
    assert.equal(config.headers.get('Authorization'), `Bearer ${fresh}`);
    return { status: 200, data: {}, headers: {}, config };
  } });
  installSessionInterceptors(client, {
    getValidToken: async () => current,
    getToken: () => current,
    rejectToken: () => assert.fail('New token must not be rejected'),
  });
  assert.equal((await client.post('/api/chat/query', { message: 'hello' })).status, 200);
  assert.equal(attempts, 2);
});

test('does not replay a business 401 or an action after a different user signs in', async () => {
  for (const [code, email] of [['business_error', 'user@example.test'], ['expired_token', 'other@example.test']]) {
    const old = token();
    let current = old;
    let attempts = 0;
    const rejected = [];
    const client = axios.create({ adapter: async (config) => {
      attempts += 1;
      current = token(email, 'fresh');
      throw unauthorized(config, code);
    } });
    installSessionInterceptors(client, {
      getValidToken: async () => current,
      getToken: () => current,
      rejectToken: (value) => rejected.push(value),
    });
    await assert.rejects(client.post('/api/action', {}));
    assert.equal(attempts, 1);
    assert.deepEqual(rejected, [old]);
  }
});

test('a second rejection ends the retry without a loop', async () => {
  let current = token();
  let attempts = 0;
  let rejected = 0;
  const client = axios.create({ adapter: async (config) => {
    attempts += 1;
    current = token('user@example.test', `attempt-${attempts}`);
    throw unauthorized(config);
  } });
  installSessionInterceptors(client, {
    getValidToken: async () => current,
    getToken: () => current,
    rejectToken: () => { rejected += 1; },
  });
  await assert.rejects(client.get('/api/action'));
  assert.equal(attempts, 2);
  assert.equal(rejected, 1);
});

test('network/server errors do not invalidate the session', async () => {
  const client = axios.create({ adapter: async () => { throw new Error('offline'); } });
  installSessionInterceptors(client, {
    getValidToken: async () => token(),
    rejectToken: () => assert.fail('Network failure must not sign out'),
  });
  await assert.rejects(client.get('/api/action'), /offline/);
});

test('a canceled session never sends a pending business request', async () => {
  const client = axios.create({ adapter: () => assert.fail('Must not send') });
  installSessionInterceptors(client, { getValidToken: async () => { throw new Error('Session changed'); } });
  await assert.rejects(client.get('/api/action'), /Session changed/);
});

test('a user change while preparing a retry never replays the previous user action', async () => {
  const old = token();
  const fresh = token('user@example.test', 'fresh');
  let reads = 0;
  let attempts = 0;
  const client = axios.create({ adapter: async (config) => {
    attempts += 1;
    throw unauthorized(config);
  } });
  installSessionInterceptors(client, {
    getValidToken: async () => ++reads === 1 ? old : token('other@example.test'),
    getToken: () => fresh,
    rejectToken: () => assert.fail('Must not reject the new session'),
  });
  await assert.rejects(client.post('/api/action', {}), { name: 'SessionChangedError' });
  assert.equal(attempts, 1);
});
