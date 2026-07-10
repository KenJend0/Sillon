import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type RatingFilterValue = {
  /** Index 0..9 (note réelle = selectedRating + 1), ou null si aucun filtre actif. */
  selectedRating: number | null;
  /** Nombre total d'entrées ayant cette note, connu via l'histogramme — permet de savoir
   *  si ce qui est déjà chargé côté client est déjà exhaustif, sans re-requêter le serveur. */
  selectedCount: number | null;
  selectRating: (rating: number | null, count: number | null) => void;
};

const RatingFilterContext = createContext<RatingFilterValue | null>(null);

/** Miroir de RatingFilterContext (web) — relie l'histogramme des notes au Journal/Critiques. */
export function RatingFilterProvider({ children }: { children: ReactNode }) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  const selectRating = (rating: number | null, count: number | null) => {
    setSelectedRating(rating);
    setSelectedCount(rating === null ? null : count);
  };

  const value = useMemo(() => ({ selectedRating, selectedCount, selectRating }), [selectedRating, selectedCount]);
  return <RatingFilterContext.Provider value={value}>{children}</RatingFilterContext.Provider>;
}

export function useRatingFilter(): RatingFilterValue {
  const ctx = useContext(RatingFilterContext);
  return ctx ?? { selectedRating: null, selectedCount: null, selectRating: () => {} };
}
