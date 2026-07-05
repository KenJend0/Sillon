# Waveform Mobile — Roadmap & Checklist

Application mobile native (React Native / Expo) partageant le même backend Supabase que la version web.

---

## Contexte technique

- **Framework** : Expo (pas React Native CLI)
- **Routing** : Expo Router (file-based, quasi-identique au App Router Next.js)
- **Styles** : NativeWind (Tailwind pour React Native)
- **Auth** : Supabase JS client + `expo-secure-store` pour la persistance de session
- **Build** : EAS Build (compilation cloud, pas besoin de Mac au quotidien)
- **Distribution test** : TestFlight (iOS) + APK direct (Android)
- **Soumission** : EAS Submit → App Store / Google Play
- **Backend** : Supabase (même instance que le web) + Supabase Edge Functions pour les secrets (Spotify, Last.fm)

---

## Phase 1 — Préparation du repo

- [x] Restructurer en monorepo :
  - [x] Déplacer `frontend/` → `apps/web/`
  - [x] Créer `apps/mobile/` avec `npx create-expo-app`
  - [x] Créer `packages/db/` avec les types Supabase partagés (`types/database.ts`)
  - [x] Mettre en place `npm workspaces` dans le `package.json` racine
- [x] Vérifier que le web tourne toujours après la restructuration (`npm run dev`)
- [x] Mettre à jour la config Vercel (Root Directory : `apps/web`)
- [x] Vérifier que Vercel redéploie correctement

---

## Phase 2 — Setup Expo

- [x] Installer et configurer **NativeWind** dans `apps/mobile/`
- [x] Configurer **Expo Router** (file-based routing)
- [x] Connecter **Supabase** :
  - [x] Installer `@supabase/supabase-js` + `expo-secure-store`
  - [x] Créer le client Supabase mobile avec persistance de session
- [x] Configurer **EAS Build** :
  - [x] Créer `eas.json` (profils development / preview / production)
  - [x] Lier au compte Expo
  - [x] Configurer Apple Developer account (99$/an)
- [x] Faire un premier build vide pour valider le pipeline (✓ build iOS simulator + Android APK)
- [x] Vérifier que l'app vide tourne sur les deux téléphones (✓ Android émulateur validé, iPhone dès confirmation Apple)

---

## Phase 3 — Auth

- [x] Écran de login (email + password)
- [x] Écran de signup
- [x] Gestion de la session Supabase (persistance avec SecureStore)
- [x] Redirection automatique si connecté → home
- [x] Redirection automatique si déconnecté → login
- [x] Écran de reset de mot de passe
- [x] Layout authentifié vs non-authentifié
- [x] Tester le flow complet login → session persistante après fermeture de l'app

---

## Phase 4 — Navigation et layout

- [x] Structure de navigation principale (tabs du bas) en reference au Bottom Navbar du web :
  - [x] Tab Decouvir (/explore du web)
  - [x] Tab Ajouter (/add du web)
  - [x] Tab Activité (/feed du web)
  - [x] Tab Moi (/me du web)
- [x] Ne pas autoriser la rotation d'ecran toujours verticale
- [x] Layout global (fond, couleurs, safe areas iOS/Android)
- [x] Navigation stack dans chaque tab (retour arrière)
- [x] Transitions entre pages

---

## Phase 5 — Composants de base

Briques réutilisables que tout le reste va utiliser.

- [x] `CoverImage` — avec fallback, équivalent du composant web (expo-image)
- [x] `StarRating` — notation 0–10
- [x] `Toast` — notifications éphémères
- [x] `BottomSheet` — modal qui remonte du bas (@gorhom/bottom-sheet)
- [x] `BackButton` — retour natif
- [x] `Avatar` —  avatar par défaut
- [x] `AlbumCard` — cover + titre + artiste + année
- [x] `ArtistCard` — photo + nom
- [x] `TrackCard` — titre + artiste + album
- [x] `UserCard` — avatar + username
- [x] `GenrePills` — tags genre cliquables
- [x] `StreamingLinks` — boutons Spotify / Apple Music / Deezer
- [x] `StarRating` — composant de notation interactif
- [x] Skeleton loaders (états de chargement)
- [x] `PullToRefresh` — rafraîchissement par glissement

---

## Phase 6 — Features core

Dans cet ordre, du plus important au moins important.

### 6.1 Feed
- [x] Récupération du feed (`getMyFeed` — onglets Pour moi/Réseau + agrégation des likes/follows/commentaires consécutifs, comme le web ; regroupement des écoutes/likes rapprochés en carte dépliable [ListenGroup/LikeGroup] porté dans `components/feed/groupFeedEvents.ts`)
- [x] Infinite scroll
- [x] Carte `FeedCardReviewCreated` (review album)
- [x] Carte `FeedCardTrackReviewCreated` (review titre)
- [x] Carte `FeedCardReviewLiked` (like review album)
- [x] Carte `FeedCardTrackReviewLiked` (like review titre)
- [x] Carte `FeedCardCommentCreated` (commentaire album)
- [x] Carte `FeedCardTrackCommentCreated` (commentaire titre)
- [x] Carte `FeedCardCommentReply` (réponse commentaire)
- [x] Carte `FeedCardUserFollowed` (nouveau follower)
- [x] Carte `FeedCardUnratedListen` (écoute sans note)
- [x] Like sur une entrée
- [x] Ajout de commentaire

### 6.2 Recherche
- [x] Barre de recherche globale (SearchOverlay) sur decouverte
- [x] Recherche interne Supabase (albums, artistes, titres)
- [x] Recherche MusicBrainz en arrière-plan
- [x] Affichage des résultats unifiés
- [x] Recherches récentes (local)
- [x] Autocomplete (recherche live au fil de la frappe, debounce 300ms — comme le web)

Note : les pages album (6.3), titre (6.3bis), artiste (6.5) et profil (6.7, `/u/[username]`)
existent désormais — le tap sur un résultat de recherche interne (déjà en DB) navigue vers
`/albums/[id]`, `/tracks/[id]`, `/artists/[id]` ou `/u/[username]`. Les résultats MusicBrainz
non encore en DB (albums/titres/artistes) déclenchent l'import via l'Edge Function
`import-musicbrainz` (Phase 8) puis naviguent directement vers la page créée — même flux
qu'en web. Pas de branche import pour les profils : la recherche de profils est
Supabase-only (pas de source MusicBrainz pour un compte utilisateur).

### 6.3 Page album
- [x] Hero (comme sur la version web mobile)
- [x] Section "Mon ecoute"
- [x] Tracklist
- [x] Critique
- [x] Bouton "Ajouter à une liste"
- [x] Albums similaires
- [x] Du meme artiste (albums en DB + releases MusicBrainz complémentaires, cliquables pour import)

Notes de scope (mises à jour après Phase 8 — Edge Functions `import-musicbrainz` +
`enrich-album` créées, voir Phase 8) :
- **Enrichissement en tâche de fond** : `enrich-album` tourne en tâche de fond après import
  (voir 6.2 et Phase 8). Si la page se charge avant que ça finisse (genres/liens absents), un
  petit polling local (pas de Realtime Supabase — aucun usage existant dans ce projet, jugé
  disproportionné pour ce besoin ponctuel) réinterroge `album_genres`/`album_metadata` toutes
  les 3s pendant 15s max, et met à jour l'affichage dès qu'une donnée apparaît — sans action de
  l'utilisateur. Le pull-to-refresh reste disponible en secours. La description
  (`album_metadata.description`/`description_src`) n'est en revanche pas encore lue/affichée
  sur cette page mobile (seuls genres + liens streaming le sont) — à ajouter séparément si besoin.
- **"Du même artiste" cliquable pour import** : la section fusionne désormais albums DB +
  releases MusicBrainz complémentaires (`getArtistReleases`, même dédup par mbid/clé
  canonique que la page artiste) ; le tap sur une release MB déclenche l'import via
  `import-musicbrainz` (`lib/useMusicBrainzImport.ts`, réutilisé par `ArtistDiscographySection`)
  puis navigue directement vers la page créée. La page album elle-même reste atteignable
  uniquement pour des albums déjà en DB ou importés via cette section ou la recherche (pas
  d'`ImportButton` dédié en haut de la page pour un mbid passé en paramètre d'URL).
- **Fanout feed pour les écoutes** : `upsertDiaryEntry`/`deleteDiaryEntry` (albums) et
  `upsertTrackDiaryEntry`/`deleteTrackDiaryEntry` (titres) passent désormais par l'Edge
  Function `log-listen` (`supabase/functions/log-listen`, déployée), miroir de
  `upsertDiaryEntry`/`upsertTrackDiaryEntry`/`deleteDiaryEntry`/`deleteTrackDiaryEntry`
  (web) — écriture RLS + fanout `feed_events` vers les abonnés, même pattern que
  `toggle-like`. `updateDiaryEntry` (modifier une note déjà enregistrée) reste un appel
  direct : le web ne fanout pas non plus sur l'édition simple.
- **Date d'écoute éditable** : `DatePickerField` (`components/ui/DatePickerField.tsx`) branché
  sur `@react-native-community/datetimepicker` (picker natif, pas `@expo/ui/community/
  datetime-picker` — crash Android confirmé sur ce composant, github.com/expo/expo/issues/39424,
  même prudence que pour le BottomSheet). Utilisé dans `DiaryEntryBottomSheet` et
  `TrackDiaryBottomSheet` — création ET édition permettent maintenant de choisir la date,
  comme sur le web (max = aujourd'hui).
- **Listes** : `lib/lists.ts` mobile n'est qu'un sous-ensemble minimal (get/toggle/liste par
  défaut) pour le bouton "Ajouter à une liste" — la Phase 7 (créer une liste, réordonner,
  couverture personnalisée) reste à faire.
- Routes `/artists/[id]`, `/diary/[id]`, `/lists/[id]`, `/u/[username]` référencées depuis
  cette page n'existent pas encore (Phases 6.5–6.7, 7) — les liens vers ces pages 404 pour
  l'instant, comme documenté en 6.2.

### 6.3bis Page titre (non prévue initialement — ajoutée car quasi identique à 6.3)
- [x] Hero (cover album, titre, artiste(s), lien album · année, genres hérités de l'album)
- [x] Section "Mon écoute"
- [x] Bouton "Ajouter à une liste"
- [x] Autres titres de l'album
- [x] Critiques
- [x] Plus de cet artiste (albums)

Mêmes notes de scope que 6.3 (mode dégradé Phase 8) : `lib/trackDiary.ts` n'a pas de
fanout feed, `lib/tracks.ts`/`lib/trackDiary.ts` n'importent rien depuis MusicBrainz. La
recherche (SearchOverlay) navigue désormais aussi vers `/tracks/[id]` pour les résultats
titres déjà en DB (miroir du branchement fait pour les albums en 6.3).

### 6.4 Ajouter une écoute
- [ ] Rechercher un album ou titre
- [ ] Sélectionner l'album/titre
- [ ] Choisir une note (0–10)
- [ ] Écrire une review (optionnel)
- [ ] Sélectionner une liste (optionnel)
- [ ] Soumettre → import depuis MB si nécessaire + fan-out feed
- [ ] Ré-écoute (si déjà une entrée existante)

### 6.5 Page artiste
- [x] Photo + nom (photo lue en DB uniquement — voir note de scope)
- [x] Activité réseau (qui dans mon réseau a écouté cet artiste — albums + titres)
- [x] Stats (auditeurs uniques, note moyenne, critiques — albums + titres fusionnés)
- [x] Populaires (top 3 albums par auditeurs)
- [x] Discographie (albums en DB + albums MB non importés, cliquables pour import)
- [x] Apparaît sur (albums crédités en featuring, album OU piste, dédupliqués par album)
- [x] Artistes similaires (via l'Edge Function `similar-artists` — voir note de scope)

Notes de scope (Phase 8 backend mobile non faite au moment de l'implémentation) :
- **Photo en mode dégradé** : `getOrFetchArtistMeta` (web) fetch MusicBrainz/Wikidata et écrit
  le cache via le client admin (service_role) si l'artiste n'a pas encore de photo — jamais
  exposable côté mobile. La page mobile lit `artists.image_url` tel quel, avec fallback sur
  la première cover d'album trouvée en DB (lecture seule), sans déclencher de nouvelle
  recherche ni écriture. Même dégradation que 6.3/6.3bis.
- **Discographie cliquable pour import** : les releases MusicBrainz non encore en DB sont
  affichées (API publique, comme le web) et déclenchent désormais l'import via l'Edge Function
  `import-musicbrainz` au tap (`lib/useMusicBrainzImport.ts`), avec spinner sur la cover pendant
  l'import puis navigation directe vers la page créée — même flux que la recherche globale (6.2)
  et "Du même artiste" (6.3).
- **Artistes similaires** : `getSimilarArtists` (web) appelle l'API Last.fm avec
  `LASTFM_API_KEY`, un secret serveur jamais exposable côté mobile. Portée via la nouvelle
  Edge Function `similar-artists` (supabase/functions/similar-artists), qui reprend la même
  logique (matching DB par MBID/nom, max 6, DB en priorité) — appelée depuis
  `lib/artists.ts` (`getSimilarArtists`). **Divergence volontaire du web** : le web
  n'affiche jamais un artiste similaire hors DB (`ArtistPageContent.tsx` filtre `id !== null`
  avant rendu) ; le mobile les affiche aussi et les rend cliquables quand un mbid est
  disponible (`ArtistSimilarSection` + `lib/useMusicBrainzImport.ts` — `useMusicBrainzArtistImport`),
  déclenchant l'import via `import-musicbrainz` au tap puis la navigation vers la page créée.
  Un artiste similaire sans mbid (Last.fm ne l'a pas fourni) reste masqué, faute de moyen de
  l'importer.
- Navigation `/artists/[id]` déjà référencée depuis AlbumHero, TrackHero, ArtistCard et la
  page titre (6.3/6.3bis) — ces liens menaient à un 404 jusqu'ici ; la route existe désormais.
  La recherche (SearchOverlay) navigue aussi vers `/artists/[id]` pour les résultats artiste
  déjà en DB (miroir du branchement fait pour albums/titres en 6.2).


### 6.6 Profil utilisateur (soi-même)
- [ ] Avatar + username + bio
- [ ] Tabs : Journal / Reviews / Titres / Listes / Stats
- [ ] Journal d'écoutes (albums)
- [ ] Journal d'écoutes (titres)
- [ ] Reviews
- [ ] Top 3 albums favoris
- [ ] Listes créées
- [ ] Stats d'écoute

### 6.7 Profil public
- [ ] Même structure que le profil perso mais en lecture
- [ ] Bouton Follow / Unfollow
- [ ] Nombre de followers / following
- [ ] Page followers
- [ ] Page following

---

## Phase 7 — Features secondaires

- [ ] **Explore** :
  - [ ] Tendances de la semaine
  - [ ] Section "Pour toi"
  - [ ] Découverte (algo suggestions)
  - [ ] Curator picks
  - [ ] Users similaires
- [ ] **Listes** :
  - [ ] Créer une liste
  - [ ] Ajouter / retirer un album
  - [ ] Cover personnalisée
  - [ ] Page détail liste
  - [ ] Likes sur les listes
- [ ] **Stats** (`/me/stats`) :
  - [ ] Albums écoutés par mois
  - [ ] Distribution des notes
  - [ ] Genres les plus écoutés
  - [ ] Angles morts (artistes peu explorés)
- [ ] **Settings** :
  - [ ] Modifier bio / username
  - [ ] Changer d'avatar
  - [ ] Modifier les 3 albums favoris
  - [ ] Export des données
  - [ ] Supprimer le compte

---

## Phase 8 — Backend mobile

Les secrets (Spotify, Last.fm) ne peuvent pas être exposés dans l'app. Ils passent par **Supabase Edge Functions** (remplaçant de `/api/enrich`).

- [x] Créer la Edge Function `import-musicbrainz` (`supabase/functions/import-musicbrainz/`) :
  - [x] Reprendre `importAlbumFromMusicBrainz` / `importArtistFromMusicBrainz` /
        `importTrackFromMusicBrainz` (`apps/web/app/actions/musicbrainz.ts`) à l'identique
  - [x] Client user-scope (RLS) pour les écritures albums/artistes/tracks, client service_role
        uniquement pour l'upload cover + `album_featured_artists`/`track_featured_artists`
        (mêmes usages qu'en web, rien de plus exposé)
  - [x] Brancher `SearchOverlay` mobile dessus (clic sur un résultat MusicBrainz non importé →
        import → navigation directe, comme le web)
- [x] Créer la Edge Function `enrich-album` (`supabase/functions/enrich-album/`) :
  - [x] Reprendre la logique de `apps/web/app/api/enrich/route.ts` + `actions/metadata.ts`
        (liens streaming + genres/tags + description — le mobile peut se permettre le pipeline
        complet à chaque import, contrairement au web qui ne déclenche que les liens pour ne
        pas exploser le quota CPU Vercel)
  - [x] `import-musicbrainz` déclenche automatiquement l'enrichissement en tâche de fond
        (`EdgeRuntime.waitUntil`) après chaque import d'album réussi
  - [x] Gérer les secrets via les variables d'env Supabase — **à faire manuellement** :
        `supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... LASTFM_API_KEY=...`
  - [x] Déployer les deux fonctions : `supabase functions deploy import-musicbrainz` et
        `supabase functions deploy enrich-album`
  - [x] Tester depuis l'app mobile (import d'un album/titre/artiste pas encore en DB, vérifier
        que `album_metadata`/`genres`/`album_genres` se remplissent après quelques secondes)
- [x] Créer la Edge Function `similar-artists` (`supabase/functions/similar-artists/`) :
  - [x] Reprendre `getSimilarArtists` (`apps/web/app/actions/artists.ts`) à l'identique
        (Last.fm `artist.getSimilar` + matching DB par MBID/nom, DB en priorité, max 6)
  - [x] Client user-scope (RLS) uniquement, aucune écriture — pas besoin de service_role
  - [x] Brancher la page artiste mobile dessus (`lib/artists.ts` → `getSimilarArtists`,
        section "Artistes similaires" affichée pour les résultats déjà en DB)
  - [x] Déployer : `supabase functions deploy similar-artists` — **LASTFM_API_KEY déjà
        configuré côté Supabase** (secret partagé avec `enrich-album`)
  - [ ] Tester depuis l'app mobile (page artiste → section "Artistes similaires" en bas)
- [x] Créer la Edge Function `log-listen` (`supabase/functions/log-listen/`) :
  - [x] Reprendre `upsertDiaryEntry`/`deleteDiaryEntry` (`apps/web/app/actions/diary.ts`) et
        `upsertTrackDiaryEntry`/`deleteTrackDiaryEntry` (`apps/web/app/actions/track-diary.ts`)
        à l'identique — validation (date, note, longueur, mots bannis), écriture RLS,
        fanout `feed_events` vers les abonnés + l'acteur (même calcul que `fanoutEvent` web)
  - [x] Une seule fonction pour albums et titres, discriminée par `kind: 'album' | 'track'`
        et `action: 'upsert' | 'delete'` — même style que `toggle-like` (`kind: 'diary' | 'track'`)
  - [x] Client user-scope (RLS) pour les écritures diary_entries/track_diary_entries, client
        service_role uniquement pour le fanout `feed_events` (mêmes usages qu'en web)
  - [x] Copié `findBannedContentWord` (`_shared/bannedWords.ts`) et
        `parseListenedAt`/`parseDiaryRating` (`_shared/diaryInputValidation.ts`) depuis leurs
        équivalents web — logique pure, portable telle quelle vers Deno
  - [x] Branché `lib/diary.ts`/`lib/trackDiary.ts` mobile dessus (`upsertDiaryEntry`,
        `deleteDiaryEntry`, `upsertTrackDiaryEntry`, `deleteTrackDiaryEntry` appellent
        désormais `supabase.functions.invoke('log-listen', ...)`) ; `updateDiaryEntry`
        (édition simple) reste un appel RLS direct, comme sur le web (pas de fanout à l'édition)
  - [x] Déployé : `supabase functions deploy log-listen`
  - [ ] Pas de rate-limiting (Upstash) ni de `logAuthedProductEvent` (analytics) côté Edge
        Function — même simplification déjà acceptée pour `toggle-like`, à revoir si abus constaté
  - [x] Tester depuis l'app mobile (noter un album/titre, vérifier que l'écoute apparaît dans
        le feed "Réseau" d'un compte qui suit l'auteur ; supprimer une écoute et vérifier que
        l'event disparaît du feed)
- [x] Pas encore branché : `EnrichmentPoller` mobile (rafraîchir l'UI albums sans re-fetch
      manuel une fois l'enrichissement en tâche de fond terminé) — `enrich-album` est déjà
      invocable indépendamment pour ce futur usage.

---

## Phase 9 — Polish natif

C'est là que l'app passe de "ça marche" à "c'est vraiment natif".

- [ ] **Animations** avec Reanimated :
  - [ ] Transitions entre pages
  - [ ] Press feedback sur les cartes
  - [ ] Animations du BottomSheet
- [ ] **Gestes** avec Gesture Handler :
  - [ ] Swipe pour revenir en arrière
  - [ ] Pull-to-refresh
  - [ ] Swipe sur les cartes du feed
- [ ] **Haptics** :
  - [ ] Vibration légère sur like
  - [ ] Vibration légère sur submit
- [ ] **Clavier** :
  - [ ] `KeyboardAvoidingView` sur les formulaires
  - [ ] Dismiss clavier au tap en dehors
- [ ] **Safe areas** iOS (notch, Dynamic Island, home indicator)
- [ ] **Dark mode** (si thème unique non décidé)
- [ ] Icône d'app + splash screen
- [ ] Tester sur iPhone physique via TestFlight
- [ ] Tester sur Android physique via APK

---

## Phase 10 — Soumission App Store

- [ ] **Préparation** :
  - [ ] Captures d'écran aux tailles obligatoires (6.7", 6.1", iPad si nécessaire)
  - [ ] Description de l'app (FR + EN)
  - [ ] Mots-clés App Store
  - [ ] Catégorie : Music
  - [ ] Politique de confidentialité (URL obligatoire)
  - [ ] Notes de confidentialité (Data practices dans App Store Connect)
- [ ] **Build final** :
  - [ ] `eas build --platform ios --profile production`
  - [ ] Vérifier le build sur TestFlight
  - [ ] Tests finaux sur vrais appareils
- [ ] **Soumission** :
  - [ ] `eas submit --platform ios`
  - [ ] Remplir les infos dans App Store Connect
  - [ ] Soumettre pour review Apple (délai : 1–3 jours en général)
  - [ ] Répondre aux éventuelles demandes de clarification Apple
- [ ] **Google Play** (si Android aussi) :
  - [ ] `eas build --platform android --profile production`
  - [ ] Créer la fiche Google Play
  - [ ] `eas submit --platform android`

---

## Récapitulatif des délais estimés

| Phase | Description | Durée estimée |
|-------|-------------|---------------|
| 1 | Préparation repo (monorepo) | 1–2 jours |
| 2 | Setup Expo + EAS | 1–2 jours |
| 3 | Auth | 2–3 jours |
| 4 | Navigation & layout | 2–3 jours |
| 5 | Composants de base | 3–5 jours |
| 6 | Features core | 2–3 semaines |
| 7 | Features secondaires | 1–2 semaines |
| 8 | Backend Edge Functions | 2–3 jours |
| 9 | Polish natif | 1–2 semaines |
| 10 | Soumission App Store | 1 semaine |
| **Total** | | **~2–3 mois** |

---

## Décisions techniques prises

- **Expo** (pas React Native CLI) — pas besoin de toucher à Xcode au quotidien
- **EAS Build** — compilation iOS dans le cloud, pas besoin de Mac
- **Pas de Capacitor** — app vraiment native, pas un WebView
- **NativeWind** — Tailwind pour React Native, syntaxe identique au web
- **Monorepo** — un seul repo pour web + mobile, types Supabase partagés dans `packages/db/`
- **Même backend Supabase** — RLS gère la sécurité, pas besoin de dupliquer
- **Supabase Edge Functions** pour Spotify + Last.fm — secrets jamais exposés dans l'app
- **MusicBrainz, iTunes, Deezer** — APIs publiques, appelées directement depuis l'app
