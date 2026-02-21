import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import axios from 'axios';

export default function Login() {
  const { token, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (token && !loading) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (axios.isAxiosError(err) && err.response?.data?.error) ||
        (err instanceof Error ? err.message : 'Login failed');
      setError(msg);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-primary">Halal Map — Restaurant</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-primary py-2 font-medium text-white hover:bg-primary/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
