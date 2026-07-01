# Artistes en featuring — plan d'implémentation

Aujourd'hui, `tracks.artist_id` et `albums.artist_id` n'acceptent qu'un seul artiste : tout featuring (piste ou album) est silencieusement perdu à l'import. Ce document décrit le plan pour le modéliser, l'importer, le backfiller et l'afficher.

## Fait vérifié avant de concevoir quoi que ce soit

L'appel MusicBrainz **déjà utilisé aujourd'hui** à l'import (`inc=artist-credits+recordings+release-groups` sur `/release/{id}`) renvoie déjà tout ce qu'il faut, à deux niveaux :

- **Niveau release** (album) : `data['artist-credit']` — tableau complet, déjà parsé par `parseMbReleaseDetail`, mais seul l'index `[0]` est utilisé aujourd'hui (`artistCredit = data['artist-credit']?.[0]`).
- **Niveau piste** : chaque entrée de `media[].tracks[]` a son **propre** `artist-credit`, indépendant de celui de la release. Vérifié sur "Make Me Proud" (album *Take Care*, crédité juste "Drake") :
  ```json
  "artist-credit": [
    { "joinphrase": " feat. ", "artist": { "id": "9fff2f8a-...", "name": "Drake" } },
    { "joinphrase": "", "artist": { "id": "1036b808-...", "name": "Nicki Minaj" } }
  ]
  ```

**Conséquence directe : zéro requête MB supplémentaire.** Tout featuring (album ou piste, y compris un 3ᵉ artiste sur une seule piste d'un album par ailleurs collab à 2) est déjà présent dans la réponse qu'on récupère pour CHAQUE import — il suffit d'arrêter de la jeter. Le featuring piste est lu sur l'`artist-credit` de la piste elle-même, indépendamment de celui de l'album — un featuring track-level peut différer librement du crédit album-level, déjà géré nativement par construction.

## Schéma

Deux tables séparées avec vraies FK + `ON DELETE CASCADE` — **pas** un modèle générique `entity_type/entity_id` façon `external_ids`, dont l'absence de FK a coûté du temps cette session (orphelins à nettoyer à la main à chaque suppression).

```sql
CREATE TABLE IF NOT EXISTS album_featured_artists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id   UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(album_id, artist_id)
);

CREATE TABLE IF NOT EXISTS track_featured_artists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id   UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(track_id, artist_id)
);

ALTER TABLE album_featured_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_featured_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Featured artists are publicly readable" ON album_featured_artists
    FOR SELECT USING (true);
CREATE POLICY "Featured artists are publicly readable" ON track_featured_artists
    FOR SELECT USING (true);
```

Policies en lecture seule, calquées sur `albums`/`tracks` — les écritures passent par le service role (import server action / script de backfill), pas par le client.

Pas de colonne "role" : on ne modélise que le featuring pour l'instant, pas de généralisation prématurée (remix par, produit par...). `tracks.artist_id`/`albums.artist_id` ne changent pas — l'artiste "principal" reste exactement comme aujourd'hui, ces deux tables sont purement additives.

## Parsing & import (nouveaux imports)

1. Étendre `parseMbReleaseDetail` (`frontend/app/actions/musicbrainz.ts`) pour lire `track['artist-credit']` (repli sur `track.recording['artist-credit']` si absent) via `parseArtistCredit()`.
   - **`parseArtistCredit()` (ligne 199) jette aujourd'hui le `joinphrase`** — elle ne garde que `artist` et `name`. Il faut l'étendre pour le conserver (`joinphrase?: string`), sinon impossible de reconstruire `"A & B feat. C"` côté UI, seulement une liste plate d'artistes sans le séparateur MB.
2. `previewAlbumFromMusicBrainz` expose, pour l'album et pour chaque piste, la liste des artistes crédités au-delà de l'index 0.
3. Extraire la résolution get-or-create-artist-par-mbid (aujourd'hui inline dans `importAlbumFromMusicBrainz`) en un helper partagé `getOrCreateArtistByMbid(supabase, mbid, name)`, réutilisé pour l'artiste principal ET chaque featured — pour ne pas recréer le problème de doublons d'artistes qu'on vient de corriger pour les albums.
4. Après l'insert des `tracks`, insérer les lignes `album_featured_artists` / `track_featured_artists` correspondantes.

## Backfill (albums déjà en base)

**Coût réel : O(albums), pas O(pistes).** Un seul fetch de release ramène déjà tout le tracklist avec ses artist-credits — pas besoin d'un appel par piste. Avec ~2000 albums et le rate-limit MB (1 req/sec) : **environ 45 minutes**, faisable en une fois.

- Script `frontend/scripts/backfill-featured-artists.mjs`, dry-run par défaut, `--apply`, `--skip N` pour reprendre après interruption (vu la durée).
- Pour chaque album : résout la release (même logique que l'import), récupère le tracklist + artist-credits.
- **Rattache chaque piste retrouvée à la ligne `tracks` existante par titre normalisé** (même technique que `reconcile-duplicate-albums.mjs`), pas par `mbid` — vu tout ce qu'on a trouvé cette session sur la fiabilité des `mbid` stockés, ne pas en dépendre pour ce matching. Aucune nouvelle ligne `tracks` créée.
- Tourne en local (`node --env-file=.env.local scripts/backfill-featured-artists.mjs`), comme tous les scripts de cette session — pas besoin de CI/serveur pour une correction ponctuelle.

## Cas vérifiés, déjà couverts par construction

- **Featuring piste différent du featuring album** (ex: album collab à 2, une piste a un 3ᵉ invité) : géré nativement, le crédit piste est indépendant du crédit album.
- **"Single qui n'appartient à aucun album"** : n'existe pas réellement en base. `tracks.album_id` est `NOT NULL` ; même un single crée une ligne `albums` (généralement `type='Single'`) — l'import redirige juste directement vers `/tracks/{id}` sans jamais montrer de page album, ce qui donne l'impression contraire côté UX. Le featuring piste fonctionne donc identiquement, single ou pas.

## UI/UX

**v1 (cette passe) :**
- Page piste + lignes de tracklist (album, recherche) : afficher tous les artistes crédités, pas juste le principal — `Artist A & Artist B feat. Artist C` selon les `joinphrase` MB.
- En-tête de page album collab : afficher tous les artistes crédités au lieu du seul artiste principal stocké.
- Page artiste : nouvelle section **"Apparitions"**, distincte de "Discographie" — pistes/albums où l'artiste est crédité en featuring, pas en principal.
- **Attention N+1 sur la tracklist album** : ne pas fetch `track_featured_artists` piste par piste pour afficher une tracklist de 15-20 titres. Un seul `SELECT ... WHERE track_id = ANY(...)` pour toute la tracklist, group-by en mémoire côté page.
- `frontend/app/albums/preview/[mbid]/page.tsx` n'a pas besoin d'être touché : la route est aujourd'hui débranchée de l'UI (le seul `href` qui y pointait, dans `ArtistPageContent.tsx`, est mort — l'import passe par un bouton `onClick={handleImportAlbum}`, jamais par cette page). Pas la peine d'y afficher le featuring avant import.

**Reporté à une passe suivante :**
- Pertinence de recherche (`/search`, `/add`) : chercher un artiste featured devrait-il remonter les pistes où il apparaît ? Changement de logique de recherche, pas juste d'affichage — à traiter séparément une fois la donnée en place et vérifiée.
- Réécriture des cartes de feed/journal pour intégrer le featuring dans le titre affiché.

## Fichiers concernés

| Fichier | Changement |
|---|---|
| `supabase_migrations/supabase_migration_featured_artists.sql` | nouveau — les 2 tables |
| `frontend/app/actions/musicbrainz.ts` | parsing artist-credit par piste/release, helper `getOrCreateArtistByMbid`, écriture des 2 tables à l'import |
| `frontend/scripts/backfill-featured-artists.mjs` | nouveau — backfill historique |
| Page piste, tracklist album, page artiste | affichage des artistes crédités / section "Apparitions" |
