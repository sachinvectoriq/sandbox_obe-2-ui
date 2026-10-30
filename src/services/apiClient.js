import axios from 'axios';
import { API_BASE, authSession } from './authSession';
import { installSessionInterceptors } from './apiInterceptors';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

installSessionInterceptors(apiClient, authSession);


export default apiClient;
