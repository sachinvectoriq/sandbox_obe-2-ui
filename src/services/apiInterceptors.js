import { SessionChangedError, tokenExpiry, tokenIdentity } from './tokenSession.js';

const AUTH_REJECTION_CODES = new Set(['missing_token', 'expired_token', 'invalid_token']);

export function installSessionInterceptors(client, session) {
  client.interceptors.request.use(async (config) => {
    const token = await session.getValidToken();
    if (config._kaAuthRetried
      && (!token || tokenIdentity(token) !== tokenIdentity(config._kaTokenUsed))) {
      throw new SessionChangedError();
    }
    config.headers.set('Authorization', token ? `Bearer ${token}` : undefined);
    config._kaTokenUsed = token;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (error.response?.status !== 401 || !config) throw error;

      const current = session.getToken();
      const sent = config._kaTokenUsed;
      // Retry only an authentication-layer rejection, before any business action
      // ran, and only if the same user already has a newer valid token.
      if (!config._kaAuthRetried && sent && current && current !== sent
        && tokenIdentity(current) && tokenIdentity(current) === tokenIdentity(sent)
        && tokenExpiry(current) > Date.now()
        && AUTH_REJECTION_CODES.has(error.response.data?.code)) {
        config._kaAuthRetried = true;
        return client.request(config);
      }
      session.rejectToken(sent);
      throw error;
    },
  );
}
