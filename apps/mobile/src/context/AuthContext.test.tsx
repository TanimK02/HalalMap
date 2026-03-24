import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import { api, getStoredToken, setStoredToken } from '../api';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
  getStoredToken: jest.fn(),
  setStoredToken: jest.fn(),
  setAuthInvalidHandler: jest.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getStoredToken as jest.Mock).mockResolvedValue(null);
  });

  it('logs in and persists token', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1', name: 'User', email: 'u@e.com', role: 'CUSTOMER' }, token: 't1' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('u@e.com', 'password123');
    });

    expect(result.current.user?.id).toBe('u1');
    expect(result.current.token).toBe('t1');
    expect(setStoredToken).toHaveBeenCalledWith('t1');
  });

  it('restores user from /auth/me when token exists', async () => {
    (getStoredToken as jest.Mock).mockResolvedValue('stored-token');
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 'u2', name: 'Existing', email: 'e@e.com', role: 'CUSTOMER' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.token).toBe('stored-token');
    expect(result.current.user?.id).toBe('u2');
  });
});
