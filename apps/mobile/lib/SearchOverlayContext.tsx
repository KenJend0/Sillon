import { createContext, useContext, useState, type ReactNode } from 'react';

// Permet au SearchOverlayHost (monté une seule fois dans app/(tabs)/_layout.tsx, en
// sibling de BottomNav) d'être ouvert depuis n'importe quel écran d'onglet (ex: le
// bouton déclencheur dans explore/index.tsx) sans passer par un vrai <Modal> natif —
// un <Modal> RN recouvre toute la fenêtre, y compris BottomNav (qui est du JS, pas
// une vraie tab bar native), ce qui la rendait inaccessible pendant la recherche.
type SearchOverlayContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SearchOverlayContext = createContext<SearchOverlayContextType | undefined>(undefined);

export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SearchOverlayContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </SearchOverlayContext.Provider>
  );
}

export function useSearchOverlay() {
  const ctx = useContext(SearchOverlayContext);
  if (!ctx) throw new Error('useSearchOverlay doit être utilisé à l\'intérieur de SearchOverlayProvider');
  return ctx;
}
