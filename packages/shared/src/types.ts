export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN';

export type HalalStatus =
  | 'CERTIFIED_HALAL'
  | 'MUSLIM_OWNED'
  | 'HALAL_FRIENDLY';

/** Restaurant halal statuses are stored and sent as an array (multiple statuses per restaurant). */
export type HalalStatusList = HalalStatus[];

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryType = 'PICKUP' | 'DELIVERY';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const HALAL_STATUS_LABELS: Record<HalalStatus, string> = {
  CERTIFIED_HALAL: 'Certified Halal',
  MUSLIM_OWNED: 'Muslim-Owned',
  HALAL_FRIENDLY: 'Halal-Friendly',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
