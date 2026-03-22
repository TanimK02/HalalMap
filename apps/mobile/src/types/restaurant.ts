import type { BusinessHoursMap } from '../utils/businessHours';

export type RestaurantTag = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
};

/** Restaurant list item (e.g. Home screen). */
export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  tags?: RestaurantTag[];
  businessHours?: BusinessHoursMap;
  offersPickup: boolean;
  offersDelivery: boolean;
  distanceMiles?: number;
};

/** Address from API with coordinates (e.g. for default location). */
export type AddressWithCoords = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

/** Menu item within a category (RestaurantDetail). */
export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  availableForPickup?: boolean;
  availableForDelivery?: boolean;
};

/** Menu category with items (RestaurantDetail). */
export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

/** Full restaurant detail (single restaurant screen). */
export type RestaurantDetailData = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  halalStatuses: string[];
  tags?: RestaurantTag[];
  businessHours?: BusinessHoursMap;
  menuCategories: MenuCategory[];
};
