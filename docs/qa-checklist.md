# Checklist QA beta Sillon

Objectif: rejouer toujours les memes parcours critiques pour voir vite ce qui a casse.

Usage recommande:

1. Faire cette checklist avant une mise en production importante.
2. La rejouer apres tout changement sur auth, recherche, import, diary, feed, profil.
3. Noter `OK`, `KO`, ou `N/A` pour chaque ligne.
4. Si `KO`, ouvrir un bug avec etapes, resultat attendu, resultat observe.

## Modele de suivi

| ID | Scenario | Resultat attendu | Statut | Notes |
|---|---|---|---|---|
| AUTH-01 | Inscription email | Le compte est cree sans erreur |  |  |
| AUTH-02 | Confirmation email | Le lien confirme correctement le compte |  |  |
| AUTH-03 | Connexion | L'utilisateur arrive sur l'app connecte |  |  |
| AUTH-04 | Reset password | Le mail part et le reset fonctionne |  |  |

Tu peux conserver ce tableau tel quel dans Notion, Sheets ou Markdown.

## Parcours critiques

### Auth

| ID | Scenario | Resultat attendu |
|---|---|---|
| AUTH-01 | Creer un compte avec email valide | Compte cree, message clair, pas d'erreur console visible |
| AUTH-02 | Se connecter avec un compte existant | Redirection propre, session presente |
| AUTH-03 | Demander un reset password | Email envoye, message de confirmation lisible |
| AUTH-04 | Finaliser le reset password | Nouveau mot de passe accepte, connexion possible |
| AUTH-05 | Se deconnecter | Session supprimee, retour etat non connecte |

### Onboarding

| ID | Scenario | Resultat attendu |
|---|---|---|
| ONB-01 | Saisir un pseudo valide | Le pseudo est accepte et persiste |
| ONB-02 | Suivre au moins une suggestion | L'action est prise en compte sans recharge confuse |
| ONB-03 | Terminer l'onboarding | Arrivee claire sur l'app avec prochaine action evidente |

### Recherche et import

| ID | Scenario | Resultat attendu |
|---|---|---|
| SEARCH-01 | Rechercher un album connu | Resultats pertinents avec cover, titre, artiste |
| SEARCH-02 | Rechercher un artiste connu | Resultats artistes pertinents |
| SEARCH-03 | Rechercher un terme sans resultat | Etat vide clair, sans blocage |
| SEARCH-04 | Import auto depuis la recherche | L'album est importable sans page morte ou erreur |
| SEARCH-05 | Import depuis page artiste ou diary | L'album remonte bien dans le bon contexte |

### Diary et reviews

| ID | Scenario | Resultat attendu |
|---|---|---|
| DIARY-01 | Logger un album sans note | Entree creee dans le diary |
| DIARY-02 | Logger un album avec note | Note sauvegardee correctement |
| DIARY-03 | Ajouter une review | Texte sauvegarde et visible |
| DIARY-04 | Editer une review | La version mise a jour s'affiche partout |
| DIARY-05 | Supprimer une entree | L'entree disparait sans incoherence |
| DIARY-06 | Ouvrir la page d'une entree | Les infos associees sont coherentes |

### Feed et social

| ID | Scenario | Resultat attendu |
|---|---|---|
| FEED-01 | Voir le feed apres plusieurs actions sociales | Les cartes s'affichent sans doublons evidents |
| FEED-02 | Liker une review depuis le feed | Le like s'active instantanement ou de facon explicite |
| FEED-03 | Commenter une review depuis le feed | Le commentaire apparait sans etat casse |
| FEED-04 | Scroller le feed | Pagination fluide, pas de saut, pas de repetition |
| FEED-05 | Suivre un utilisateur depuis profil ou feed | Le statut de follow est coherent partout |

### Pages album et artiste

| ID | Scenario | Resultat attendu |
|---|---|---|
| ALBUM-01 | Ouvrir une page album existante | Hero, stats, tracks et actions visibles |
| ALBUM-02 | Ouvrir un album peu renseigne | Pas de crash, fallback propre |
| ALBUM-03 | Voir les autres albums d'un artiste | Les liens sont corrects |
| ARTIST-01 | Ouvrir une page artiste existante | Discographie lisible, compte des morceaux coherent |
| ARTIST-02 | Ouvrir un artiste incomplet | Pas de crash, fallback propre |

### Profil et settings

| ID | Scenario | Resultat attendu |
|---|---|---|
| PROFILE-01 | Ouvrir son profil | Les infos de base s'affichent correctement |
| PROFILE-02 | Modifier bio ou pseudo autorise | Les changements persistent |
| PROFILE-03 | Changer l'avatar | Upload, crop et affichage corrects |
| PROFILE-04 | Ouvrir le profil public d'un autre user | Les donnees visibles sont coherentes |
| PROFILE-05 | Supprimer son compte | Flow confirme, compte supprime proprement |

### Responsive et robustesse

| ID | Scenario | Resultat attendu |
|---|---|---|
| RESP-01 | Parcours mobile complet | Aucun blocage majeur, navigation confortable |
| RESP-02 | Parcours desktop complet | Aucun layout casse ni trou fonctionnel |
| RESP-03 | Recharger une page profonde | La page reste stable et retrouve le bon etat |
| RESP-04 | Page 404 ou erreur | Les pages d'erreur sont propres et comprensibles |

## Checklist courte avant chaque deploy

Si tu es presse, rejoue au minimum:

1. AUTH-01
2. AUTH-03
3. SEARCH-01
4. SEARCH-04
5. DIARY-02
6. DIARY-03
7. FEED-02
8. FEED-04
9. PROFILE-02
10. RESP-01

## Regle simple de priorisation des bugs

P0:
Blocage total sur inscription, connexion, import, creation diary ou lecture principale.

P1:
Le coeur du produit marche mal ou de maniere confuse, mais un contournement existe.

P2:
Bug cosmetique, incoherence mineure, ou probleme secondaire.