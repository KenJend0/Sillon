"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

type RatingFilterValue = {
  selectedRating: number | null;
  // Nombre total d'albums ayant cette note, connu via l'histogramme (qui a
  // déjà la distribution complète) — permet de savoir si le filtre affiché
  // côté client est déjà exhaustif, sans avoir à interroger le serveur.
  selectedCount: number | null;
  selectRating: (rating: number | null, count: number | null) => void;
};

const RatingFilterContext = createContext<RatingFilterValue | null>(null);

export function RatingFilterProvider({ children }: { children: ReactNode }) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  const selectRating = (rating: number | null, count: number | null) => {
    setSelectedRating(rating);
    setSelectedCount(rating === null ? null : count);
  };

  const value = useMemo(
    () => ({ selectedRating, selectedCount, selectRating }),
    [selectedRating, selectedCount]
  );
  return <RatingFilterContext.Provider value={value}>{children}</RatingFilterContext.Provider>;
}

export function useRatingFilter(): RatingFilterValue {
  const ctx = useContext(RatingFilterContext);
  return ctx ?? { selectedRating: null, selectedCount: null, selectRating: () => {} };
}
