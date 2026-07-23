# Sillon — Plan de lancement

> Règle : une étape à la fois, dans l'ordre. Ne pas sauter en avant.
> Bloquer une date de sortie publique avant de commencer.

---

## PHASE 1 — Renommage

- [x] Changer le nom de l'app dans `app.json` / `app.config.js` (Expo) : `"name": "Sillon"`
- [x] Changer le `slug` Expo : `"sillon-mobile"` (pas `"sillon"` seul — même convention que l'ancien `waveform-mobile`)
- [x] Changer le Bundle ID iOS : `fm.sillon.app` (`com.sillon.app` était pris chez Apple, ID unique au niveau mondial)
- [x] Changer l'Application ID Android : `fm.sillon.app`
- [x] Remplacer toutes les occurrences "Waveform" dans le code (variables, commentaires, constantes)
- [x] Mettre à jour le titre de l'onglet web (`<title>Sillon</title>`)
- [x] Mettre à jour les meta tags web (og:title, og:description)
- [x] Acheter le domaine `sillon.fm`
- [x] Rediriger l'ancien domaine vers sillon.fm si nécessaire
- [X] Créer les comptes réseaux : Instagram @sillon.fm · TikTok @sillon.fm
- [ ] Mettre à jour les liens dans l'app (CGU, contact fait — liens sociaux en attente des comptes ci-dessus)

---

## PHASE 2 — Parcours utilisateur complet

Tester chaque écran dans l'ordre, sur un vrai appareil.

### Authentification
- [ ] Inscription email — flux complet, email de confirmation reçu
- [ ] Connexion email — fonctionne après confirmation
- [ ] Connexion Google (si dispo)
- [ ] Connexion Apple (obligatoire sur iOS si d'autres logins sociaux existent)
- [ ] Mot de passe oublié — email reçu, lien fonctionnel, nouveau mdp accepté
- [ ] Déconnexion — session bien effacée
- [ ] Suppression de compte — **obligatoire pour l'App Store**, doit être accessible dans les réglages

### Onboarding
- [ ] Premier lancement : onboarding affiché
- [ ] Onboarding skippable sans bloquer l'accès
- [ ] Après onboarding : landing sur le bon écran
- [ ] Import Last.fm / RateYourMusic — flux complet testé

### Fonctionnalités principales
- [ ] Rechercher un album / artiste
- [ ] Noter un album (0 à 5 étoiles)
- [ ] Écrire une critique
- [ ] Modifier / supprimer une critique
- [ ] Ajouter à la wishlist
- [ ] Suivre un utilisateur
- [ ] Feed social — chargement, scroll infini
- [ ] Liker / commenter une critique
- [ ] Section "Pour toi" — recommandations affichées
- [ ] Fiche album complète (pochette, genres, bio, discographie)
- [ ] Fiche artiste complète
- [ ] Profil utilisateur — son propre profil
- [ ] Profil d'un autre utilisateur
- [ ] Notifications push — reçues et cliquables

### Edge cases
- [ ] Pas de connexion internet — message d'erreur propre, pas de crash
- [ ] Session expirée — redirigé vers login sans crash
- [ ] Compte sans aucun album noté — état vide géré visuellement

---

## PHASE 3 — Cohérence web / mobile

- [ ] Les données créées sur web apparaissent sur mobile (et inversement)
- [ ] Les notes et critiques sont identiques sur les deux versions
- [ ] Le feed social est synchronisé en temps réel
- [ ] Les réglages du compte (photo, pseudo, bio) se propagent partout
- [ ] Les textes UI sont cohérents (même vocabulaire sur web et mobile)

---

## PHASE 4 — Ajustements UI

> Règle stricte : seuls les bugs visuels cassants vont ici. Pas d'améliorations.

- [ ] Vérifier les écrans sur petits écrans (iPhone SE)
- [ ] Vérifier les écrans sur grands écrans (iPhone Pro Max)
- [ ] Vérifier le mode sombre si implémenté
- [ ] Vérifier les états de chargement (skeletons, spinners)
- [ ] Vérifier les états vides (aucun ami, aucun album noté)
- [ ] Vérifier les messages d'erreur (lisibles, en français)
- [ ] Vérifier le splash screen (fond crème, mark centré)
- [ ] Vérifier l'icône app sur l'écran d'accueil

---

## PHASE 5 — Sécurité

- [ ] Toutes les requêtes API passent en HTTPS
- [ ] Les tokens d'authentification ne sont pas stockés en clair
- [ ] Les routes privées API sont protégées (vérifier avec un token invalide)
- [ ] Les données d'un utilisateur ne sont pas accessibles par un autre
- [ ] Pas de clés API exposées côté client (vérifier les variables d'environnement)
- [ ] Rate limiting actif sur les endpoints sensibles (login, inscription)
- [ ] Politique de confidentialité publiée sur sillon.fm/privacy

---

## PHASE 6 — Test TestFlight

- [ ] Créer le compte Google Play Developer ($25)
- [ ] Créer l'app dans App Store Connect (Bundle ID : fm.sillon.app)
- [ ] Créer l'app dans Google Play Console
- [ ] `eas build --platform all --profile preview`
- [ ] Uploader le build iOS sur TestFlight
- [ ] S'ajouter comme testeur interne
- [ ] Installer via TestFlight et retester le parcours complet (Phase 2)
- [ ] Corriger les bugs trouvés, rebuilder si nécessaire
- [ ] Inviter les ~100 utilisateurs web comme testeurs externes TestFlight
- [ ] Recueillir les retours, corriger les bloquants uniquement

---

## PHASE 7 — Assets stores

### iOS (App Store Connect)
- [ ] Icône 1024×1024px (déjà prête)
- [ ] Screenshots iPhone 6,7" — minimum 3, idéalement 6 (obligatoire)
- [ ] Screenshots iPhone 12,9" iPad — requis pour certaines catégories
- [ ] Nom : `Sillon`
- [ ] Sous-titre : `Ton journal musical` (déjà rédigé)
- [ ] Description FR (déjà rédigée — fichier appstore-fr.md)
- [ ] Mots-clés (déjà rédigés)
- [ ] URL de support : `https://sillon.fm`
- [ ] URL politique de confidentialité : `https://sillon.fm/privacy`
- [ ] Questionnaire de classification par âge
- [ ] Questionnaire de confidentialité des données (App Privacy)

### Android (Google Play Console)
- [ ] Icône 512×512px (déjà prête)
- [ ] Feature graphic 1024×500px (bannière avec logo + nom)
- [ ] Screenshots téléphone — minimum 2
- [ ] Titre : `Sillon`
- [ ] Description courte (80 chars) : `Ton journal musical. Écoute, écris, garde.`
- [ ] Description complète (reprendre appstore-fr.md)
- [ ] Formulaire Data Safety (données collectées)
- [ ] URL politique de confidentialité : `https://sillon.fm/privacy`
- [ ] Questionnaire de classification par âge (IARC)

---

## PHASE 8 — Monitoring & infrastructure

### Sentry (crash reporting)
- [ ] Vérifier que Sentry reçoit bien des events — déclencher un crash volontaire en dev et confirmer qu'il apparaît dans le dashboard
- [ ] Vérifier que le DSN utilisé est bien celui du bon projet Sentry (pas un projet de test)
- [ ] Vérifier que les environnements sont distincts (`development` vs `production`)
- [ ] Activer les alertes email sur Sentry pour tout crash en production
- [ ] Vérifier que le source mapping est configuré (pour lire les stack traces lisibles)

### PostHog (product analytics)
- [ ] Créer un compte PostHog (tier gratuit : 1M events/mois)
- [ ] Installer le SDK : `npx expo install posthog-react-native`
- [ ] Initialiser PostHog avec la clé de projet dans `App.tsx`
- [ ] Implémenter le tracking des events clés :
  - `account_created` / `account_deleted`
  - `album_rated`, `review_written`, `review_deleted`
  - `friend_followed`
  - `onboarding_completed` / `onboarding_skipped`
  - `recommendation_clicked`
  - `import_lastfm` / `import_rym`
- [ ] Tester que les events apparaissent dans le dashboard PostHog
- [ ] Connecter PostHog à la page admin existante si pertinent

### Infrastructure
- [ ] Vérifier Redis Upstash — connexion active, pas de clés expirées, quotas OK
- [ ] Vérifier les limites du plan Upstash par rapport au trafic attendu au lancement
- [ ] Tester la latence Redis en production (pas seulement en dev)

### Rotation des clés API — à faire en DERNIER avant soumission
- [ ] Lister toutes les clés API utilisées ( Upstash, services tiers, etc.)
- [ ] Régénérer chaque clé dans l'interface du service concerné
- [ ] Mettre à jour les variables d'environnement en production
- [ ] Mettre à jour les secrets EAS (`eas secret:push`)
- [ ] Vérifier que l'app fonctionne toujours après rotation
- [ ] Révoquer les anciennes clés
- SEO partage

---

## PHASE 10 — Build production & soumission

- [ ] `eas build --platform all --profile production`
- [ ] Vérifier que les deux builds s'installent correctement
- [ ] Soumettre iOS via App Store Connect (bouton "Soumettre pour examen")
- [ ] Soumettre Android via Google Play Console (track Production)
- [ ] Attendre la validation Apple (1-7 jours)
- [ ] Attendre la validation Google (1-3 jours)
- [ ] Prévoir une date de lancement public après validation

---

## PHASE 11 — Lancement

- [ ] Fixer une date publique (idéalement un mardi ou mercredi)
- [ ] Rédiger l'email aux utilisateurs web (objet : "Sillon est sur iOS & Android")
- [ ] Préparer les posts réseaux sociaux (3 posts planifiés)
- [ ] Préparer la page ProductHunt
- [ ] Jour J — 9h : envoyer l'email
- [ ] Jour J — 10h : publier sur tous les réseaux
- [ ] Jour J — après-midi : soumettre sur ProductHunt
- [ ] Répondre à chaque commentaire / avis store les 7 premiers jours

---

## CE QUI N'EST PAS DANS CE PLAN

Tout ce qui suit est pour la v1.1, pas pour le lancement :
- Animations supplémentaires
- Nouvelles fonctionnalités
- Redesign de sections existantes
- Optimisations de performance non bloquantes
- Intégrations tierces supplémentaires

---

*Dernière mise à jour : juillet 2026*
