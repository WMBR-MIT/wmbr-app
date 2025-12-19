import React, { useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { debugError } from '@utils/Debug';

type FavoritesContextValue = {
  favoriteShows: string[];
  favoriteShowToggle: (showId: string) => Promise<void>;
  isFavoriteShow: (showId: string) => boolean;
};

const FavoritesContext = React.createContext<FavoritesContextValue | undefined>(
  undefined,
);

export const FavoritesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [favoriteShows, setFavoriteShows] = useState<string[]>([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem('shows');

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setFavoriteShows(parsed);
              return;
            }
          } catch (error) {
            debugError('Error parsing favorite shows from storage:', error);
          }
        }

        setFavoriteShows([]);
      } catch (error) {
        debugError('Error loading favorite shows from storage:', error);
        setFavoriteShows([]);
      }
    };

    fetchFavorites();
  }, []);

  const favoriteShowToggle = useCallback(async (showId: string) => {
    try {
      const data = await AsyncStorage.getItem('shows');
      const stored = JSON.parse(data || '[]') as string[];

      const newValue = stored.includes(showId)
        ? stored.filter(id => id !== showId)
        : [...stored, showId];

      await AsyncStorage.setItem('shows', JSON.stringify(newValue));

      // Update local state so consumers re-render
      setFavoriteShows(newValue);
    } catch (error) {
      debugError('Error toggling favorite show:', error);
    }
  }, []);

  const isFavoriteShow = useCallback(
    (showId: string) => favoriteShows.includes(showId),
    [favoriteShows],
  );

  return (
    <FavoritesContext.Provider
      value={{ favoriteShows, favoriteShowToggle, isFavoriteShow }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export default function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx)
    throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
