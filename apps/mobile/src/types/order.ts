import type { BusinessHoursMap } from '../utils/businessHours';

export type OrderDetailData = {
  id: string;
  status: string;
  totalPrice: number | string;
  feeCents?: number;
  taxCents?: number;
  deliveryType: string;
  createdAt: string;
  restaurant: {
    name: string;
    address: string;
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    businessHours?: BusinessHoursMap;
  };
  items: {
    quantity: number;
    menuItem: { name: string };
    priceAtOrder: number | string;
  }[];
  deliveryAddress?: { street: string; city: string; postalCode: string } | null;
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
