import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function isBackendOnline(): Promise<boolean> {
  try {
    await api.post('/api/auth/login', { username: '__ping__', password: '__ping__' }, { timeout: 3000 });
    return true;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) return true;
    return false;
  }
}
