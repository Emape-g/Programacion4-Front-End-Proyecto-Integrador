import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { TokenResponse } from '../types/store';

const rawBaseURL = import.meta.env.VITE_API_URL ?? '/api/v1';
const baseURL = rawBaseURL.replace(/\/+$/, '');

const apiClient = axios.create({ baseURL, withCredentials: true });
const refreshClient = axios.create({ baseURL, withCredentials: true });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retry || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      refreshPromise ??= refreshClient
        .post<TokenResponse>('/auth/refresh')
        .then((response) => {
          useAuthStore.getState().setAccessToken(response.data.access_token);
          return response.data.access_token;
        })
        .finally(() => {
          refreshPromise = null;
        });
      const token = await refreshPromise;
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch {
      useAuthStore.getState().clearSession();
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.assign('/login');
      }
      return Promise.reject(error);
    }
  },
);

export default apiClient;
