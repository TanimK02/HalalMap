import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('restaurant_token'));
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const { api } = await import('./api');
    const { data } = await api.post('/auth/login', { email, password });
    if (data.user?.role !== 'RESTAURANT_OWNER') {
      throw new Error('Access denied. Restaurant owner account required.');
    }
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('restaurant_token', data.token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('restaurant_token');
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    import('./api').then(({ api }) => {
      api
        .get('/auth/me')
        .then((r) => {
          if (cancelled) return;
          if (r.data?.role !== 'RESTAURANT_OWNER') logout();
          else setUser(r.data);
        })
        .catch(() => !cancelled && logout())
        .finally(() => !cancelled && setLoading(false));
    });
    return () => { cancelled = true; };
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
