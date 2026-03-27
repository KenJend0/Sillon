# Plan beta sur 30 jours

Objectif: passer de MVP fonctionnel a beta pilotee, sans budget et sans stack operations complexe.

## Semaine 1 - Mesure minimale

1. Choisir les 6 KPIs du dashboard dans [docs/beta-dashboard.md](docs/beta-dashboard.md).
2. Decider comment les mesurer: Vercel Analytics pour les vues, Supabase ou log simple pour les evenements produit.
3. Definir les evenements minimum: `signup_completed`, `onboarding_completed`, `album_logged`, `user_followed`, `search_no_results`, `album_import_failed`.
4. Ecrire une page admin ou une requete SQL qui te donne les chiffres de la semaine.

Livrable attendu:
Un endroit unique ou lire ton funnel chaque semaine.

## Semaine 2 - QA et fiabilite

1. Rejouer toute la checklist de [docs/qa-checklist.md](docs/qa-checklist.md).
2. Corriger en priorite les P0 puis les P1.
3. Ouvrir un backlog separe `frictions beta` pour ne pas melanger features et corrections.

Livrable attendu:
Une version qui ne te fait pas honte quand quelqu'un la teste a froid.

## Semaine 3 - Retours utilisateurs gratuits

1. Faire tester l'app a 5 personnes gratuites, une par une.
2. Leur donner 4 taches: s'inscrire, trouver un album, le logger, suivre quelqu'un.
3. Noter ou elles hesitent, pas ce qu'elles disent apres coup.
4. Regrouper les frictions par theme: comprehension, recherche, import, confiance, social.

Livrable attendu:
Une liste de 5 a 10 frictions reelles observees.

## Semaine 4 - Une iteration produit nette

1. Choisir seulement 1 a 3 corrections qui attaquent le plus gros trou du funnel.
2. Rejouer la QA minimale.
3. Comparer les chiffres de la semaine avec la semaine precedente.

Livrable attendu:
Une iteration que tu peux relier a une amelioration ou a un apprentissage clair.

## Regles pendant ces 30 jours

1. Ne pas ouvrir un gros chantier infra si le funnel n'est pas encore compris.
2. Ne pas lancer 10 features en meme temps.
3. Toujours separer ce qui est suppose de ce qui est observe.
4. Chaque semaine doit produire soit une amelioration mesurable, soit un apprentissage clair.