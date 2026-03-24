import { describe, expect, it } from 'vitest';
import {
  HALAL_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  type DeliveryType,
  type HalalStatus,
  type OrderStatus,
  type UserRole,
} from './types';

describe('shared type contracts', () => {
  it('exposes stable user roles', () => {
    const roles: UserRole[] = ['CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN'];
    expect(roles).toEqual(['CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN']);
  });

  it('exposes stable delivery types', () => {
    const types: DeliveryType[] = ['PICKUP', 'DELIVERY'];
    expect(types).toEqual(['PICKUP', 'DELIVERY']);
  });

  it('keeps halal status labels in sync', () => {
    const keys = Object.keys(HALAL_STATUS_LABELS) as HalalStatus[];
    expect(keys.sort()).toEqual(['CERTIFIED_HALAL', 'HALAL_FRIENDLY', 'MUSLIM_OWNED']);
    expect(HALAL_STATUS_LABELS.CERTIFIED_HALAL).toBe('Certified Halal');
  });

  it('keeps order status labels in sync', () => {
    const keys = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
    expect(keys).toEqual(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']);
    expect(ORDER_STATUS_LABELS.CANCELLED).toBe('Cancelled');
  });
});
