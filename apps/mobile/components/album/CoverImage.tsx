import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

// User-Agent descriptif — même convention que les appels API MusicBrainz
// (cf. USER_AGENT dans lib/musicbrainz.ts), bonne pratique pour les services MB.
const IMAGE_USER_AGENT = 'Sillon/1.0 (https://sillon.fm)';

// coverartarchive.org redirige vers archive.org pour servir le fichier réel : quand
// archive.org est injoignable (panne, blocage réseau/FAI), la connexion TCP peut rester
// en attente plusieurs dizaines de secondes avant qu'onError ne se déclenche. On borne
// l'attente pour basculer sur le placeholder rapidement plutôt que de laisser l'UI figée.
const LOAD_TIMEOUT_MS = 6000;

type Props = {
  /** URL principale — CoverArt Archive release-group */
  src: string;
  /** URL de secours (ex. cover release-specific) — tentée si la principale échoue */
  fallback?: string;
  /** Affiché si les deux échouent */
  placeholder: ReactNode;
  style?: StyleProp<ImageStyle>;
};

/**
 * Deux niveaux de fallback comme la version web : src -> fallback -> placeholder.
 * expo-image gère déjà le cache disque/mémoire nativement (pas besoin de le refaire).
 */
export function CoverImage({ src, fallback, placeholder, style }: Props) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const settledRef = useRef(false);

  const advance = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (current === src && fallback) {
      setCurrent(fallback);
    } else {
      setFailed(true);
    }
  };

  // Repart de zéro si src/fallback changent (composant réutilisé avec de nouvelles props
  // sans remonter) — sinon un `failed` resterait bloqué à `true` pour la nouvelle image.
  useEffect(() => {
    setCurrent(src);
    setFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallback]);

  useEffect(() => {
    settledRef.current = false;
    const timer = setTimeout(advance, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (failed) return <>{placeholder}</>;

  return (
    <Image
      source={{ uri: current, headers: { 'User-Agent': IMAGE_USER_AGENT } }}
      style={style}
      contentFit="cover"
      transition={150}
      onLoad={() => {
        settledRef.current = true;
      }}
      onError={advance}
    />
  );
}
