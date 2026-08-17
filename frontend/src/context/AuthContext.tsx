import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  fetchMe,
  getStoredToken,
  loginWithCredentials,
  loginWithGoogleEmail,
  persistSession,
} from '../api/auth';
import { setAuthToken } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  offline: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token) setAuthToken(token);
    fetchMe().then((stored) => {
      setUser(stored);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginWithCredentials(username, password);
    setAuthToken(result.token);
    persistSession(result.token, result.user);
    setUser(result.user);
    setOffline(result.offline);
  }, []);

  const loginWithGoogle = useCallback(async (email: string) => {
    const result = await loginWithGoogleEmail(email);
    setAuthToken(result.token);
    persistSession(result.token, result.user);
    setUser(result.user);
    setOffline(result.offline);
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    setAuthToken(null);
    setUser(null);
    setOffline(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, offline, login, loginWithGoogle, logout }),
    [user, loading, offline, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
