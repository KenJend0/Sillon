import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

type ScrollNavContextType = {
  /** 0 = navbar pleine taille, 1 = navbar compacte. Piloté uniquement côté UI thread (worklets). */
  navCompact: SharedValue<number>;
  /**
   * Le swipe horizontal du TopTabs (changement d'onglet) et le swipe de carte sur /add
   * se disputent le même geste — sans coordination, le pager natif "gagne" trop souvent
   * et un swipe de carte change d'onglet à la place. AddQueueMobile désactive le swipe
   * d'onglet pendant la durée de son propre geste (onBegin/onFinalize) via ce setter.
   */
  tabSwipeEnabled: boolean;
  setTabSwipeEnabled: (enabled: boolean) => void;
};

const ScrollNavContext = createContext<ScrollNavContextType | undefined>(undefined);

export function ScrollNavProvider({ children }: { children: ReactNode }) {
  const navCompact = useSharedValue(0);
  const [tabSwipeEnabled, setTabSwipeEnabled] = useState(true);
  const value = useMemo(() => ({ navCompact, tabSwipeEnabled, setTabSwipeEnabled }), [navCompact, tabSwipeEnabled]);

  return <ScrollNavContext.Provider value={value}>{children}</ScrollNavContext.Provider>;
}

export function useScrollNav() {
  const context = useContext(ScrollNavContext);
  if (!context) {
    throw new Error('useScrollNav must be used within a ScrollNavProvider');
  }
  return context;
}
