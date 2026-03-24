import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'halal_map_token';
let onAuthInvalid: (() => void) | null = null;
let isHandlingAuthInvalid = false;

api.interceptors.request.use(async (config) => {
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
    const isAuthLoginRequest = typeof url === 'string' && url.includes('/auth/login');
    const isAuthRegisterRequest = typeof url === 'string' && url.includes('/auth/register');
    const shouldSkipGlobalLogout = isAuthLoginRequest || isAuthRegisterRequest;
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
