import axios from 'axios';
import { createTokenSession } from './tokenSession';

export const API_BASE = import.meta.env.VITE_API
  || 'https://app-azuresearch-qa-evolve.azurewebsites.net';

// Separate transport prevents renewal from recursively entering API interceptors.
const renewalClient = axios.create({ baseURL: API_BASE, timeout: 15000 });

export const authSession = createTokenSession({
  storage: localStorage,
  windowTarget: window,
  documentTarget: document,
  renew: async (token, signal) => {
    const response = await renewalClient.post('/api/auth/refresh', null, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    return response.data.access_token;
  },
  onExpired: () => {
    localStorage.clear();
    window.location.assign('/');
  },
});
