import axios from 'axios';

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API || 'https://app-ocm20-obe-dev-001-dgd8hbbyeyc2d2fv.eastus2-01.azurewebsites.net//',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
});

export default apiClient;
