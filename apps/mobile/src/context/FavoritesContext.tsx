import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getFavoriteRestaurants,
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  type FavoriteRestaurant,
} from '../api';

type FavoritesContextType = {
  favoriteRestaurants: FavoriteRestaurant[];
  favoriteIds: Set<string>;
  isFavorited: (restaurantId: string) => boolean;
  loadFavorites: () => Promise<void>;
  addFavorite: (restaurantId: string) => Promise<void>;
  removeFavorite: (restaurantId: string) => Promise<void>;
  loading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(false);

  const favoriteIds = React.useMemo(
    () => new Set(favoriteRestaurants.map((r) => r.id)),
    [favoriteRestaurants]
  );

  const loadFavorites = useCallback(async () => {
    if (!token) {
      setFavoriteRestaurants([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getFavoriteRestaurants();
      setFavoriteRestaurants(list);
    } catch {
      setFavoriteRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorited = useCallback(
    (restaurantId: string) => favoriteRestaurants.some((r) => r.id === restaurantId),
    [favoriteRestaurants]
  );

  const addFavorite = useCallback(
    async (restaurantId: string) => {
      if (!token) return;
      try {
        await addFavoriteRestaurant(restaurantId);
        await loadFavorites();
      } catch {
        // leave state unchanged
      }
    },
    [token, loadFavorites]
  );

  const removeFavorite = useCallback(
    async (restaurantId: string) => {
      if (!token) return;
      try {
        await removeFavoriteRestaurant(restaurantId);
        setFavoriteRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      } catch {
        await loadFavorites();
      }
    },
    [token, loadFavorites]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteRestaurants,
        favoriteIds,
        isFavorited,
        loadFavorites,
        addFavorite,
        removeFavorite,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
