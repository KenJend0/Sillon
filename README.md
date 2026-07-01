# Waveform

Journal musical social. Suis tes écoutes, note tes albums et titres, découvre ce qu'écoutent tes amis.

---

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | Next.js 15 (App Router) |
| Auth & BDD | Supabase (Postgres + Auth + Storage) |
| Styles | Tailwind CSS v4 |
| Données musicales | MusicBrainz API, Last.fm API, iTunes Search API, Deezer API |
| Déploiement | Vercel |

Pas de backend custom. Toute la logique passe par des **Server Actions** Next.js et le client Supabase côté serveur.

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- Un projet Supabase (plan gratuit suffisant pour le dev)

### Installation

```bash
git clone https://github.com/KenJend0/waveform.git
cd waveform/frontend
npm install
```

### Configuration

```bash
cp .env.example .env.local
# Remplis les variables dans .env.local
```

Variables requises :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

Variables optionnelles :

```env
LASTFM_API_KEY=...                  # enrichissement genres + descriptions
SPOTIFY_CLIENT_ID=...               # liens streaming Spotify
SPOTIFY_CLIENT_SECRET=...           # liens streaming Spotify
UPSTASH_REDIS_REST_URL=https://...  # rate limiting (désactivé si absent)
UPSTASH_REDIS_REST_TOKEN=...
```

### Lancer en dev

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Structure du projet

```
waveform/
├── frontend/                        # Application Next.js 15
│   ├── app/
│   │   ├── actions/                 # Server Actions (logique métier)
│   │   ├── api/                     # Route Handlers Next.js
│   │   ├── add/                     # Ajouter une écoute (album ou titre)
│   │   ├── albums/[id]/             # Page album
│   │   ├── artists/[id]/            # Page artiste
│   │   ├── auth/                    # Login / Signup / Reset
│   │   ├── diary/[entry_id]/        # Entrée journal album
│   │   ├── explore/                 # Découverte (tendances, suggestions)
│   │   ├── feed/                    # Fil d'activité
│   │   ├── lists/                   # Listes d'albums
│   │   ├── me/                      # Profil personnel + stats
│   │   ├── search/                  # Résultats de recherche
│   │   ├── settings/                # Paramètres & favoris
│   │   ├── track-diary/[entry_id]/  # Entrée journal titre
│   │   ├── tracks/[id]/             # Page titre
│   │   └── u/[username]/            # Profil public + followers/following
│   ├── components/
│   │   ├── album/                   # CoverImage, AlbumHero, Reviews, ImportButton…
│   │   ├── artist/                  # ArtistPageContent, ArtistAlbumsSection
│   │   ├── track/                   # TrackReviewSection, TrackSearchForDiary…
│   │   ├── user/                    # UserCard, FollowersList, FollowingList…
│   │   ├── feed/cards/              # Cartes du feed par type d'événement
│   │   ├── explore/                 # TrendingSection, DiscoverCard, PourToiSection…
│   │   ├── lists/                   # ListCard, ListSwitcher, AddToListButton
│   │   ├── profile/                 # ProfileHeader, ProfileTabs, DiaryList…
│   │   ├── layout/                  # Header, BottomNav, SearchOverlay, AuthenticatedLayout…
│   │   ├── ui/                      # Toast, BottomSheet, StarRating, BackButton…
│   │   ├── auth/                    # AuthForm, UnauthCTA
│   │   ├── social/                  # FollowButton, ProfileActionsMenu
│   │   ├── admin/                   # AdminSpotifyEdit, AdminRefreshCover
│   │   ├── legal/                   # LegalSection, LegalPageShell
│   │   ├── background/              # NavigationTracker, ServiceWorkerRegistration…
│   │   ├── onboarding/              # OnboardingFlow
│   │   ├── avatars/                 # 12 avatars SVG
│   │   └── icons/                   # Icônes custom
│   ├── lib/
│   │   ├── supabase/                # Clients Supabase (client + server + admin)
│   │   ├── AuthContext.tsx          # Contexte auth global
│   │   ├── searchRanking.ts         # computeRank + mergeAndRank
│   │   └── …
│   ├── hooks/                       # React hooks personnalisés
│   ├── types/
│   │   └── database.ts              # Types générés depuis Supabase
│   └── public/
├── supabase_migrations/             # Migrations SQL (dashboard Supabase)
│   ├── supabase_schema.sql          # Schéma complet + RLS
│   └── …                            # Migrations par feature
├── scripts/                         # generate-supabase-types.sh / .ps1
├── design/                          # Maquettes HTML du design system
├── ml/                              # Scripts Python (recommandations)
└── docs/                            # Documentation interne
```

---

## Base de données

Le schéma complet est dans [`supabase_migrations/supabase_schema.sql`](supabase_migrations/supabase_schema.sql).

**Tables principales :**

| Table | Description |
|-------|-------------|
| `profiles` | Métadonnées utilisateur (username, bio, avatar) |
| `albums` | Catalogue albums, FK → `artists` |
| `artists` | Artistes |
| `tracks` | Pistes, FK → `albums` |
| `diary_entries` | Écoutes/reviews album par user |
| `track_diary_entries` | Écoutes/reviews titre par user |
| `diary_comments` | Commentaires sur les entrées |
| `follows` | Relations sociales |
| `feed_events` | Fil d'activité (fan-out en écriture) |
| `lists` | Listes d'albums |
| `genres` | Genres musicaux (source MB + Last.fm + votes communauté) |
| `album_metadata` | Descriptions, liens streaming, stats Last.fm |
| `recommendations` | Recommandations entre users |
| `search_cache` | Cache résultats MusicBrainz (24h) |

**Vue :** `album_stats` — listeners, reviews, note moyenne par album.

### RLS

Activé sur toutes les tables. Les policies sont dans `supabase_schema.sql`. Les écritures système (fan-out feed, enrichissement) utilisent la clé service role côté serveur uniquement.

### Migrations

Les migrations s'appliquent manuellement via l'éditeur SQL du dashboard Supabase, dans cet ordre :

1. `supabase_schema.sql` — schéma de base
2. `supabase_migration_fulltext_search.sql` — recherche plein texte (nécessite `unaccent`)
3. `supabase_migration_trgm.sql` — fuzzy search via pg_trgm
4. `supabase_migration_search_cache.sql` — cache résultats MB
5. Les autres migrations par ordre de dépendance feature

### Régénérer les types TypeScript

```bash
# Unix
bash scripts/generate-supabase-types.sh

# Windows
.\scripts\generate-supabase-types.ps1
```

---

## Architecture

### Auth

Supabase Auth (email/password). Côté serveur : `getAuthUser()` via cookies SSR. Côté client : `AuthContext` avec `supabase.auth.getUser()`.

### Server Actions

Toute la logique métier est dans `frontend/app/actions/` :

```
actions/
├── diary.ts            # upsertDiaryEntry, deleteDiaryEntry, toggleDiaryLike, addComment…
├── track-diary.ts      # upsertTrackDiaryEntry, getTrackDiaryEntry…
├── feed.ts             # getMyFeed, fanoutEvent
├── profile.ts          # ensureProfile, updateProfileSettings, deleteAccount…
├── social.ts           # toggleFollow
├── lists.ts            # createList, addAlbumToList…
├── musicbrainz.ts      # search, import depuis MusicBrainz
├── metadata.ts         # enrichAlbumMetadata (genres, descriptions, liens streaming)
├── artists.ts          # getArtistMeta, getArtistReleases
├── search.ts           # searchInternal (Supabase FTS + ILIKE + fuzzy pg_trgm)
└── explore.ts          # getTrendingThisWeek, getForYouSuggestions…
```

### Recherche

Deux niveaux, toujours en deux phases (interne d'abord, MB en arrière-plan) :

- **Interne** (`searchInternal`) : full-text search Supabase (`tsvector` + `unaccent`), fallback ILIKE, fallback fuzzy pg_trgm
- **MusicBrainz** : requêtes Lucene, cache L1 mémoire 5min + L2 Supabase 24h
- **Ranking unifié** (`lib/searchRanking.ts`) : `computeRank` + `mergeAndRank` partagés entre l'overlay et `/search`

### Enrichissement albums

Déclenché via `POST /api/enrich` après import. Récupère en parallèle :
- Genres + tags depuis MusicBrainz et Last.fm
- Description depuis Last.fm, Wikipedia ou annotation MB
- Liens streaming depuis MusicBrainz url-rels, puis fallback Spotify/iTunes/Deezer

### Fan-out du feed

Modèle **fan-out en écriture** : chaque action (review, like, follow…) insère un événement dans `feed_events` pour chacun des followers. La lecture est une simple requête filtrée par `user_id`.

---

## Déploiement (Vercel)

1. Connecter le repo sur [vercel.com](https://vercel.com)
2. Définir le **Root Directory** sur `frontend`
3. Ajouter les variables d'environnement
4. Deploy

---

## Roadmap

La V1 web est en production. La prochaine étape est une **application mobile native** (React Native / Expo) qui partagera le même backend Supabase.

Voir [`docs/ROADMAP.md`](docs/ROADMAP.md) pour le détail.
