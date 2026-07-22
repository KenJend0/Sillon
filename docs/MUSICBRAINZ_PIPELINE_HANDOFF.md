# MusicBrainz pipeline — état des lieux et passation

Ce document résume une session longue et approfondie consacrée à fiabiliser le pipeline d'import/recherche MusicBrainz de Sillon. Il ne couvre **pas** les changements UI de la page artiste (filtres Albums/EPs/Singles/Lives, etc.) — uniquement la récupération/fiabilité des données MB elles-mêmes.

## Pourquoi ce chantier a démarré

Le pipeline MusicBrainz est central dans l'app : il alimente l'import (`/add`, recherche), l'affichage (`/albums`, `/artists`, `/tracks`), et la découverte (`/explore`, `/search`). Des doublons existaient déjà en base malgré les contraintes `UNIQUE(mbid)`, et certains imports (notamment des singles) créaient des albums avec des pistes sans rapport entre elles. L'objectif : auditer tout le pipeline, pas patcher au cas par cas.

## Root causes identifiées

1. **`albums.mbid UNIQUE` ne suffit pas à empêcher les doublons sémantiques.** MusicBrainz modélise une réédition/remaster/anniversary comme un *release-group entièrement différent* (mbid différent). Deux albums "pareils" pour un humain peuvent être deux releases-groups MB distincts, donc deux lignes différentes, MBID-uniques chacune.
2. **La sélection de la release concrète au sein d'un release-group était aveugle au contenu.** L'ancien code prenait `releases.find(Official) ?? releases[0]` sans regarder le nombre de pistes — pouvait tomber sur un maxi-single avec des bonus tracks sans rapport, ou sur une release sans aucune piste listée (album vide).
3. **La recherche/dédup de titres était incohérente** entre trois endroits du code (import, `mergeAndRank`, page artiste), chacun avec sa propre logique ad-hoc de comparaison de titres.
4. **`bulk-import-albums.mjs` (script ponctuel) ne filtrait jamais le type du release-group matché** lors de sa recherche initiale par titre+artiste — pouvait matcher un Single/Live/Compilation/Remix homonyme de l'album réel.
5. **(Trouvé en session 2) Fallback silencieux `data['release-group']?.id || mbid`** dans `previewAlbumFromMusicBrainz` (et son fork `process-external-imports.mjs`) : si MusicBrainz ne renvoie pas de release-group pour une release donnée, l'ancien code retombait sur le `mbid` reçu en paramètre — qui peut être un mbid de *release*, pas de release-group — et le stockait comme tel sans erreur ni log. Root cause de 112 albums sur tout le catalogue (`STORED_RELEASE_NOT_GROUP`), largement éteinte depuis le 27/03/2026 par un changement de cache/perf sans rapport (suppression de `inc=releases` dans la recherche), mais le chemin via l'import de morceau (`importTrackFromMusicBrainz`) restait actif.
6. **(Trouvé en session 2) Une compilation "Various Artists" est `primary-type: "Album"` comme un vrai album** — un filtre qui ne vérifie que le primary-type (sans exclure `secondary-types: ["Compilation"]`) ne l'exclut pas. `searchMusicBrainzRecordings` (import par recherche de morceau) piochait "la première release de type Album" dans la liste des releases d'un enregistrement sans ce filtre — un titre populaire apparaissant sur des dizaines de compilations, l'import tombait régulièrement sur l'une d'elles plutôt que sur le single/album réel.

## Ce qui a été corrigé (Bricks 1-6)

### Brique 1 — Clé canonique partagée
- `frontend/lib/textNormalize.ts` : `normalize()` (minuscule, NFKD — pas NFD, pour replier les caractères de compatibilité comme `²`→`2` — ponctuation remplacée par un **espace** pas vidée, zéros de tête retirés des tokens numériques) + `stripArticle()`.
- `frontend/lib/albumCanonical.ts` : `canonicalAlbumKey(title, artist)` — retire les suffixes d'édition connus (Deluxe, Remaster(ed), Anniversary, Expanded, Bonus Track Version, Special/Collector's/Legacy Edition, Mono/Stereo, Reissue) avant de normaliser. **C'est la seule fonction qui doit servir à comparer "est-ce le même album" dans tout le code.**

### Brique 2 — Garde-fou à l'import
`importAlbumFromMusicBrainz` (`frontend/app/actions/musicbrainz.ts`) : après le check MBID exact, résout l'artiste, puis cherche un album existant avec la même `canonical_key` pour cet `artist_id` avant de créer une nouvelle ligne. Idempotent comme le check MBID (redirige vers l'existant). Tolère l'absence de la colonne `canonical_key` (retry sans elle) si la migration n'est pas encore appliquée.

### Brique 3 — Sélection de release corrigée (release-WITHIN-release-group)
`previewAlbumFromMusicBrainz` : fetch `inc=releases+media`, préfère le statut Official, puis **le moins de pistes** parmi les Official. Politique pensée pour singles/EP (éviter les bonus tracks d'éditions maxi).
**⚠️ Pour les albums complets, la politique inverse est nécessaire** (voir Brique "bulk-import" plus bas) — ces deux logiques **ne sont pas unifiées**, elles vivent dans des fichiers différents avec une logique quasi dupliquée.

### Brique 4 — Dédup cohérente à l'affichage
`mergeAndRank` (`frontend/lib/searchRanking.ts`) et la dédup de la page artiste utilisent maintenant `canonicalAlbumKey` au lieu de comparaisons de titre ad-hoc.

### Brique 5 — Réconciliation des doublons historiques
Script `frontend/scripts/reconcile-duplicate-albums.mjs` (dry-run par défaut, `--apply`) :
- Groupe les albums par `(artist_id, canonical_key)`.
- Choisit l'album à garder : **tracklist la plus complète d'abord** (pas l'engagement — un album à 0 piste peut avoir des critiques car `diary_entries` référence `album_id`, pas les pistes), puis engagement, puis date de création.
- Réattribue `diary_entries`, `track_diary_entries` (+ remap des `track_id`), `saved_albums`, `user_favorite_albums` — supprime la ligne plutôt que de la réattribuer si ça violerait une contrainte `UNIQUE(user_id, ...)`.
- Supprime les `external_ids` (pas de FK/cascade sur cette table — orphelins sinon) avant de supprimer l'album.
- **Signale sans toucher** les `curator_picks`/`list_items`/`album_genre_votes` qui seraient perdus en cascade.
- Résultat en prod : 20 groupes (21 albums) fusionnés.

### Découverte annexe — doublons non détectés par la clé canonique
- **"Mélancholia" vs "MELANCHOLIA 999"** (Green Montana) : même œuvre, mêmes `mbid` de pistes MusicBrainz, mais titres trop différents pour matcher la clé canonique. Fusionné à la main.
- Tout titre qui change de nom à la réédition (pas juste un suffixe d'édition) est un **angle mort connu** de l'approche par similarité de titre.

### Brique "bulk-import" — root cause des albums à 0 piste
`bulk-import-albums.mjs` choisissait la release la plus ancienne d'un release-group sans vérifier qu'elle avait des pistes — souvent un promo/pressing régional vide. Corrigé (`getBestReleaseId`) :
- `inc=releases+media`, préfère Official, puis **le PLUS de pistes** (politique inverse de la Brique 3 — completude prime pour un album complet, alors que pour un single c'est la pollution par bonus tracks qu'on évite).
- Si la release choisie n'a vraiment aucune piste : supprime l'album et renvoie une erreur au lieu de laisser un album vide.

### Script de réparation des albums à 0 piste
`frontend/scripts/repair-empty-track-albums.mjs` (dry-run/`--apply`/`--exclude=id1,id2`) :
- Détecte les albums à 0 piste (paginé correctement — voir piège ci-dessous).
- Re-vérifie le release-group via `getBestReleaseId`, avec garde-fous anti-faux-positifs ajoutés après revue manuelle :
  - `primary-type` doit être Album/EP (sinon "SUSPICIOUS — Single/Other").
  - `secondary-types` ne doit pas inclure Live/Compilation/Remix/Demo/etc (sinon "SUSPICIOUS").
  - Si ≥50% des titres de pistes ressemblent à des versions live/remix/edit/home-recording, flag aussi.
- Résultat sur 198 albums à 0 piste : ~163 réparés directement, ~32 flagués SUSPICIOUS (mauvais release-group, recherche initiale jamais filtrée par type), 1 sans tracklist MB du tout, 1 doublon supplémentaire trouvé (Diana — 33 pistes vs ~9 réelles, un faux positif qu'aucune heuristique automatique n'attrape).

### Brique 6 — Re-résolution des mauvais release-groups
`frontend/scripts/refix-suspicious-albums.mjs` (dry-run/`--apply`/`--exclude=...`) :
- Recherche MusicBrainz par titre+artiste **avec filtrage de type correct** (primary-type Album/EP only, secondary-types exclus) — le filtre qui manquait à la recherche initiale du bulk-import.
- Affiche l'activité existante (diary entries, saved, favorited, list items, curator picks) avant de proposer un changement — **par précaution explicite demandée**, même si en pratique `album_id` ne change jamais donc cette activité n'est pas en danger structurel.
- Résultat : 22 réparés automatiquement + 1 fusionné à la main (Dune, collision avec un doublon déjà correct) = 23/35. **12 restent non résolus** : 5 exclus car le meilleur candidat filtré était quand même faux (Cross — vrai titre MB est "†" pas "Cross" ; Diana — matché sur une autre œuvre du même nom ; How to Train Your Dragon — matché sur une sous-release "Isle of Berk" ; Spirited Away — matché sur une "Suite" condensée pas la BO complète ; Since I Left You — nombre de pistes presque doublé), et 7 sans réponse automatisable du tout (dont **Alive 2007** et **The Köln Concert**, qui sont *canoniquement* des albums live — le filtre anti-Live les exclut à tort, ce n'est pas un mauvais match, c'est juste leur vraie nature).
- **Décision prise** : ces 12 ont été supprimés (pas réparés) — le peu d'activité dessus (1-2 critiques chacun) a été accepté comme perte, les utilisateurs intéressés réimporteront proprement.

### Script de diagnostic ponctuel
`frontend/scripts/diagnose-track-conflict.mjs <album_id>` — pour un album dont l'insert de pistes échoue sur `uq_tracks_mbid`, retrouve quel autre album/piste détient déjà ce `mbid`.

## ✅ Découverte Luidji — mesurée et traitée en session 2

En corrigeant l'affichage des filtres de type sur la page artiste, on avait trouvé que **les 6 albums de l'artiste Luidji** (déjà importés, avec de vraies pistes et de l'engagement — donc invisibles à toute la détection "0 piste" de la session 1) avaient :
- un `mbid` qui ne correspond à **aucun** release-group MusicBrainz actuel pour cet artiste (mauvais match de l'ancienne recherche non filtrée du bulk-import) ;
- une colonne `type` figée à `'Album'` quelle que soit la vraie nature (EP, Live...), parce que l'ancien `bulk-import-albums.mjs` n'écrivait **jamais** cette colonne à l'insert.

Corrigé à la main pour Luidji en session 1. La session 2 (voir plus bas) a mesuré l'ampleur réelle sur tout le catalogue : **Luidji était en fait un cas quasi isolé** (3 vrais cas similaires trouvés sur 1318 albums audités). L'essentiel de ce qui ressemblait au même symptôme était en réalité un défaut différent et plus bénin (mbid de *release* au lieu de release-group — voir Session 2).

## Invariants à connaître / respecter avant de toucher à ce pipeline

- **`canonicalAlbumKey()` est la seule source de vérité** pour "est-ce le même album". Ne jamais réinventer une comparaison de titre ailleurs.
- **Deux politiques différentes et non unifiées** pour choisir une release dans un release-group : *le moins* de pistes parmi les Official pour singles/EP (`musicbrainz.ts`), *le plus* de pistes parmi les Official pour albums complets (scripts bulk-import/repair/refix). Dupliquées dans 4 fichiers différents.
- **Le filtrage par type** (primary-type Album/EP/Single + exclusion des secondary-types Live/Compilation/Remix/Demo/Spokenword/Interview/Audiobook/Audio drama/Field recording) doit s'appliquer à **toute recherche/import par titre**. Exception : `getArtistReleases` (page artiste) autorise volontairement Live (un artiste peut avoir publié un vrai album live).
- **Même avec un bon filtrage de type, un mauvais match reste possible** (homonymes d'époques différentes, "Suite" condensées, coffrets deluxe) — il n'existe pas de signal automatique fiable pour ce cas, une vérification humaine a été nécessaire à chaque fois dans cette session.
- **`tracks.mbid` et `albums.mbid` sont `UNIQUE`** — tout script d'écriture doit gérer la violation de contrainte comme un signal de doublon réel à fusionner, pas comme une erreur à ignorer.
- **Piège de pagination Supabase/PostgREST** : un `.select()` sans `.range()` est plafonné à 1000 lignes par défaut. Ce bug s'est produit **trois fois** dans des scripts différents cette session (toujours en silence, jamais d'erreur visible) avant d'être systématiquement corrigé. Vérifier ce point dans tout nouveau script qui parcourt `albums` ou `tracks` en entier.
- **`albums.type` n'est pas fiable** pour tout ce qui a été importé avant cette session — voir la découverte Luidji ci-dessus. (Mesuré et corrigé en session 2 — voir plus bas.)
- **`cover_url` encode le mbid dans son nom de fichier Supabase Storage** (`lib/storage.ts`, `uploadCoverToSupabase` : `${albumMbid}.jpg`). Tout script qui change `albums.mbid` doit aussi re-uploader/renommer la cover, sinon le fichier reste valide (rien de cassé pour l'utilisateur) mais le nom de fichier ne correspond plus au mbid courant — un futur script qui déduirait le chemin Storage à partir du mbid (nettoyage, régénération) manquerait le vrai fichier. Voir `repair-cover-mbid-drift.mjs`.
- **Une compilation "Various Artists" est `primary-type: "Album"` sur MusicBrainz**, comme un vrai album — un filtre qui ne vérifie que le primary-type (sans exclure `secondary-types: ["Compilation"]`) ne l'exclut pas. Un enregistrement (recording) très populaire apparaît sur des dizaines de compilations ; toute logique qui pioche "la première release de type Album" dans la liste des releases d'un recording sans filtrer les secondary-types tombera régulièrement sur une compilation au lieu du single/album réel. Toujours utiliser `isAcceptableReleaseGroup()` (voir Session 2), jamais un check `primary-type` seul.

## Inventaire des scripts (`frontend/scripts/`)

| Script | Rôle | Mode |
|---|---|---|
| `bulk-import-albums.mjs` | Import en masse depuis une liste figée. Sélection de release corrigée, **mais la recherche initiale du release-group ne filtre toujours pas par type** — bug pas encore reporté ici. | `--dry-run` |
| `backfill-canonical-keys.mjs` | Calcule/écrit `canonical_key` pour tous les albums. | `--dry-run` / `--recompute` |
| `reconcile-duplicate-albums.mjs` | Fusionne les groupes de doublons par `canonical_key`. | `--apply` |
| `repair-empty-track-albums.mjs` | Remplit les pistes des albums à 0 piste. | `--apply` / `--exclude=` |
| `refix-suspicious-albums.mjs` | Re-résout le mbid des albums dont le release-group est faux. | `--apply` / `--exclude=` |
| `diagnose-track-conflict.mjs <album_id>` | Diagnostic ponctuel d'une violation `uq_tracks_mbid`. | lecture seule |

**Ajoutés en session 2** :

| Script | Rôle | Mode |
|---|---|---|
| `audit-artist-mbid-integrity.mjs` | Audit en lecture seule de tout le catalogue : pour chaque artiste avec mbid, browse ses vrais release-groups MB et compare à `albums.mbid` stocké. Distingue `STORED_RELEASE_NOT_GROUP` / `MBID_NOT_FOUND_ANYWHERE` / `TYPE_MISMATCH`. Sort les artistes trop prolifiques (>500 release-groups, ou "Various Artists") plutôt que de bloquer. `--skip=N` pour reprendre après interruption. | lecture seule, `--out=` |
| `audit-prolific-artists.mjs` | Audite les artistes sortis de l'audit ci-dessus via lookup direct par album (1 requête/album) au lieu d'un browse exhaustif — fonctionne même pour Beatles/Mozart/Beethoven. | lecture seule, `--out=` |
| `investigate-mbid-not-found.mjs` | Investigation ciblée des cas `MBID_NOT_FOUND_ANYWHERE` : activité existante + candidats MB filtrés par type. | lecture seule |
| `repair-mbid-not-found.mjs` | Repointe le mbid (cas confirmés) ou le vide (aucun équivalent MB trouvé) pour les cas `MBID_NOT_FOUND_ANYWHERE`. | `--apply` |
| `repair-stored-release-not-group.mjs` | Repointe `albums.mbid` d'un mbid de *release* vers le vrai release-group, en vérifiant que le nombre de pistes en base correspond à une release du groupe candidat avant d'écrire. Accepte `--file=` pour traiter le rapport d'un autre script d'audit. | `--apply` |
| `repair-type-mismatch.mjs` | Corrige `albums.type` quand le mbid est valide mais le type stocké ne correspond pas au primary-type/secondary-types réel. | `--apply` |
| `investigate-various-artists.mjs` / `investigate-various-artists-tracks.mjs` | Investigation des albums importés sous l'artiste "Various Artists" (voir root cause #5) : activité existante, puis recherche du vrai artiste/single par morceau. | lecture seule |
| `repair-various-artists-empty.mjs` | Supprime les albums "Various Artists" sans aucune critique. | `--apply` |
| `repair-various-artists-tracks.mjs` | Pour les morceaux "Various Artists" *avec* critique : importe le bon artiste/album si besoin, déplace la critique (track_id/album_id/artist_id), supprime l'ancienne compilation. | `--apply` |
| `repair-duplicate-diary-entry.mjs` | Résout un doublon de critique laissé par la migration ci-dessus (l'utilisateur avait déjà corrigé à la main avant le script). | `--apply` |
| `repair-cover-mbid-drift.mjs` | Scanne tout le catalogue, détecte les `cover_url` dont le nom de fichier Supabase Storage ne correspond plus à `albums.mbid` (suite à un repointage), re-upload sous le bon nom. | `--apply` |

Aucun de ces scripts n'est branché en CI/automatisation — l'idée d'une github action de détection périodique a été évoquée puis explicitement mise en pause.

## Session 2 (29/06/2026) — Mesure, consolidation et réparation

Objectif : reprendre exactement les points 1-5 ci-dessous. Les deux fronts annoncés (mesurer l'ampleur, consolider le pipeline) ont été traités, plus deux découvertes faites en cours de route.

### Mesure de l'ampleur (point 1-2)

`audit-artist-mbid-integrity.mjs` sur tout le catalogue (780 artistes avec mbid ayant ≥1 album, 1318 albums vérifiés) :
- **`MBID_NOT_FOUND_ANYWHERE` (vrai cas Luidji) : 3 sur tout le catalogue.** Luidji était donc bien un cas quasi isolé, pas un défaut massif. Traités à la main (`investigate-mbid-not-found.mjs` + `repair-mbid-not-found.mjs`) : 2 repointés vers le bon release-group (contenu déjà correct, juste le mbid était faux), 1 ("GenY⁵") avait un mbid fantôme — artiste réel sur MB mais 0 release-group listé, donc rien à repointer — mbid vidé plutôt que de mentir sur un lien qui n'existe pas.
- **`STORED_RELEASE_NOT_GROUP` (root cause #5) : 112 au total** (109 + 3 trouvés ensuite chez les artistes prolifiques). Mbid de *release* stocké au lieu de release-group — bon album/artiste, juste le mauvais grain d'identifiant. Tous repointés (`repair-stored-release-not-group.mjs`) après vérification que le nombre de pistes en base correspond à une release du release-group candidat (1 cas — "APOCALYPSE" de Gazo, écart de 1 piste — volontairement laissé pour revue manuelle).
- **`TYPE_MISMATCH` : 37**, tous corrigés (`repair-type-mismatch.mjs`).
- **25 artistes trop prolifiques pour un browse exhaustif** (Beatles, Mozart, Beethoven, Dylan...) — `audit-prolific-artists.mjs` les audite via lookup direct par album (1 requête/album) à la place. 1 faux positif détecté (Eric Clapton/"Riding With the King" — l'audit ne regardait que le 1er artiste-crédité, B.B. King sur cet album collaboratif ; l'album est en fait correct).
- **14 artistes orphelins découverts en cours de route** (0 mbid, créés dans la même fenêtre de 17 minutes par un seul run de `bulk-import-albums.mjs`, 13 avec 0 album — dont 3 avec le titre de l'album stocké comme nom d'artiste à cause du fallback de recherche titre-seul sans filtre) : 13 supprimés (aucune donnée perdue, vérifié via `track_diary_entries`/`import_requests`), 1 (Stormzy, 1 album réel) juste backfillé en lisant l'artist-credit du release-group déjà stocké.

### Consolidation du pipeline (point 3-5)

Nouveau module `frontend/lib/musicbrainzReleasePolicy.mjs` — `isAcceptableReleaseGroup()` (filtrage par type, paramétrable `allowLive`/`allowedPrimaryTypes`) et `pickBestRelease()`/`releaseSelectionMode()` (politique fewest/most unifiée). Suit le pattern déjà établi par `musicbrainzMatch.mjs` (module `.mjs` pur, importable par l'app TS via `allowJs` et par les scripts Node sans build).

Câblé partout : `musicbrainz.ts` (searchMusicBrainzAlbums, getArtistReleases, previewAlbumFromMusicBrainz — corrige au passage un bug latent où un album complet résolu depuis la page artiste prenait à tort la release la plus *courte*), `bulk-import-albums.mjs` (+ rollback de l'artiste orphelin si l'import échoue après sa création, + vérification artiste via `isArtistMatch` de `musicbrainzMatch.mjs` sur le fallback titre-seul), `refix-suspicious-albums.mjs`, `repair-empty-track-albums.mjs`. `textNormalize.ts`/`albumCanonical.ts` convertis en `.mjs` au même titre, résolvant la dette de duplication déjà documentée dans `backfill-canonical-keys.mjs` ("must stay in sync").

### Découverte additionnelle — bug "Various Artists" (root cause #6)

En creusant pourquoi certains titres étaient attribués à "Various Artists", trouvé que `searchMusicBrainzRecordings` (import par recherche de morceau) ne filtrait que sur le primary-type, pas les secondary-types — une compilation est `primary-type: "Album"` comme un vrai album. Corrigé (utilise `isAcceptableReleaseGroup`). 13 albums déjà importés sous "Various Artists" en base : 7 sans aucune critique supprimés, 4 morceaux *avec* critique migrés vers leur vrai artiste/album (+ 1 doublon de critique résolu — l'utilisateur s'était déjà corrigé lui-même avant qu'on s'en occupe), 1 ("Il en faut peu pour être heureux", BO du Livre de la Jungle) confirmé **correct** — "Various Artists" est l'attribution légitime MB pour une BO multi-doubleurs, pas un bug —, 1 ("You Know You Like It") laissé pour décision manuelle (seule version MB trouvée est un remix DJ Premier, pas l'originale).

Même défaut que la root cause #5 trouvé dans un 4ᵉ endroit (`process-external-imports.mjs`, fallback `data['release-group']?.id || mbid`) et corrigé à l'identique.

### Découverte additionnelle — drift cover_url/mbid

Les scripts de repointage de mbid ci-dessus ne touchaient pas `cover_url`, qui encode le mbid dans son nom de fichier Supabase Storage à l'upload (`lib/storage.ts`). Pas de cover cassée pour l'utilisateur (l'ancien fichier reste valide), mais le nom de fichier ne correspondait plus au mbid courant. `repair-cover-mbid-drift.mjs` scanne tout le catalogue et corrige (120 covers re-uploadées sous le bon nom — au-delà des seuls cas touchés cette session, du drift antérieur existait aussi).

## Session 3 — clôture des points en attente

Tous les points de la session précédente ont été traités :

1. **"APOCALYPSE" (Gazo)** résolu — `albums.mbid` stockait un mbid de *release* (root cause #5) au lieu du release-group ; le release-group réel (`78863586-...`) a 16 pistes, la base en avait 15. Piste manquante ("Miroir") ajoutée, mbid repointé, `external_ids` et `cover_url` (drift de nom de fichier) corrigés à la suite.
2. **"You Know You Like It"** résolu — la session 2 n'avait cherché que sur "Encore" (DJ Snake), où seul un remix matchait. Une recherche directe par titre de recording a trouvé le vrai single studio "DJ Snake, AlunaGeorge" (`a134c516-...`, primary-type Single, aucun secondary-type). Migré via `repair-various-artists-tracks.mjs` (cas ajouté au tableau `CASES`).
   - **Découverte associée** : `searchMusicBrainzRecordings` appelait `isAcceptableReleaseGroup()` avec son défaut (Album/EP uniquement) — tout morceau dont la seule release légitime est un Single tombait donc sur `releases[0]` (souvent une compilation arbitraire). C'est très probablement la cause de fond du faux négatif sur ce cas en session 2, et touchait potentiellement d'autres morceaux jamais audités individuellement. Corrigé dans `musicbrainz.ts` : Album/EP essayé en premier, puis Single, avant le repli arbitraire.
   - **Découverte associée n°2** : la dédup de `searchMusicBrainzRecordings` gardait le premier candidat `(titre, artiste)` rencontré sans regarder sa qualité — corrigé pour garder le candidat dont la release a la meilleure qualité (Album/EP > Single > compilation/live/remix), score MB en départage.
3. **Doublon trouvé pendant l'audit** : "Bitume Caviar, Vol. 01" vs "Bitume Caviar (Vol.1)" (Prince Waly) — fusionné via `reconcile-duplicate-albums.mjs --apply` (1 `list_items` migré à la main en amont pour ne rien perdre en cascade).
4. **`canonical_key` manquant sur deux chemins d'écriture actifs en prod** — `process-external-imports.mjs` (cron GitHub Actions, toutes les 15 min) et `bulk-import-albums.mjs` n'écrivaient ni `type` ni `canonical_key` à l'insertion, et ne faisaient aucun check de doublon canonique avant de créer une ligne. Les deux scripts font maintenant le même check `(artist_id, canonical_key)` qu'`importAlbumFromMusicBrainz`, et `repair-various-artists-tracks.mjs` (qui a le même `writeAlbumImport()`) a été aligné aussi.
5. **Filet de rattrapage nocturne ajouté** dans `daily-enrich.yml` : `backfill-canonical-keys.mjs` (écrit, idempotent) puis `reconcile-duplicate-albums.mjs` **en dry-run uniquement** (le script cascade-supprime `curator_picks`/`list_items` sans bloquer même quand il les détecte — `--apply` reste un geste manuel après revue du rapport).
6. **Tests automatisés ajoutés** (`npm test`, vitest) — 48 tests couvrant `canonicalAlbumKey`/`stripEditionSuffix` (Brique 1-2), `isAcceptableReleaseGroup`/`pickBestRelease`/`releaseSelectionMode` (Brique 3, filtrage de type, root causes #5/#6), et le matching artiste/titre de `musicbrainzMatch.mjs` (cascade de recherche Last.fm/RYM). `frontend/lib/*.test.mjs` + `frontend/vitest.config.mts`.
7. **`releaseId` absent de `searchMusicBrainzAlbums`** réévalué — laissé tel quel : retiré intentionnellement pour la perf (`inc=releases` alourdissait le payload de recherche), le coût (un aller-retour MB de plus à l'import, absorbé par `previewAlbumFromMusicBrainz` via le 404→lookup release-group) est jugé acceptable face au gain de payload sur chaque recherche.
8. **Featuring artists — diagnostic, non implémenté (hors scope MB pur)** : `tracks.artist_id`/`albums.artist_id` sont des FK `NOT NULL` vers un seul artiste (`supabase_schema.sql:75,98`) — aucune table de jonction pour les collaborations. Tous les chemins d'import (`musicbrainz.ts`, `process-external-imports.mjs`, `bulk-import-albums.mjs`, `repair-various-artists-tracks.mjs`) ne lisent que `artist-credit[0]` et jettent le reste du crédit MusicBrainz (featurings, collaborations multi-artistes). Implication concrète : un titre crédité "DJ Snake, AlunaGeorge" sur MB atterrit avec `artist_id` = un seul des deux (le premier de la liste), l'autre disparaît silencieusement de la base — pas un bug de matching, une limitation de modèle de données. Corriger ça demanderait une table de jonction `track_artists`/`album_artists` (many-to-many) et une migration des FK existantes ; non commencé, et plus large que le pipeline MB seul (impacte l'affichage partout où un artiste est montré).

### Vulnérabilités npm (hors scope MB, trouvées en ajoutant vitest)

`npm audit` signale 17 vulnérabilités après l'ajout de vitest — **toutes préexistantes**, aucune ne vient de vitest :
- 8 avis (form-data, request, jimp, minimist, follow-redirects, qs, tough-cookie, uuid, jpeg-js, url-regex — critique/haut pour plusieurs) descendent de `to-ico@1.1.5`, déjà présent avant cette session, utilisé uniquement par les scripts de génération d'icônes (`generate-favicon.js`/`generate-app-icons.mjs`) — jamais livré dans l'app, mais paquet non maintenu avec une chaîne de dépendances dangereuse.
- 1 avis (postcss, moderate) vient d'une copie interne à `next`/`@sentry/nextjs`/`@vercel/analytics` — pas fixable sans une régression (`npm audit fix --force` propose de downgrader `next` vers la branche 9.x, à ne surtout pas faire).
- Non traité dans cette session — proposé mais pas tranché avec l'utilisateur.
