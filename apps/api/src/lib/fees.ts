import type { DeliveryType } from '@halal-map/shared';

export type FeeStructure =
  | { type: 'flat'; valueCents: number }
  | { type: 'percent'; valuePercent: number };

type RestaurantFeeFields = {
  pickupFeeType: string | null;
  pickupFeeValue: number | null;
  deliveryFeeType: string | null;
  deliveryFeeValue: number | null;
};

function getDefaultFeeType(deliveryType: DeliveryType): 'flat' | 'percent' {
  const key =
    deliveryType === 'PICKUP' ? 'DEFAULT_PICKUP_FEE_TYPE' : 'DEFAULT_DELIVERY_FEE_TYPE';
  const raw = process.env[key];
  if (raw === 'percent') return 'percent';
  return 'flat';
}

function getDefaultFeeValue(deliveryType: DeliveryType): number {
  const key =
    deliveryType === 'PICKUP' ? 'DEFAULT_PICKUP_FEE_VALUE' : 'DEFAULT_DELIVERY_FEE_VALUE';
  const raw = process.env[key];
  if (raw == null || raw === '') return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Effective fee structure (flat or percent) for a restaurant and delivery type.
 * Used by GET /restaurants/:id so the client can compute fee for current cart subtotal.
 */
export function getEffectiveFeeStructure(
  restaurant: RestaurantFeeFields,
  deliveryType: DeliveryType
): FeeStructure {
  const isPickup = deliveryType === 'PICKUP';
  const type = isPickup ? restaurant.pickupFeeType : restaurant.deliveryFeeType;
  const value = isPickup ? restaurant.pickupFeeValue : restaurant.deliveryFeeValue;

  if (type === 'PERCENT' && value != null && value >= 0) {
    return { type: 'percent', valuePercent: value };
  }
  if (type === 'FLAT' && value != null && value >= 0) {
    return { type: 'flat', valueCents: value };
  }
  const defaultType = getDefaultFeeType(deliveryType);
  const defaultValue = getDefaultFeeValue(deliveryType);
  if (defaultType === 'percent') return { type: 'percent', valuePercent: defaultValue };
  return { type: 'flat', valueCents: defaultValue };
}

/**
 * Compute fee in cents from subtotal (in cents) and effective fee structure.
 */
export function computeFeeCents(subtotalCents: number, structure: FeeStructure): number {
  if (structure.type === 'flat') return structure.valueCents;
  return Math.round((subtotalCents * structure.valuePercent) / 100);
}

/**
 * Get effective fee in cents for a given restaurant, delivery type, and subtotal (in cents).
 */
export function getEffectiveFeeCents(
  restaurant: RestaurantFeeFields,
  deliveryType: DeliveryType,
  subtotalCents: number
): number {
  const structure = getEffectiveFeeStructure(restaurant, deliveryType);
  return computeFeeCents(subtotalCents, structure);
}

function parsePlatformFeeEnv(key: string): number {
  const raw = process.env[key];
  if (raw == null || raw === '') return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Platform fee in cents from env config (flat + percent of subtotal). Used for reporting and future Connect application_fee.
 */
export function getPlatformFeeCents(subtotalCents: number): number {
  const flat = parsePlatformFeeEnv('PLATFORM_FEE_FLAT_CENTS');
  const percent = parsePlatformFeeEnv('PLATFORM_FEE_PERCENT');
  const percentCents = Math.round((subtotalCents * percent) / 100);
  return Math.max(0, flat + percentCents);
}
