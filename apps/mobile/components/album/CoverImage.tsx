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

// coverartarchive.org/archive.org est un service gratuit qui throttle sous forte charge
// concurrente. Une grille avec beaucoup de covers (discographie d'un artiste prolifique,
// résultats de recherche...) peut monter 30+ CoverImage d'un coup, ce qui fait échouer des
// covers qui existent réellement (la même URL, appelée séquentiellement côté backend à
// l'import, fonctionne dans la grande majorité des cas). On borne le nombre de requêtes
// réseau simultanées via une petite file d'attente partagée entre toutes les instances de
// CoverImage de l'app, plutôt que de laisser chacune taper le réseau dès son montage.
const MAX_CONCURRENT_LOADS = 6;
let activeLoads = 0;
const waitQueue: Array<() => void> = [];

function acquireLoadSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      activeLoads += 1;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        activeLoads -= 1;
        const next = waitQueue.shift();
        if (next) next();
      });
    };
    if (activeLoads < MAX_CONCURRENT_LOADS) grant();
    else waitQueue.push(grant);
  });
}

type Props = {
  /** URL principale — CoverArt Archive release-group */
  src: string;
  /** URL de secours (ex. cover release-specific) — tentée si la principale échoue */
  fallback?: string;
  /** Affiché si les deux échouent (ou tant que la requête attend son tour dans la file) */
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
  const [ready, setReady] = useState(false);
  const settledRef = useRef(false);
  const releaseRef = useRef<(() => void) | null>(null);

  const release = () => {
    if (releaseRef.current) {
      releaseRef.current();
      releaseRef.current = null;
    }
  };

  const advance = () => {
    if (settledRef.current) return;
    release();
    if (current === src && fallback) {
      setCurrent(fallback); // relance un cycle slot+chargement via l'effet [current]
    } else {
      settledRef.current = true;
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

  // Attend son tour dans la file avant d'autoriser le montage du <Image> (donc la requête
  // réseau). Le placeholder/fond reste affiché pendant l'attente — pas de régression visuelle,
  // juste un léger décalage d'apparition pour les covers plus bas dans la file.
  useEffect(() => {
    settledRef.current = false;
    setReady(false);
    let cancelled = false;

    acquireLoadSlot().then((releaseFn) => {
      if (cancelled) {
        releaseFn();
        return;
      }
      releaseRef.current = releaseFn;
      setReady(true);
    });

    return () => {
      cancelled = true;
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(advance, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, current]);

  if (failed) return <>{placeholder}</>;
  if (!ready) return null;

  return (
    <Image
      source={{ uri: current, headers: { 'User-Agent': IMAGE_USER_AGENT } }}
      style={style}
      contentFit="cover"
      transition={150}
      onLoad={() => {
        settledRef.current = true;
        release();
      }}
      onError={advance}
    />
  );
}
