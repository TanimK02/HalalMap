import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
};

type CartAction =
  | {
      type: 'ADD_ITEM';
      rid: string;
      rname: string;
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
    }
  | { type: 'REMOVE_ITEM'; menuItemId: string; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { rid, rname, menuItemId, name, price, quantity } = action;
      const { restaurantId, items } = state;
      if (restaurantId != null && restaurantId !== rid) {
        return {
          restaurantId: rid,
          restaurantName: rname,
          items: [{ menuItemId, name, price, quantity }],
        };
      }
      const existing = items.find((i) => i.menuItemId === menuItemId);
      const rest = items.filter((i) => i.menuItemId !== menuItemId);
      const newQty = (existing?.quantity ?? 0) + quantity;
      if (newQty <= 0) {
        const newItems = rest;
        return {
          restaurantId: newItems.length === 0 ? null : state.restaurantId,
          restaurantName: newItems.length === 0 ? null : state.restaurantName,
          items: newItems,
        };
      }
      return {
        restaurantId: rid,
        restaurantName: rname,
        items: [...rest, { menuItemId, name, price, quantity: newQty }],
      };
    }
    case 'REMOVE_ITEM': {
      const { menuItemId, quantity } = action;
      const { items } = state;
      const item = items.find((i) => i.menuItemId === menuItemId);
      if (!item) return state;
      const newQty = item.quantity - quantity;
      let newItems: CartItem[];
      if (newQty <= 0) {
        newItems = items.filter((i) => i.menuItemId !== menuItemId);
      } else {
        newItems = items.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i
        );
      }
      return {
        ...state,
        items: newItems,
        restaurantId: newItems.length === 0 ? null : state.restaurantId,
        restaurantName: newItems.length === 0 ? null : state.restaurantName,
      };
    }
    case 'CLEAR':
      return { restaurantId: null, restaurantName: null, items: [] };
    default:
      return state;
  }
}

const initialCartState: CartState = { restaurantId: null, restaurantName: null, items: [] };

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
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  const addItem = useCallback(
    (rid: string, rname: string, menuItemId: string, name: string, price: number, quantity = 1) => {
      dispatch({ type: 'ADD_ITEM', rid, rname, menuItemId, name, price, quantity });
    },
    []
  );

  const removeItem = useCallback((menuItemId: string, quantity = 1) => {
    dispatch({ type: 'REMOVE_ITEM', menuItemId, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
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
