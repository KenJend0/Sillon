import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

type ScrollNavContextType = {
  /** 0 = navbar pleine taille, 1 = navbar compacte. Piloté uniquement côté UI thread (worklets). */
  navCompact: SharedValue<number>;
};

const ScrollNavContext = createContext<ScrollNavContextType | undefined>(undefined);

export function ScrollNavProvider({ children }: { children: ReactNode }) {
  const navCompact = useSharedValue(0);
  const value = useMemo(() => ({ navCompact }), [navCompact]);

  return <ScrollNavContext.Provider value={value}>{children}</ScrollNavContext.Provider>;
}

export function useScrollNav() {
  const context = useContext(ScrollNavContext);
  if (!context) {
    throw new Error('useScrollNav must be used within a ScrollNavProvider');
  }
  return context;
}
