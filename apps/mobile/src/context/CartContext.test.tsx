import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CartProvider, useCart } from './CartContext';

describe('CartContext', () => {
  it('adds items and computes total', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem('r1', 'R1', 'm1', 'Burger', 10, 2);
    });

    expect(result.current.total).toBe(20);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.restaurantId).toBe('r1');
  });

  it('tracks active restaurant and includes newly added item', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem('r1', 'R1', 'm1', 'Burger', 10, 1);
      result.current.addItem('r2', 'R2', 'm2', 'Pizza', 8, 1);
    });

    expect(result.current.restaurantId).toBe('r2');
    expect(result.current.items.some((i) => i.menuItemId === 'm2')).toBe(true);
  });
});
