import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('restaurant_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('restaurant_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export type DayHours = { open?: string; close?: string };
export type BusinessHoursMap = Record<string, DayHours>;

export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string;
  halalStatuses: string[];
  certificateUrl: string | null;
  certificateExpiresAt: string | null;
  approved: boolean;
  businessHours: BusinessHoursMap | null;
  offersPickup: boolean;
  offersDelivery: boolean;
  pickupFeeType: string | null;
  pickupFeeValue: number | null;
  deliveryFeeType: string | null;
  deliveryFeeValue: number | null;
  stripeConnectAccountId?: string | null;
  stripeConnectStatus?: 'UNINITIALIZED' | 'ONBOARDING' | 'ACTIVE' | 'RESTRICTED' | 'DISABLED';
  stripeConnectRequirements?: Record<string, unknown> | null;
  stripeConnectLastSyncedAt?: string | null;
  menuCategories?: MenuCategory[];
};

export type FeeStructure =
  | { type: 'flat'; valueCents: number }
  | { type: 'percent'; valuePercent: number };

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items?: MenuItem[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  availableForPickup: boolean;
  availableForDelivery: boolean;
  sortOrder: number;
};

export type Order = {
  id: string;
  status: string;
  totalPrice: number | string;
  deliveryType: string;
  createdAt: string;
  user?: { id: string; name: string };
  items: { quantity: number; menuItem: MenuItem; priceAtOrder: number | string }[];
  deliveryAddress?: { street: string; city: string; postalCode: string } | null;
};
