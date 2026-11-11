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
  validés et limités. `/api/calendar` répond `{ media, airings, simuldubs,
  warnings }` : chaque anime est envoyé une seule fois dans la table `media`
  (indexée par id) et chaque diffusion de `airings` le désigne par `mediaId` ;
  le client reconstruit les événements (`app/utils/calendar-events.ts`).
- `server/utils/calendar-airing.ts` : chargement d'une plage Calendar en deux
  requêtes AniList à froid (les identifiants de diffusion par pages aliasées, puis
  chaque anime distinct une fois par lots de 200), une seule à chaud grâce à un
  cache par anime de 30 minutes partagé avec la recherche des médias simuldub.
- `server/routes/auth` : redirections OAuth AniList.
- `server/utils/anilist-client.ts` : simple barrel (`export *`) conservé pour les
  imports existants. Le code vit dans `server/utils/anilist/` :
  - `constants.ts` : bornes et liste des opérations autorisées ;
  - `documents.ts` : documents GraphQL et les deux jeux de champs média ;
  - `schemas.ts` : schémas Zod des requêtes et des réponses amont ;
  - `transport.ts` : appel amont, délais, cache mémoire et budget de quota ;
  - `normalize.ts` : normalisation des réponses (statistiques, activités) ;
  - `operations.ts` : les opérations autorisées, une fonction par besoin ;
  - `http.ts` : helpers H3 (accès public ou OAuth, en-tête de cache, erreurs) ;
  - `route.ts` : `defineAniListRoute`, la fabrique des routes GET par pseudo
    (rate limit, validation, accès, cache, erreurs dans cet ordre).
- `server/utils/anilist-auth.ts` : échange OAuth et sessions chiffrées.
- `server/utils/rate-limit.ts` : limitation locale à une instance.
- `app/error.vue` : page d'erreur ; titre, message et actions dérivés du code
  HTTP, texte brut de l'erreur affiché uniquement en développement.
- `tests/unit` et `tests/e2e` : non-régressions Vitest et Playwright.
- `tests/unit/theme-contrast.test.ts` : garde-fou des jetons de couleur de
  `app/assets/css/main.css` (ratios WCAG calculés pour les deux thèmes).
- `tests/nuxt` : stores Pinia et composables testés dans un runtime Nuxt
  (`@nuxt/test-utils`).
- `scripts/audit-gate.mjs` : filtre de `bun audit` utilisé par la CI.
- `docs/AUDIT.md` : audit de livraison, limites et dette restante.
- `docs/DEPLOYMENT.md` : actions manuelles avant mise en production.

Il n'existe plus de client GraphQL dans le navigateur ni de dossier
`app/queries`. Le navigateur appelle uniquement l'API JSON interne. Ne pas
réintroduire `nuxt-graphql-client`, un endpoint recevant une requête GraphQL
arbitraire ou un accès direct à `https://graphql.anilist.co` depuis l'application.

### Deux jeux de champs média

`documents.ts` définit deux sélections, et le choix n'est pas libre :

- `MEDIA_LIST_FIELDS` (type `AniListMediaListSummary`) pour les lignes de liste :
  liste paginée, collection complète et calendrier de diffusion par pages. Il
  omet les champs réservés à la vue détaillée (idMal, classements, liens
  externes, trailer, drapeaux adulte/spoiler des tags, titres et formats des
  relations) mais garde la description, affichée par les aperçus.
- `MEDIA_SUMMARY_FIELDS` (type `AniListMediaSummary`) pour un média complet :
  média unique, médias par identifiants (dont le Calendar), recommandations et
  médias d'un studio.

Un champ dont une carte ou un calcul a besoin va dans les deux jeux ; un champ
utile à la seule vue détaillée va dans le jeu complet, et le popover de détails
le demande à l'ouverture (`app/utils/media-details.ts`). Ne jamais ajouter une
requête par survol : le budget amont partagé est plus rare que les octets.

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
- Les cartes de graphiques (unovis : `DonutChart`, `LineChart`,
  `MeanScoreBarCard`, `CountriesDonutCard` et les cartes qui les utilisent) se
  rendent uniquement dans le navigateur : Node ne peut pas importer unovis
  pendant le rendu serveur et la page répond 500. Dans une page, utiliser
  `<ClientOnly>` avec le composant `Lazy*` et un `WidgetLoadingSkeleton` de même
  taille en `#fallback`, sans import statique du composant.
- La grille du Calendar (vue-cal) est elle aussi rendue dans `<ClientOnly>` :
  elle est disposée dans le fuseau du navigateur, que le serveur ne connaît pas.
- Les moyennes de score sont agrégées sur l'échelle 0-100 d'AniList et affichées
  avec `app/utils/score-format.ts` (`formatMeanScore`, `formatScoreFromPercent`,
  `formatScoreAxisTick` pour les axes) dans le format choisi dans Settings.
  Ne jamais écrire un `%` en dur.
- Couleurs : jetons sémantiques uniquement (`text-success`, `text-muted`,
  `var(--color-medal-gold)`…). Toute modification d'un jeton de `main.css` doit
  laisser `tests/unit/theme-contrast.test.ts` vert.
- Sous `server/`, ne pas mettre de virgule dans un commentaire placé sur une
  ligne `export` : le scanner d'auto-imports de Nitro la lit comme une
  déclaration à plusieurs noms.
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
- [x] Chargement d'une plage en deux requêtes AniList à froid, une à chaud ; un
  changement de vue ne déclenche qu'une requête côté client
- [x] Réponse dédupliquée : table `media` et diffusions `airings` par `mediaId`
- [x] Vue Mois : résumé par jour (nombre d'épisodes, jusqu'à trois pastilles à
  la couleur des covers puis « +N », marque des titres de la liste quand elle
  est déjà chargée, jour courant) ; la cellule ouvre la semaine
- [x] Bascule « My list » de premier niveau (titres Watching et Planning),
  mémorisée localement dans `Preferences`, avec états chargement, erreur, vide
  et liste tronquée ; un invité obtient une explication et un lien de connexion
- [x] Heures des événements dans le fuseau et le format d'horloge choisis

Limites : caches et rate limiting sont locaux au processus ; voir
`docs/DEPLOYMENT.md` avant un déploiement multi-instance. La grille reste
disposée dans le fuseau du navigateur (seules les heures imprimées suivent le
réglage « Time display ») et n'est rendue que côté client. Une réponse de sept
jours reste lourde (voir « Limites connues »).

### Explore

- [x] Recommandations à partir des animes les mieux notés ou favoris
- [x] Découverte des titres bien notés des studios appréciés
- [x] Navigation, filtres, pagination, chargement, vide et erreur
- [x] Ajout d'un titre à « Planning » (session OAuth uniquement)
- [x] Sélections « Interested » et titres écartés conservés sur l'appareil
  (`anitools:explore-picks:v1`), par identité de profil, sans jamais fusionner
  deux profils : au plus 100 sélections, 1 000 titres écartés et 5 profils
- [x] Export local de la sélection (JSON, copie des liens AniList) et
  effacement confirmé, aussi disponible dans Settings

Limites AniList : les recommandations sont celles de la communauté AniList, pas
un modèle personnalisé. Les graines, studios et exclusions sont calculés sur la
collection complète chargée par le store Entries. Après un ajout à « Planning »,
la liste et les statistiques sont marquées périmées et rechargées à la visite
suivante. Le filtrage anime/adulte d'un studio après réponse peut raccourcir une page.

### Timeline

- [x] Flux vertical mensuel des mises à jour anime
- [x] Vue Gantt horizontale avec chargement progressif
- [x] Pagination, regroupement mensuel et cache client de cinq minutes
- [x] Épisodes consécutifs d'un même anime regroupés en une carte (plage
  d'épisodes, durée, liste dépliable au clavier des mises à jour) ;
  `mergeConsecutiveEpisodeActivities` est testé. Les statistiques mensuelles et
  la vue Gantt comptent toujours les mises à jour une à une.

Limites : garde-fou à 5 000 activités et cache uniquement en mémoire du
navigateur. La Timeline existe comme page dédiée, pas comme carte du Dashboard.

### Dashboard

- [x] Statistiques actuelles principales
- [x] Épisodes à venir
- [x] Activité récente de la liste
- [x] Animes en cours
- [x] Grille responsive
- [x] Ajout, retrait, ordre et persistance locale des cartes
- [x] Menu d'options toujours visible sur chaque carte (avancer, reculer,
  retirer) à côté de la poignée de glissement ; le retrait affiche un toast
  « Undo » qui remet la carte à sa place
- [x] Carte optionnelle « Behind » : jusqu'à cinq titres `CURRENT` ou `PAUSED`
  dont des épisodes diffusés n'ont pas été vus (`REPEATING` exclu) ; elle signale
  une liste en échec ou tronquée au lieu d'annoncer « tout est à jour »
- [x] Accueil de première visite : salutation neutre puis « Welcome back », et
  rangée « Start here » refermable (`anitools:dashboard-onboarding:v1`, remise à
  zéro avec la disposition depuis Settings)
- [x] Navigation groupée « Your list », « Tools » et « AniTools » dans
  `shared/config/features.ts`, avec un cadenas « needs a profile » sur les pages
  personnelles pour un invité

Interprétation actuelle : « animes du moment » désigne les titres en cours dans
la liste de l'utilisateur, pas un classement global de tendances.

### Statistics

- [x] Vue d'ensemble
- [x] Vues Genres, Tags, Voice Actors, Studios et Staff
- [x] Filtres de métrique
- [x] Périodes et comparaison à l'année précédente pour Genres, Tags et Studios
- [x] Agrégations testées et déterministes
- [x] Moyennes normalisées sur l'échelle 0-100 puis affichées dans le format de
  score choisi, axes des graphiques compris
- [x] Cartes de graphiques rendues côté client uniquement (chargement direct de
  la page sans erreur 500)

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
- [x] Page en récit : phrase d'accroche tirée des chiffres réels, « The year in
  numbers », top, genres et tags, saisons et statuts, temps forts, moins bien
  notés, puis la méthode de calcul repliée (`app/utils/rewind-display.ts`)
- [x] Action « Share this Rewind » (lien vers Create) et lien vers l'année
  précédente ; le lien de navigation ouvre la dernière année terminée jusqu'en
  décembre (`getDefaultRewindYear`)

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
- [x] Plateau : un tier vide se réduit à une rangée de dépôt de 56 px, le bac
  « Unranked » a un titre avec son compteur et reste collé en bas de la zone de
  défilement, la barre d'outils tient sur une rangée toujours visible
- [x] Sélecteur d'anime (`AnimePicker`) en combobox clavier : flèches, Début et
  Fin déplacent l'option active, Entrée ajoute l'option active (ou la première,
  en attendant une recherche en cours), les options (`role="option"`) ne sont
  pas des arrêts de tabulation ; le mode multiple garde les lignes ajoutées
  marquées et les annonce

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
- [x] « Time display » : fuseau horaire et horloge 12/24 h. Le fuseau par défaut
  est celui du profil AniList pour une session OAuth (s'il est valide), celui du
  navigateur sinon ; un choix explicite est conservé dans `Preferences`
- [x] Liste et réinitialisation des données locales : préférences, disposition
  du Dashboard (avec l'accueil de première visite), « Calendar: My list »,
  tier lists et sélections Explore

Le format de score est une préférence d'affichage locale (`Preferences`) ; il ne
modifie jamais le format configuré sur le compte AniList. Les conversions sont
testées dans `tests/unit/score-format.test.ts`.

### Connexion, erreurs et thème

- [x] Échec de connexion expliqué : `/auth/anilist` et son callback redirigent
  vers `/login?authError=…` (`unavailable`, `rate_limited`, `invalid_callback`,
  `exchange_failed`) et la page de login affiche un message fixe choisi selon la raison,
  sans jamais reprendre un texte venu de l'URL
- [x] Une URL qui ne correspond à aucune page répond 404 : le middleware
  d'authentification ne la redirige plus vers le login
- [x] Contrastes AA et anneau de focus plein de 2 px, vérifiés par
  `tests/unit/theme-contrast.test.ts`

## Limites connues

- Les surcharges de surfaces du thème clair dans `main.css` (`--ui-bg`,
  `--ui-bg-muted`, `--ui-bg-elevated`…) sont actuellement écrasées par Nuxt UI
  et n'ont aucun effet ; le test de contraste lit les jetons du fichier, pas le
  rendu.
- `/api/search` ne renvoie que l'identifiant et le titre : les titres des
  résultats ignorent la préférence de langue des titres tant que la fiche de
  l'anime n'est pas chargée.
- Une réponse `/api/calendar` de sept jours pèse encore de 0,6 à 0,9 Mo selon la
  semaine (574 Ko mesurés pour 116 animes le 11 novembre 2026, 0,93 Mo sur une
  semaine plus chargée) : la table `media` est dédupliquée, mais chaque objet
  média du jeu complet fait de 5 à 10 Ko.
- Les réponses publiques utilisent un cache HTTP court ; l'activité d'un
  utilisateur connecté n'est jamais stockée côté serveur et ne vit que cinq
  minutes dans l'onglet du navigateur.

## Priorités restantes

1. Exécuter la checklist manuelle de `docs/DEPLOYMENT.md`.
2. Remplacer caches et rate limits en mémoire avant le multi-instance.
3. Réduire progressivement les avertissements ESLint hérités, qui portent
   presque tous sur des règles de formatage ou de style, sans `--fix` global non relu.
4. Valider l'identité de marque, les cartes sociales et la stratégie i18n.
5. Surveiller les limites et conditions AniList, puis adapter les échantillons si
   le produit a besoin de statistiques exhaustives.
