# Waveform — Roadmap

---

## Beta → Lancement public

Ce qui doit être fait *avant* de dire "V1". Must-haves, pas des features.

### Légal & conformité
- [x] Pages légales (CGU, Politique de confidentialité, Mentions légales)
- [x] FAQ (usage, compte & données, droits musicaux)
- [x] Page hub `/legal` accessible depuis le hamburger menu
- [x] Liens CGU + confidentialité cliquables sur la page d'inscription
- [ ] Bandeau consentement analytics (Vercel Analytics — données agrégées, à évaluer si nécessaire)
- [ ] Export des données utilisateur sur demande (dump JSON diary) — DSAR RGPD

### Onboarding
- [ ] Flow post-inscription : avatar + 3 albums favoris + follow des suggestions
- [ ] State "feed vide" amélioré avec CTA pour suivre des gens / logger un album

### Notifications
- [ ] Page/composant notifications (la table DB et la logique existent déjà)
- [ ] Types à afficher : like, commentaire, follow, recommandation

### UX & pages
- [ ] Refaire `/add` en une seule page unifiée (log + save avec toggle)
- [ ] Améliorer la recherche (pochette + artiste visible direct, recherche users)
- [ ] Pages 404 custom pour albums/artistes non importés (actuellement erreur rouge)
- [ ] Pages d'erreur custom (`not-found.tsx`, `error.tsx`, `global-error.tsx`)

### Fiabilité
- [ ] Reset password — tester le flow complet `/auth/reset`
- [ ] Pagination curseur sur le feed (`.limit(100)` actuel casse au-delà)
- [ ] Rate limiting sur `/api/*` (Upstash Redis ou Vercel Edge Config)

### SEO & partage
- [ ] `generateMetadata` sur les pages dynamiques (albums, artistes, profils, reviews)
- [ ] `robots.txt` — bloquer `/api/*`, `/settings/*`, `/me/*`
- [ ] OG images dynamiques pour les reviews (partage Twitter/Discord)

---

## V1 — Produit complet

Ce qui rend l'app vraiment utilisable au quotidien.

### Feed & social
- [ ] Agrégation des événements — *"Mehdi, Camille et 8 autres ont aimé GUTS"* (groupBy album + event_type + time_window)
- [ ] Liens streaming sur les pages album (Spotify, Apple Music, Deezer via MusicBrainz external URLs)
- [ ] Optimistic UI sur like / follow (supprimer le lag visible)
- [ ] Activité réseau sur les pages album — qui dans tes abonnements l'a écouté

### Discovery & Explore
- [ ] Section "Pour toi" — albums bien notés par les gens que tu suis (collaborative filtering simple, pas de ML)
- [ ] Enrichissement pages artiste/album — genres et biographies via Last.fm API (gratuite)

### Profils & stats
- [ ] Stats complètes sur le profil public (note moyenne, distribution, top artistes)
- [ ] Statuts d'écoute : "Envie d'écouter" / "En cours" / "Écouté"

### Import & données
- [ ] Import historique Last.fm (le vrai onboarding des music nerds)

---

## V2 — Croissance & profondeur

Une fois que tu as des utilisateurs actifs et de la donnée.

- [ ] Recommandations ML — matrix factorization (SVD/ALS) ou user-based CF sur ratings + follows + saves
- [ ] Listes thématiques — *"Best of 2024"*, *"Albums pluvieux"* (contenu UGC à la Letterboxd)
- [ ] Stats avancées — graphes par année / genre / artiste, distribution des notes
- [ ] Design system complet — refonte visuelle cohérente, dark/light mode
- [ ] Pages artiste enrichies — discographie complète, membres, liens entre artistes
- [ ] Profils "critiques" — score de crédibilité basé sur cohérence des notes et ancienneté
- [ ] Notifications email intelligentes — opt-in, fréquence hebdo max (Resend ou Postmark)
- [ ] Monitoring erreurs — Sentry côté client + serveur

---

## Fait ✓

- [x] Feed social avec infinite scroll
- [x] Diary (log, note, avis, public/privé)
- [x] Wishlist / albums sauvegardés
- [x] Profils publics + abonnements
- [x] Explore (trending semaine + récemment ajoutés)
- [x] Recherche albums + artistes (MusicBrainz)
- [x] Recommandations entre utilisateurs
- [x] Import albums depuis MusicBrainz
- [x] Likes et commentaires sur les reviews
- [x] Top 3 albums favoris
- [x] Paramètres profil (avatar, bio, username — modifiable 1 fois)
- [x] Suppression de compte
- [x] Confirmation email à l'inscription
- [x] Vercel Analytics
- [x] Pages légales + FAQ
- [x] Email de contact : waveform.contact@proton.me
