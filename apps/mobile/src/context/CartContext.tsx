import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  addItem: (restaurantId: string, restaurantName: string, menuItemId: string, name: string, price: number, quantity?: number) => void;
  removeItem: (menuItemId: string, quantity?: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  const addItem = useCallback(
    (rid: string, rname: string, menuItemId: string, name: string, price: number, quantity = 1) => {
      setItems((prev) => {
        if (restaurantId && restaurantId !== rid) {
          setRestaurantId(rid);
          setRestaurantName(rname);
          return [{ menuItemId, name, price, quantity }];
        }
        const existing = prev.find((i) => i.menuItemId === menuItemId);
        const rest = prev.filter((i) => i.menuItemId !== menuItemId);
        const newQty = (existing?.quantity ?? 0) + quantity;
        if (newQty <= 0) return rest;
        return [...rest, { menuItemId, name, price, quantity: newQty }];
      });
      setRestaurantId(rid);
      setRestaurantName(rname);
    },
    [restaurantId]
  );

  const removeItem = useCallback((menuItemId: string, quantity = 1) => {
    setItems((prev) => {
      const item = prev.find((i) => i.menuItemId === menuItemId);
      if (!item) return prev;
      const newQty = item.quantity - quantity;
      if (newQty <= 0) {
        return prev.filter((i) => i.menuItemId !== menuItemId);
      }
      return prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i
      );
    });
  }, []);

  React.useEffect(() => {
    if (items.length === 0) {
      setRestaurantId(null);
      setRestaurantName(null);
    }
  }, [items.length]);

  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantName,
        addItem,
        removeItem,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
