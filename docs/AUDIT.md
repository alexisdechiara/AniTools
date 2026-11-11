# Audit de livraison AniTools

Date de référence : 11 novembre 2026 (première version le 29 juillet 2026).

## Conclusion

La roadmap fonctionnelle initiale est désormais implémentée. Le projet repose
sur Nuxt 4.6.4 et Bun 1.3.5, n'embarque plus le client GraphQL historique,
dispose d'un OAuth AniList serveur, d'une API interne à opérations fixes, de
tests Vitest/Playwright et d'une CI.

Le code est prêt pour une recette de production, mais pas pour une ouverture
sans intervention : l'application AniList, les secrets, le domaine HTTPS, les
permissions Directus et l'infrastructure de cache/rate limiting restent à
configurer. La checklist obligatoire est dans `docs/DEPLOYMENT.md`.

## État par surface

| Surface | État | Livré | Réserve principale |
| --- | --- | --- | --- |
| Authentification | Prête pour recette | Authorization Code, `state` anti-CSRF, callback serveur, cookie chiffré, rotation de clé et échec de connexion expliqué sur le login | Application AniList et secrets de production à configurer |
| Calendar | Disponible | Jour/semaine/mois avec résumé par jour, AniList, simuldubs, filtres, bascule « My list », fusion typée, mode dégradé, réponse dédupliquée | Cache et rate limit locaux au processus ; réponse de sept jours encore de 0,6 à 0,9 Mo |
| Dashboard | Bêta fonctionnelle | Huit cartes par défaut parmi vingt et une (dont « Behind », optionnelle), menu d'options par carte, retrait annulable, accueil de première visite et préférences locales | Timeline sur une page dédiée, pas dans une carte |
| Statistics | Bêta fonctionnelle | Overview, Genres, Tags, Studios, Voice Actors et Staff ; moyennes normalisées et affichées dans le format de score choisi | People borné au top 100 toutes périodes fourni par AniList |
| Rewind | Bêta fonctionnelle | Sélection annuelle, phrase d'accroche, sections en récit, genres, saisons, top/flop, sélection, temps estimé et lien de partage vers Create | Dépend de l'historique AniList, maximum 20 pages |
| Tierlist | Bêta fonctionnelle | Import, franchise, classement, JSON, PNG/JPEG/WebP, clavier/tactile, sélecteur d'anime en combobox, tiers vides compacts et bac « Unranked » collant | Rendu image dépendant du navigateur |
| Explore | Bêta fonctionnelle | Recommandations, studios, filtres, pile swipe, pagination, sélections conservées sur l'appareil avec export et ajout à « Planning » (OAuth) | Graines, studios et exclusions calculés sur la liste complète chargée ; sélections propres au navigateur (100 sélections, 1 000 titres écartés, 5 profils) |
| Timeline | Bêta fonctionnelle | Flux mensuel des mises à jour anime, épisodes consécutifs regroupés, Gantt, pagination et cache client | Maximum 5 000 activités, cache non partagé |
| Create | Bêta fonctionnelle | Cartes anime et statistiques ; story, carré, thumbnail 1200 × 630 et bannière en PNG/JPEG/WebP | Mono-image, projets non persistés |
| Podium | Bêta fonctionnelle | Top 3 animes, genres, tags et studios | Agrégations limitées à la liste chargée |
| Settings et Support | Disponible | Thème, format de score local, fuseau horaire et horloge 12/24 h, réinitialisations, état du compte et FAQ | Préférences propres au navigateur |
| Login et shell public | Disponible | OAuth, profil public, états d'erreur, navigation groupée, page 404 et page d'erreur par code HTTP, responsive, SEO et accessibilité | Assets de marque finaux à valider |

Les anciennes surfaces et API de démonstration du template Nuxt UI ont été
supprimées.

## Dépendances et exécution

### État actuel

Versions minimales déclarées dans `package.json` (qui fait foi) :

- Nuxt `4.6.4` et Nuxt UI `4.12.0`.
- Pinia `4.1.0`, Directus SDK `27.1.0`, Zod `4.6.7`.
- `@nuxtjs/robots` `7.0.2`, `@nuxtjs/sitemap` `9.1.0`, `nuxt-site-config`
  `5.0.3`, `@vueuse/nuxt` `15.0.0`.
- ESLint `10.14.0`, TypeScript `6.0.3`, vue-tsc `3.3.14`.
- Vitest `5.1.0`, `@nuxt/test-utils` `4.4.0`, `@vue/test-utils` `2.5.1`,
  `happy-dom` `21.0.4` et Playwright `1.65.0`.
- Bun `1.3.5` déclaré comme gestionnaire de paquets.
- `bun.lock` est le seul lockfile.
- `nuxt-graphql-client`, GraphQL Codegen, les fichiers `app/queries` et
  `date-fns` ont été retirés.
- `overrides` ne contient plus que deux entrées, chacune corrigeant une alerte
  connue : `node-forge` `1.4.1` (plusieurs alertes hautes, via l'outil de
  certificat du serveur de développement) et `vite` `8.3.4`
  (GHSA-587h-7wmj-h5pm). Les retirer dès que les dépendances amont embarquent
  ces versions.

Au 10 novembre 2026, `bun audit` ne signale aucune alerte haute ou critique ;
restent deux alertes modérées (`glob`, `minimatch`) et trois faibles
(`deepmerge`, `esbuild`, `serialize-javascript`), toutes transitives de
l'outillage de build, de test ou de développement. La CI exécute
`bun run audit:gate` (`scripts/audit-gate.mjs`), qui échoue sur toute alerte
haute ou critique absente de `scripts/audit-allowlist.json` ; cette liste est
vide. Rejouer la commande avant chaque livraison, car le registre évolue.

### Réserves techniques

- Le build Nitro actuel produit un serveur Node. Bun reste l'unique gestionnaire
  et lance toutes les commandes du projet, mais l'artefact `.output` requiert
  Node.js `>=22.19.0` sur l'hébergement actuel.
- Un runtime 100 % Bun nécessiterait de choisir un preset Nitro adapté à
  l'hébergeur, puis de revalider build, démarrage, routes, cookies et arrêt
  gracieux. Ce n'est pas acquis par la seule utilisation de Bun au développement.
- TypeScript 7 n'est pas adopté tant que la compatibilité Nuxt/Vue n'est pas
  validée.
- `vue-cal` reste une release candidate ; les tests Calendar et une recette
  visuelle sont requis avant chaque mise à jour.
- Le lint passe sans erreur bloquante mais conserve plusieurs centaines
  d'avertissements historiques, presque tous issus de règles de formatage ou de
  style (ordre des classes Tailwind, attributs Vue)
  (`@typescript-eslint/no-explicit-any` et `@typescript-eslint/no-unused-vars`
  sont des erreurs). Ils doivent être réduits par lots relus, sans
  `eslint --fix` global aveugle.

## Architecture AniList

Le navigateur appelle uniquement :

- `/api/anilist/profile`
- `/api/anilist/anime-collection` (liste complète, utilisée par les pages
  personnelles, dont Explore)
- `/api/anilist/statistics`
- `/api/anilist/activities`
- `/api/anilist/recommendations`
- `/api/anilist/studio-media`
- `/api/anilist/media`
- `POST /api/anilist/media-list`, l'unique écriture : ajout d'un anime à
  « Planning » depuis Explore. Elle exige une session OAuth et une requête de même
  origine, est limitée à 20 requêtes par minute et par client, refuse un corps de
  plus de 1 Ko et répond `409` si l'anime est déjà dans la liste (vérifié par une
  lecture fixe non mise en cache) ; chaque ajout coûte donc deux requêtes AniList.
- `/api/search`
- `/api/calendar`
- les routes de session et d'authentification

`/api/anilist/anime-list` et `/api/anilist/anime-list-ids` existent toujours côté
serveur mais n'ont plus d'appelant dans le client.

Les opérations GraphQL sont des constantes côté serveur. `server/utils/anilist-client.ts`
n'est plus qu'un barrel : le code est réparti dans `server/utils/anilist/`
(`constants.ts`, `documents.ts`, `schemas.ts`, `transport.ts`, `normalize.ts`,
`operations.ts`, `http.ts`) et les huit routes GET par pseudo partagent la
fabrique `defineAniListRoute` de `route.ts` (rate limit, validation, accès,
en-tête de cache, erreurs). Les variables de requête et les réponses amont
sont validées, les tailles de page et plages sont bornées, des délais sont
appliqués et les réponses `429` sont propagées proprement.

### Deux jeux de champs média

Les listes (liste paginée, collection complète, calendrier de diffusion par
pages) sélectionnent `MEDIA_LIST_FIELDS`, sans les champs réservés à la vue
détaillée ; le média unique, les médias par identifiants, les recommandations et
les médias d'un studio gardent le jeu complet `MEDIA_SUMMARY_FIELDS`. Sur une
collection publique de 631 entrées, la réponse est passée de 8,13 Mo à 4,75 Mo
(-41,6 %). La description reste dans le jeu de liste pour ne pas ajouter une
requête par survol ; le popover de détails ne charge le reste qu'à l'ouverture.

### Chargement du Calendar

Une plage froide coûte deux requêtes AniList : les identifiants de diffusion
(32 pages aliasées par requête), puis chaque anime distinct une seule fois par
lots de 200, avec un cache par anime de 30 minutes (2 000 entrées au plus)
partagé avec la recherche des médias cités par les simuldubs. Une plage chaude
n'en coûte qu'une. `/api/calendar` répond `{ media, airings, simuldubs,
warnings }` : la table `media` contient chaque anime une fois et les diffusions
le désignent par `mediaId`. Mesuré le 11 novembre 2026 sur le build de
production : 574 508 octets pour sept jours (116 animes, 117 diffusions,
Directus indisponible). Chaque objet média du jeu complet pèse encore de 5 à
10 Ko : réduire ce jeu pour le Calendar est le prochain gain.

### Quota AniList

Le budget amont est de 28 requêtes par minute et par bucket : un bucket par
utilisateur connecté, et un bucket `public` partagé par tous les visiteurs non
connectés. Ces budgets sont stockés à part des buckets de rate limiting par
visiteur, qui ne peuvent donc pas les évincer. Trois mesures le préservent :

- la liste complète passe par `MediaListCollection` par blocs de 500 entrées :
  une liste de 630 entrées coûte 2 requêtes au lieu de 13 pages de 50 ;
- les lectures identiques sont servies depuis la mémoire (1 min pour les données
  d'un utilisateur, 10 min pour le catalogue) et les requêtes simultanées
  identiques sont mutualisées ; les clés étant préfixées par l'identité, une
  écriture n'invalide que les lectures en cache de l'utilisateur qui écrit ;
- en développement, les réponses sont enregistrées sur disque et rejouées
  (`NUXT_ANILIST_DEV_CACHE`), sans aucun appel amont après le premier.

Cette architecture évite :

- l'exposition du jeton ou du secret au navigateur ;
- un proxy GraphQL arbitraire ;
- l'envoi du cookie de session à AniList depuis le client ;
- les requêtes non bornées pilotées par un visiteur.

## Authentification et sessions

Le flux livré :

1. `/auth/anilist` crée une transaction chiffrée, génère `state` et normalise le
   retour sur le même site.
2. AniList renvoie le code à `/auth/anilist/callback`.
3. Le callback consomme une seule fois la transaction, compare `state` en temps
   constant, échange le code côté serveur et charge `Viewer`.
4. Le jeton est conservé dans un cookie AES-256-GCM `HttpOnly`,
   `SameSite=Lax`, `Secure` sous HTTPS.
5. `/api/auth/session` ne renvoie que le profil et l'expiration.
6. `/api/auth/logout` contrôle l'origine et détruit la session.
7. Une session lue avec `NUXT_SESSION_PREVIOUS_PASSWORD` est rechiffrée avec la
   clé courante.

Un échec ne laisse plus le visiteur sans explication : `/auth/anilist` redirige
vers `/login?authError=unavailable` quand OAuth n'est pas configuré (ou
`rate_limited`), le callback vers `rate_limited`, `invalid_callback` ou
`exchange_failed`, et la page de login affiche un message fixe choisi selon la
raison. Les chemins de connexion ne sont jamais acceptés comme cible de retour.

Les cookies d'authentification utilisent `no-store`. AniList fournit des jetons
longue durée sans refresh token ; le produit doit accepter une reconnexion à
l'expiration ou après révocation.

Le mode profil public mémorise le pseudo AniList choisi dans le cookie
`anitools-public-profile` (`SameSite=Lax`, un an), lisible par le client. Il ne
contient qu'un pseudo déjà public, jamais de jeton : il sert uniquement à
restaurer le profil au rendu serveur après un rechargement. « Forget this
profile » et la connexion OAuth l'effacent.

## Sécurité

### Mesures présentes

- Validation Zod des entrées et réponses AniList sensibles.
- Rate limits applicatifs sur Calendar, Search, chaque endpoint AniList,
  `/auth/anilist` (20/min) et `/auth/anilist/callback` (10/min), par client.
- Plage Calendar limitée à 42 jours, caches bornés du handler (sans couche de
  cache Nitro `swr`), nouvelles tentatives réservées aux erreurs amont
  transitoires et abandon après 25 secondes.
- Schémas de requête stricts sur `/api/calendar` et `/api/search` (paramètres
  inconnus refusés) ; `Cache-Control` public sur les seuls succès, et toute
  réponse d'erreur d'une route AniList en `private, no-store`.
- Chemin de retour après connexion validé après normalisation (même site
  uniquement).
- Un `401` AniList pour un utilisateur connecté efface le cookie de session.
- En-têtes CSP, HSTS en production, anti-framing, `nosniff`, politique de
  référent et Permissions Policy.
- URLs externes validées et liens avec `noopener noreferrer`.
- Contenu externe affiché sans `v-html`.
- Cookies de session chiffrés avec séparation de contexte et rotation.
- Persistance Pinia limitée aux données non sensibles.
- Mode dégradé quand Directus est indisponible.

### Risques restant à traiter en exploitation

- Les buckets de rate limiting et caches serveur sont des `Map` en mémoire. Ils
  ne sont ni partagés entre instances, ni durables en serverless.
- L'adresse cliente repose sur les en-têtes proxy fournis à l'application. Le
  reverse proxy doit écraser les en-têtes entrants et transmettre une IP fiable.
- Une URL Directus publique n'est pas un contrôle d'accès : les permissions du
  rôle public doivent être minimales.
- Les jetons AniList donnent un accès large en l'absence de scopes. Les logs,
  traces, outils APM et dumps d'erreur doivent appliquer une redaction stricte.
- La CSP doit être revue à chaque ajout de domaine, script, média ou fournisseur
  d'images.
- Les conditions AniList interdisent d'utiliser l'API comme stockage et la
  collecte massive. L'architecture ne doit pas évoluer vers un miroir de données.

## Qualité, tests et CI

La suite versionnée couvre notamment :

- sécurité OAuth, rotation, expiration et contrôle d'origine ;
- client AniList, opérations Explore et plages d'activité ;
- validation, délais et rate limiting ;
- fusion Calendar et bornes de plage ;
- calculs Dashboard, Statistics, Rewind et Timeline ;
- modèle, classement, franchise et exports Tierlist ;
- formats et contraintes Create ;
- navigation, registre de fonctionnalités et SEO ;
- contrastes des jetons de couleur dans les deux thèmes
  (`tests/unit/theme-contrast.test.ts`, à garder vert à chaque changement de
  `main.css`) ;
- résumés de la vue Mois, filtre « My list », carte « Behind », regroupement
  des épisodes de la Timeline, sélections Explore, affichage de l'heure et
  formats de score (axes compris).

Vitest est découpé en deux projets : `unit` (Node, `tests/unit/`, fonctions
pures et utilitaires serveur) et `nuxt` (`tests/nuxt/`, stores Pinia et
composables dans un runtime Nuxt via `@nuxt/test-utils`, dont Entries,
Statistics, Rewind, Calendar, Preferences, Explore et Timeline).

Playwright (Chromium) vérifie le shell public et le login sur mobile, Tierlist
sans compte (dont le glisser-déposer et l'absence d'appel GraphQL AniList
direct depuis le navigateur), l'absence de jeton dans la session non
authentifiée, Create sans import de fichier, le Gantt de la Timeline, les pages
Dashboard, Statistics, Rewind, Podium et Explore en mode profil public avec
toutes les réponses d'API simulées dans le navigateur
(`tests/e2e/fixtures/anilist.ts`), la non-régression du passage d'un profil
public à un autre sans donnée résiduelle, et les en-têtes de sécurité (CSP de
production sans `'unsafe-eval'` en mode build). Le Calendar est couvert par
deux parcours « My list » (profil public avec réponses simulées au nouveau
format, et explication donnée à un invité). Au 11 novembre 2026, les 19 tests
passent contre le build de production ; contre le serveur de développement,
18 passent et le test de CSP de production est ignoré par construction. La CI
GitHub exécute installation figée, lint, typecheck, couverture
unitaire, `bun run audit:gate`, build, puis les tests Playwright contre le
build de production (`bun run test:e2e:build`).

La couverture ne remplace pas une recette avec un vrai compte AniList, un profil
public conséquent, Directus en panne et plusieurs tailles d'écran.

## Roadmap initiale : réalisé et limites

### Calendar

- [x] Jour, semaine et mois
- [x] Épisodes à venir
- [x] Simuldubs
- [x] Recherche et filtres
- [x] Types, validation, rate limiting et tests de fusion
- [x] Deux requêtes AniList par plage froide et réponse dédupliquée
- [x] Résumé par jour en vue Mois et bascule « My list » mémorisée localement

Réserve : la grille est rendue côté client uniquement et reste disposée dans le
fuseau du navigateur ; seules les heures imprimées suivent le réglage « Time
display ».

### Explore

- [x] Recommandations à partir des animes aimés
- [x] Titres bien notés par studio
- [x] Page, navigation, pagination et états complets
- [x] Pile swipe tactile/souris/clavier et exclusion exhaustive de la liste
- [x] Ajout à « Planning » avec une session OAuth

Réserve : AniList fournit des recommandations communautaires. Graines, studios
et exclusions sont calculés sur la collection complète chargée. Les sélections
« Interested » et les titres écartés sont conservés dans le navigateur
(`anitools:explore-picks:v1`), par identité de profil et sans fusion entre
profils, dans la limite de 100 sélections, 1 000 titres écartés et 5 profils ;
ils s'exportent en JSON ou en liens AniList. Seul l'ajout explicite à
« Planning » écrit dans la liste AniList via `POST /api/anilist/media-list`,
refuse un anime déjà présent, puis marque la liste et les statistiques comme
périmées pour qu'elles soient rechargées à la visite suivante.

### Timeline

- [x] Flux mensuel des mises à jour anime
- [x] Vue Gantt horizontale
- [x] Source AniList, pagination progressive et cache client de cinq minutes
- [x] Épisodes consécutifs d'un même anime regroupés en une carte dépliable

Réserve : garde-fou à 5 000 activités et aucun cache serveur partagé.

### Dashboard

- [x] Statistiques actuelles
- [x] Épisodes à venir
- [x] Mises à jour récentes
- [x] Animes en cours
- [x] Responsive et gestion des cartes
- [x] Menu d'options visible par carte, retrait annulable et accueil de
  première visite
- [x] Carte optionnelle « Behind » (titres `CURRENT` et `PAUSED` en retard)

Réserve : la timeline semaines/mois est une page dédiée, pas une carte. « Animes
du moment » est interprété comme les titres en cours de l'utilisateur, pas comme
les tendances mondiales.

### Statistics

- [x] Vue d'ensemble
- [x] Genres, Tags, Voice Actors, Studios et Staff
- [x] Métriques, filtres et comparaisons annuelles pour les dimensions
- [x] Tests d'agrégation
- [x] Moyennes normalisées sur 0-100 et affichées dans le format de score choisi
- [x] Cartes de graphiques rendues côté client uniquement

Réserve : Voice Actors et Staff sont le top 100 toutes périodes ordonné par
nombre de titres côté AniList. Les tris alternatifs ne portent que sur cet
échantillon. Les périodes annuelles ne s'appliquent actuellement qu'aux genres,
tags et studios et utilisent la date de complétion enregistrée sur la liste.

### Rewind

- [x] Année, top genres, top/flop, saisons, sélection et plus longue durée
- [x] Suppression des valeurs factices et aléatoires
- [x] Exclusion des simples ajouts « planning »
- [x] Page en récit avec phrase d'accroche, méthode de calcul repliée et lien
  de partage vers Create

Réserve : les épisodes et minutes sont reconstruits à partir du journal
d'activité et de la durée moyenne AniList. La collecte s'arrête après 20 pages et
signale la troncature.

### Tierlist

- [x] Tiers, import, filtres, classement et persistance
- [x] Mode franchise
- [x] Import/export JSON
- [x] PNG, JPEG et WebP
- [x] Alternatives clavier et tactile
- [x] Sélecteur d'anime en combobox clavier, tiers vides compacts et bac
  « Unranked » collant

### Create

- [x] Story, carré, thumbnail AniList 1200 × 630 et bannière
- [x] Dimensions et formats d'export
- [x] Images issues d'AniList uniquement (aucun import local), confidentialité
  et responsabilité de licence

Réserve : outil mono-image, sans calques avancés ni persistance de projet.

## UX, accessibilité et SEO

- Les grilles principales ont des variantes mobile/tablette/desktop.
- Les contrôles iconographiques modifiés ont un nom accessible.
- Dashboard et Tierlist disposent d'actions explicites en plus du
  glisser-déposer.
- Les appels distants ont des états de chargement, vide et erreur.
- Les pages personnalisées sont en `noindex`; Calendar et Tierlist alimentent le
  sitemap.
- Les en-têtes de sécurité et données structurées sont centralisés.
- Contrastes AA dans les deux thèmes et anneau de focus plein de 2 px, gardés
  par `tests/unit/theme-contrast.test.ts`.
- Une URL inconnue répond 404 et la page d'erreur adapte titre, message et
  actions au code HTTP, sans texte d'erreur brut hors développement.
- Les cartes de graphiques (unovis) et la grille du Calendar sont rendues côté
  client uniquement, avec un squelette de même taille : `/`, `/statistics`,
  `/rewind/2025`, `/podium`, `/timeline` et `/explore` répondent 200 en
  chargement direct sur le build de production (`/rewind/2025` répondait 500
  avant le 11 novembre 2026).

Limites connues de l'interface :

- les surcharges de surfaces du thème clair dans `main.css` sont écrasées par
  Nuxt UI et n'ont aucun effet aujourd'hui ;
- `/api/search` ne renvoie que l'identifiant et le titre : les résultats
  ignorent la préférence de langue des titres tant que la fiche n'est pas
  chargée ;
- la page de login signale en développement un écart d'hydratation sur le
  bouton « View profile » quand le pseudo est saisi avant l'hydratation ; le
  bouton est bien actif sur le build de production.

Actions encore manuelles :

- vérifier les parcours clavier et lecteur d'écran sur les navigateurs ciblés ;
- valider les cartes sociales, favicon et identité de marque finale ;
- décider si l'anglais reste la langue unique ou intégrer un vrai système i18n ;
- vérifier le contraste et les exports Canvas avec les assets de production.

## Priorités restantes

### P0 — avant ouverture

- [ ] Exécuter `docs/DEPLOYMENT.md`.
- [ ] Créer et configurer l'application OAuth AniList.
- [ ] Déployer en HTTPS avec les secrets de production.
- [ ] Restreindre les permissions Directus publiques.
- [ ] Faire une recette OAuth réelle et tester la panne AniList/Directus.
- [ ] Vérifier les conditions AniList et le besoin de licence commerciale.

### P1 — avant montée en charge

- [ ] Remplacer rate limits et caches en mémoire par Redis/KV ou équivalent.
- [ ] Définir redaction, métriques, alertes et budget de requêtes AniList.
- [ ] Choisir et valider le runtime Nitro cible.
- [ ] Réduire les avertissements ESLint par lots (essentiellement des règles de
  formatage).

### P2 — améliorations produit

- [ ] Proposer des périodes People si une source fiable est définie.
- [ ] Ajouter éventuellement une carte Timeline au Dashboard.
- [ ] Alléger le jeu de champs média du Calendar (5 à 10 Ko par anime).
- [ ] Faire respecter la langue des titres par `/api/search`.
- [ ] Rendre effectives ou retirer les surcharges de surfaces du thème clair.
- [ ] Ajouter sauvegarde de projets et calques à Create si le besoin est validé.
- [ ] Mettre en place l'i18n avant toute traduction globale.
