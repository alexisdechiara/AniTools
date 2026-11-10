# AGENTS.md — AniTools

Ce fichier est la référence pour les agents IA qui interviennent dans ce dépôt.

## Objectif produit

AniTools transforme les données AniList d'un utilisateur en outils pratiques et
visuels : calendrier de diffusion, tableau de bord, statistiques, rétrospective
annuelle, découverte, timeline, podium, tier list et studio de création.

`/calendar`, `/tierlist`, `/create`, `/settings` et `/support` doivent rester
utiles sans compte. Les
surfaces personnalisées acceptent soit une session OAuth, soit un profil AniList
public. Les données privées et les mutations AniList (aujourd'hui l'unique ajout
à « Planning » depuis Explore, et toute mutation future) doivent toujours passer
par le serveur.

## Environnement et commandes

- Utiliser exclusivement Bun et conserver `bun.lock`.
- Ne jamais créer de `package-lock.json`, `pnpm-lock.yaml` ou lockfile Yarn.
- Utiliser Bun `>=1.3.5`.
- Node.js `>=22.19.0` est requis pour le développement, les tests navigateur et
  l'artefact Nitro `node-server` : la CLI Nuxt s'exécute sur Node même lancée via
  Bun, et `bun run dev` échoue au démarrage sous Node 22.13 (`nuxt-site-config`
  5). Les commandes du dépôt restent des commandes Bun.
- Installation reproductible : `bun install --frozen-lockfile`
- Mise à jour des dépendances : `bun install`
- Développement : `bun run dev`
- Tests unitaires : `bun run test:unit` (projets Vitest `unit` et `nuxt`) ;
  `bun run test:nuxt` pour le seul projet `nuxt`
- Tests navigateur : `bun run test:e2e` (serveur de développement) ou
  `bun run test:e2e:build` (build puis serveur de production, comme la CI)
- Vérifications obligatoires avant livraison :
  - `bun run check` (enchaîne lint, typecheck, tests unitaires et build)
  - `bun run test:e2e` si une surface utilisateur est modifiée
  - `bun run audit:gate` (échoue sur une alerte haute ou critique absente de
    `scripts/audit-allowlist.json`)
- Ne jamais modifier ni commiter `.env`. Toute nouvelle variable doit être
  documentée dans `.env.example` et `docs/DEPLOYMENT.md`.

## Architecture

- `app/pages` : routes Nuxt.
- `app/components` : composants d'interface, organisés par fonctionnalité quand
  ils sont spécifiques.
- `app/composables` : orchestration des chargements et de l'état d'interface.
- `app/stores` : état Pinia. Ne persister que des préférences ou données non
  sensibles.
- `app/utils` : calculs de domaine testables (Calendar, Rewind, Statistics,
  Tierlist, Explore, Timeline et Create).
- `shared/types/anilist.ts` : contrats AniList partagés entre client et serveur.
- `shared/config/features.ts` : accès, navigation, indexation et statut des
  surfaces produit.
- `server/api/anilist` : endpoints JSON AniList à opérations fixes, dont une
  seule écriture, `media-list.post.ts` (ajout à « Planning »).
- `server/api/calendar.get.ts` et `server/api/search.get.ts` : endpoints publics
  validés et limités.
- `server/routes/auth` : redirections OAuth AniList.
- `server/utils/anilist-client.ts` : opérations GraphQL autorisées, validation
  des réponses, délais et protection du quota amont.
- `server/utils/anilist-auth.ts` : échange OAuth et sessions chiffrées.
- `server/utils/rate-limit.ts` : limitation locale à une instance.
- `tests/unit` et `tests/e2e` : non-régressions Vitest et Playwright.
- `tests/nuxt` : stores Pinia et composables testés dans un runtime Nuxt
  (`@nuxt/test-utils`).
- `scripts/audit-gate.mjs` : filtre de `bun audit` utilisé par la CI.
- `docs/AUDIT.md` : audit de livraison, limites et dette restante.
- `docs/DEPLOYMENT.md` : actions manuelles avant mise en production.

Il n'existe plus de client GraphQL dans le navigateur ni de dossier
`app/queries`. Le navigateur appelle uniquement l'API JSON interne. Ne pas
réintroduire `nuxt-graphql-client`, un endpoint recevant une requête GraphQL
arbitraire ou un accès direct à `https://graphql.anilist.co` depuis l'application.

## Règles de sécurité et de données

- Ne jamais exposer le client secret AniList ou le jeton d'accès dans
  `runtimeConfig.public`, Pinia, le HTML, les logs ou une réponse JSON.
- Ajouter chaque besoin AniList comme une opération serveur explicitement
  autorisée et typée. Ne jamais créer de proxy GraphQL générique.
- Toute écriture AniList exige une session OAuth et un contrôle de même origine,
  n'écrase jamais une entrée existante sans action explicite de l'utilisateur
  (l'ajout actuel répond `409` si l'anime est déjà dans la liste) et n'invalide
  que le cache de l'utilisateur qui écrit.
- Conserver la validation `state` OAuth, le retour limité au même site, les
  cookies chiffrés `HttpOnly`, `SameSite=Lax`, `Secure` sous HTTPS et les réponses
  d'authentification en `no-store`.
- Conserver la séparation cryptographique entre transaction OAuth et session,
  ainsi que la rotation par `NUXT_SESSION_PREVIOUS_PASSWORD`.
- Valider tous les paramètres serveur avec des bornes strictes, appliquer un
  délai aux appels amont et un rate limiting aux endpoints coûteux.
- Ne jamais utiliser `v-html` avec une donnée AniList ou Directus non assainie.
- Ne jamais persister de secret dans `localStorage`.
- Filtrer les contenus adultes sur les surfaces qui ne les proposent pas.
- En multi-instance ou serverless, remplacer les caches et rate limits en mémoire
  par un stockage partagé avant d'augmenter le trafic.

## Conventions de développement

- TypeScript strict : ne pas ajouter de nouveau `any`, `@ts-ignore` ou
  désactivation globale d'ESLint. `any` explicite et variables inutilisées sont
  des erreurs de lint.
- Tester la logique des stores, composables et middlewares dans `tests/nuxt/` ;
  `tests/unit/` reste réservé aux fonctions pures et utilitaires serveur.
- Réutiliser les types partagés et créer des types de domaine pour les calculs.
- Toute donnée distante doit avoir des états de chargement, vide et erreur.
- Les grilles doivent être responsives dès le mobile, utilisables au clavier et
  ne pas dépendre uniquement du glisser-déposer ou du survol.
- Toute nouvelle logique de calcul ou de classement doit avoir des tests
  unitaires déterministes.
- Ne pas réintroduire les composants, routes ou données factices du template
  Nuxt UI.
- L'interface est actuellement en anglais. Ne pas mélanger les langues dans un
  même parcours ; préparer une vraie couche i18n avant une traduction globale.
- Respecter les conditions AniList : pas de sauvegarde de l'API, pas de collecte
  massive et validation de la licence avant tout usage commercial.

## Checklist produit issue de la vision initiale

### Calendar

- [x] Vue jour, semaine et mois
- [x] Épisodes AniList à venir
- [x] Événements simuldub Directus avec mode dégradé
- [x] Recherche et filtres de format/langue
- [x] Types de domaine stricts et fusion d'événements testée
- [x] Plage bornée, délais, retries, caches bornés et rate limiting

Limite : caches et rate limiting sont locaux au processus ; voir
`docs/DEPLOYMENT.md` avant un déploiement multi-instance.

### Explore

- [x] Recommandations à partir des animes les mieux notés ou favoris
- [x] Découverte des titres bien notés des studios appréciés
- [x] Navigation, filtres, pagination, chargement, vide et erreur
- [x] Ajout d'un titre à « Planning » (session OAuth uniquement)

Limites AniList : les recommandations sont celles de la communauté AniList, pas
un modèle personnalisé. Les graines, studios et exclusions sont calculés sur la
collection complète chargée par le store Entries. Après un ajout à « Planning »,
la liste et les statistiques sont marquées périmées et rechargées à la visite
suivante. Le filtrage anime/adulte d'un studio après réponse peut raccourcir une page.

### Timeline

- [x] Flux vertical mensuel des mises à jour anime
- [x] Vue Gantt horizontale avec chargement progressif
- [x] Pagination, regroupement mensuel et cache client de cinq minutes

Limites : garde-fou à 5 000 activités et cache uniquement en mémoire du
navigateur. La Timeline existe comme page dédiée, pas comme carte du Dashboard.

### Dashboard

- [x] Statistiques actuelles principales
- [x] Épisodes à venir
- [x] Activité récente de la liste
- [x] Animes en cours
- [x] Grille responsive
- [x] Ajout, retrait, ordre et persistance locale des cartes

Interprétation actuelle : « animes du moment » désigne les titres en cours dans
la liste de l'utilisateur, pas un classement global de tendances.

### Statistics

- [x] Vue d'ensemble
- [x] Vues Genres, Tags, Voice Actors, Studios et Staff
- [x] Filtres de métrique
- [x] Périodes et comparaison à l'année précédente pour Genres, Tags et Studios
- [x] Agrégations testées et déterministes

Limites AniList : Voice Actors et Staff sont des statistiques toutes périodes,
limitées au top 100 renvoyé par AniList selon le nombre de titres. Les autres tris
sont locaux à cet échantillon. Les occupations du staff sont générales et ne
représentent pas le rôle précis tenu sur chaque anime.

### Rewind

- [x] Sélection de l'année
- [x] Top 3 genres
- [x] Top 3 animes
- [x] Flop 3 animes
- [x] Nombre d'animes par saison
- [x] Sélection de l'année et anime regardé le plus longtemps
- [x] Calculs annuels déterministes sans valeurs factices ou aléatoires

Limites : le temps regardé est estimé à partir des activités AniList, de la
progression et de la durée moyenne des épisodes. L'historique est borné à
20 pages et l'interface signale une rétrospective tronquée.

### Tierlist

- [x] Création, personnalisation et réorganisation des tiers
- [x] Recherche et import depuis une liste AniList
- [x] Filtres, classement automatique et détection des plages superposées
- [x] Persistance locale versionnée
- [x] Mode franchise avec sélection d'un représentant
- [x] Import/export JSON validé
- [x] Export image JPEG, PNG et WebP
- [x] Actions clavier/tactiles alternatives au glisser-déposer

Limite : les exports sont rendus localement par le navigateur ; leur fidélité
doit rester couverte par un contrôle visuel lors d'une évolution du rendu.

### Create

- [x] Création d'images pour stories (1080 × 1920)
- [x] Création d'images carrées (1080 × 1080)
- [x] Création de thumbnails AniList (1200 × 630)
- [x] Création de bannières (1500 × 500)
- [x] Gabarits, formats PNG/JPEG/WebP et confidentialité définis (images AniList
  uniquement, aucun import local)
- [x] Carte anime avec badge de score personnel, note et genres
- [x] Carte de statistiques AniList avec états vide, chargement et erreur

Limites : studio mono-image sans sauvegarde de projet ; rendu exclusivement
local via Canvas. L'utilisateur reste responsable des licences des images
qu'il exporte. Voir `docs/CREATE.md`.

### Podium

- [x] Top 3 des animes les mieux notés
- [x] Top 3 genres, tags et studios selon le nombre, la note ou le temps

Limite : réutilise les agrégations Statistics sur la liste chargée.

### Settings et Support

- [x] Thème, format d'affichage des scores et réinitialisations locales
- [x] État du compte : OAuth, profil public ou invité
- [x] FAQ publique indexable

Le format de score est une préférence d'affichage locale (`Preferences`) ; il ne
modifie jamais le format configuré sur le compte AniList. Les conversions sont
testées dans `tests/unit/score-format.test.ts`.

## Priorités restantes

1. Exécuter la checklist manuelle de `docs/DEPLOYMENT.md`.
2. Remplacer caches et rate limits en mémoire avant le multi-instance.
3. Réduire progressivement les avertissements ESLint hérités, qui ne portent
   plus que sur des règles de formatage, sans `--fix` global non relu.
4. Valider l'identité de marque, les cartes sociales et la stratégie i18n.
5. Surveiller les limites et conditions AniList, puis adapter les échantillons si
   le produit a besoin de statistiques exhaustives.
