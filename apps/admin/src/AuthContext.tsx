import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from './api';

type User = { id: string; name: string; email: string; role: string };

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.user?.role !== 'ADMIN') {
      throw new Error('Admin access only.');
    }
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('admin_token', data.token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('admin_token');
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => {
        if (r.data?.role !== 'ADMIN') logout();
        else setUser(r.data);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
