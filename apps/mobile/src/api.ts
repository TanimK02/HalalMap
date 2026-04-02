import axios, { type AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'halal_map_token';
let onAuthInvalid: (() => void) | null = null;
let isHandlingAuthInvalid = false;

/** Matches /auth/login, auth/login, and absolute URLs — axios keeps a leading slash on relative paths. */
function isPublicAuthRequestUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('auth/login') || url.includes('auth/register');
}

api.interceptors.request.use(async (config) => {
  if (isPublicAuthRequestUrl(config.url)) {
    delete config.headers.Authorization;
    return config;
  }
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

async function handleAuthInvalid() {
  if (isHandlingAuthInvalid) return;
  isHandlingAuthInvalid = true;
  try {
    await setStoredToken(null);
    onAuthInvalid?.();
  } finally {
    isHandlingAuthInvalid = false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url as string | undefined;
    const shouldSkipGlobalLogout = isPublicAuthRequestUrl(url);
    const isAuthMeNotFound = status === 404 && typeof url === 'string' && url.includes('/auth/me');
    if (!shouldSkipGlobalLogout && (status === 401 || isAuthMeNotFound)) {
      await handleAuthInvalid();
    }
    return Promise.reject(error);
  }
);

export async function setStoredToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function setAuthInvalidHandler(handler: (() => void) | null) {
  onAuthInvalid = handler;
}

export function formatApiFormError(err: unknown, fallback: string, opts?: { skipUnauthorizedHint?: boolean }): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ error?: string; message?: string; errors?: Array<{ msg?: string }> }>;
    if (ax.code === 'ECONNABORTED' || /timeout/i.test(String(ax.message))) {
      return 'Could not reach the server. Check your network and EXPO_PUBLIC_API_URL (use your computer’s LAN IP on a physical device, not localhost).';
    }
    const data = ax.response?.data;
    if (data && typeof data === 'object') {
      if (data.error != null) return String(data.error);
      const first = data.errors?.[0]?.msg;
      if (first) return String(first);
      if (data.message != null) return String(data.message);
    }
    if (!opts?.skipUnauthorizedHint && ax.response?.status === 401) {
      return 'Invalid email or password';
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// Favorites (require auth)
export type FavoriteRestaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  offersPickup: boolean;
  offersDelivery: boolean;
  favoredAt?: string;
};

export async function getFavoriteRestaurants(): Promise<FavoriteRestaurant[]> {
  const { data } = await api.get<FavoriteRestaurant[]>('/users/favorites/restaurants');
  return data ?? [];
}

export async function addFavoriteRestaurant(restaurantId: string): Promise<void> {
  await api.post(`/users/favorites/restaurants/${restaurantId}`);
}

export async function removeFavoriteRestaurant(restaurantId: string): Promise<void> {
  await api.delete(`/users/favorites/restaurants/${restaurantId}`);
}
