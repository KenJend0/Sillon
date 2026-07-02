import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { useScrollNav } from './ScrollNavContext';

// Mêmes seuils que la version web (useScrollNavState) : la navbar ne se
// compacte que sur un scroll vers le bas franchissant COMPACT_AFTER_Y, et se
// réétend dès qu'on remonte ou qu'on est proche du haut — pas juste "au-delà
// d'un offset", pour éviter qu'elle reste compacte sur un petit scroll lent.
const SCROLL_THRESHOLD = 16;
const TOP_OFFSET = 24;
const COMPACT_AFTER_Y = 80;

export function useNavScrollHandler() {
  const { navCompact } = useScrollNav();
  const lastY = useSharedValue(0);

  // Repart d'une navbar pleine taille à chaque focus de l'onglet — évite
  // qu'elle reste figée compacte en arrivant sur un écran qui n'a pas encore
  // reçu d'événement de scroll.
  useFocusEffect(
    useCallback(() => {
      lastY.value = 0;
      navCompact.value = withTiming(0, { duration: 200 });
    }, [lastY, navCompact])
  );

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const y = event.contentOffset.y;
      const delta = y - lastY.value;

      const isAtTop = y <= TOP_OFFSET;
      const isScrollingDown = delta > SCROLL_THRESHOLD;
      const isScrollingUp = delta < -SCROLL_THRESHOLD;

      if (isAtTop || isScrollingUp) {
        navCompact.value = withTiming(0, { duration: 220 });
      } else if (y > COMPACT_AFTER_Y && isScrollingDown) {
        navCompact.value = withTiming(1, { duration: 220 });
      }

      lastY.value = y;
    },
  });
}
