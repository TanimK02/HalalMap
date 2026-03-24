import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { api, getStoredToken, setAuthInvalidHandler, setStoredToken } from '../api';

type User = { id: string; name: string; email: string; role: string };

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    setToken(data.token);
    await setStoredToken(data.token);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, role: 'CUSTOMER' });
    setUser(data.user);
    setToken(data.token);
    await setStoredToken(data.token);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await setStoredToken(null);
  }, []);

  useEffect(() => {
    setAuthInvalidHandler(() => {
      setUser(null);
      setToken(null);
    });
    return () => setAuthInvalidHandler(null);
  }, []);

  useEffect(() => {
    getStoredToken().then((t) => {
      if (!t) {
        setLoading(false);
        return;
      }
      setToken(t);
      api
        .get('/auth/me')
        .then((r) => setUser(r.data))
        .catch((error) => {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          // Only clear local auth state here for auth-invalid responses.
          // Other failures (e.g. transient network issues) should not force logout.
          if (status === 401 || status === 404) {
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => setLoading(false));

    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
