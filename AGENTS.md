# AGENTS.md — AniTools

Ce fichier est la référence pour les agents IA qui interviennent dans ce dépôt.

## Objectif produit

AniTools transforme les données AniList d'un utilisateur en outils pratiques et visuels : calendrier de diffusion, tableau de bord, statistiques, rétrospective annuelle et tier list. Les pages publiques doivent rester utiles sans connexion. Les données privées et toute mutation AniList doivent passer par l'authentification OAuth serveur.

## Environnement et commandes

- Utiliser exclusivement Bun et conserver `bun.lock`. Ne pas créer de lockfile npm, pnpm ou Yarn.
- Utiliser Bun `>=1.3.5`. Node.js `>=22.19.0` reste requis uniquement si la cible de déploiement exécute le serveur Nuxt avec Node.
- Installation reproductible : `bun install --frozen-lockfile`
- Mise à jour des dépendances : `bun install`
- Développement : `bun run dev`
- Vérifications obligatoires avant livraison :
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build`
  - `bun audit`
- Ne jamais modifier ni commiter `.env`. Toute nouvelle variable doit être documentée dans `.env.example`.

## Architecture

- `app/pages` : routes Nuxt.
- `app/components` : composants d'interface ; placer les composants spécifiques dans un sous-dossier de fonctionnalité.
- `app/stores` : état Pinia. Ne persister que les préférences ou données non sensibles.
- `app/queries` : opérations GraphQL AniList publiques actuellement générées par `nuxt-graphql-client`.
- `server/api` : API JSON interne.
- `server/routes/auth` : redirections OAuth AniList.
- `server/utils/anilist-auth.ts` : échange OAuth et session chiffrée.
- `docs/AUDIT.md` : état du produit et ordre de priorité.

## Règles de sécurité et de données

- Ne jamais exposer le client secret AniList ni le jeton d'accès dans `runtimeConfig.public`, Pinia, le HTML, les logs ou une réponse JSON.
- Toute requête AniList authentifiée doit être effectuée côté serveur avec une opération explicitement autorisée. Ne pas créer de proxy GraphQL arbitraire.
- Conserver la validation `state` OAuth, les cookies `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS et les réponses de session en `no-store`.
- Valider les paramètres des routes serveur, limiter les plages de dates et prévoir le rate limiting avant d'exposer de nouveaux endpoints coûteux.
- Ne jamais utiliser `v-html` avec une donnée AniList ou Directus non assainie.
- Les pages `/calendar` et `/tierlist` doivent continuer à fonctionner sans compte.

## Conventions de développement

- TypeScript strict ; ne pas ajouter de nouveau `any`, `@ts-ignore` ou désactivation globale d'ESLint.
- Réutiliser les types GraphQL générés et créer des types de domaine pour le calendrier et les tier lists.
- Les grilles doivent être responsives dès le mobile et utilisables au clavier.
- Ajouter des états de chargement, vide et erreur pour chaque donnée distante.
- Ne pas réintroduire les composants et endpoints de démonstration du template Nuxt UI.
- Toute nouvelle logique de calcul (rewind, filtres, classement, calendrier) doit avoir des tests unitaires.
- Le texte de l'interface est actuellement en anglais ; ne pas mélanger les langues dans un même parcours. Préparer l'i18n avant une traduction globale.

## Checklist produit issue de la vision initiale

### Calendar

- [x] Vue jour, semaine et mois
- [x] Épisodes AniList à venir
- [x] Événements simuldub Directus
- [x] Recherche et filtres de format/langue
- [ ] Fiabiliser les types, le rate limiting et les tests de fusion d'événements

### Explore

- [ ] Recommandations basées sur les animes aimés
- [ ] Découverte d'autres animes bien notés d'un studio
- [ ] Page, navigation, états vides et pagination

### Timeline

- [ ] Concevoir la timeline d'activité
- [ ] Ajouter les vues dernières semaines et derniers mois
- [ ] Définir la source et la stratégie de cache

### Dashboard

- [x] Statistiques actuelles principales
- [x] Épisodes à venir
- [ ] Timeline des dernières semaines et des derniers mois
- [ ] Animes du moment
- [ ] Rendre la grille responsive et finaliser « Add a card »

### Statistics

- [x] Vue d'ensemble
- [ ] Finaliser les vues Genres, Tags, Voice Actors, Studios et Staff
- [ ] Ajouter les filtres de période et les comparaisons
- [ ] Ajouter les tests des agrégations

### Rewind

- [ ] Sélection de l'année
- [ ] Top 3 genres
- [ ] Top 3 animes
- [ ] Flop 3 animes
- [ ] Nombre d'animes par saison
- [ ] Anime regardé le plus longtemps
- [ ] Remplacer toutes les valeurs factices et aléatoires par des calculs annuels

### Tierlist

- [x] Création et réorganisation des tiers
- [x] Recherche et import depuis une liste AniList
- [x] Filtres et classement automatique
- [x] Persistance locale
- [ ] Terminer le mode franchise
- [ ] Export JSON
- [ ] Export image JPEG, PNG et WebP
- [ ] Accessibilité clavier et tactile complète

### Create

- [ ] Création d'images pour stories
- [ ] Création d'images carrées
- [ ] Création de badges
- [ ] Création de thumbnails AniList
- [ ] Création de bannières
- [ ] Définir les formats, gabarits, licences et règles d'export avant l'implémentation

## Ordre conseillé

1. Terminer l'intégration OAuth AniList et les requêtes authentifiées côté serveur.
2. Supprimer les restes du template et ajouter les tests/CI.
3. Rendre Dashboard, Statistics et Rewind exacts et responsives.
4. Finaliser Tierlist et ses exports.
5. Construire Explore et Timeline.
6. Concevoir le module Create après validation des formats attendus.
