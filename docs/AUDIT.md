# Audit de livraison AniTools

Date de référence : 29 juillet 2026.

## Conclusion

La roadmap fonctionnelle initiale est désormais implémentée. Le projet repose
sur Nuxt 4.5.1 et Bun 1.3.5, n'embarque plus le client GraphQL historique,
dispose d'un OAuth AniList serveur, d'une API interne à opérations fixes, de
tests Vitest/Playwright et d'une CI.

Le code est prêt pour une recette de production, mais pas pour une ouverture
sans intervention : l'application AniList, les secrets, le domaine HTTPS, les
permissions Directus et l'infrastructure de cache/rate limiting restent à
configurer. La checklist obligatoire est dans `docs/DEPLOYMENT.md`.

## État par surface

| Surface | État | Livré | Réserve principale |
| --- | --- | --- | --- |
| Authentification | Prête pour recette | Authorization Code, `state` anti-CSRF, callback serveur, cookie chiffré et rotation de clé | Application AniList et secrets de production à configurer |
| Calendar | Disponible | Jour/semaine/mois, AniList, simuldubs, filtres, fusion typée, mode dégradé | Cache et rate limit locaux au processus |
| Dashboard | Bêta fonctionnelle | Huit cartes responsives, ajout/retrait/ordre et préférences locales | Timeline sur une page dédiée, pas dans une carte |
| Statistics | Bêta fonctionnelle | Overview, Genres, Tags, Studios, Voice Actors et Staff | People borné au top 100 toutes périodes fourni par AniList |
| Rewind | Bêta fonctionnelle | Sélection annuelle, genres, saisons, top/flop, sélection et temps estimé | Dépend de l'historique AniList, maximum 20 pages |
| Tierlist | Bêta fonctionnelle | Import, franchise, classement, JSON, PNG/JPEG/WebP, clavier/tactile | Rendu image dépendant du navigateur |
| Explore | Bêta fonctionnelle | Recommandations, studios, filtres, pile swipe et pagination | Graines et studios calculés sur 50 entrées ; sélection « Interested » locale |
| Timeline | Bêta fonctionnelle | Flux mensuel des mises à jour anime, Gantt, pagination et cache client | Maximum 5 000 activités, cache non partagé |
| Create | Bêta fonctionnelle | Story, carré, thumbnail 1200 × 630 et bannière en PNG/JPEG/WebP | Mono-image, projets non persistés |
| Login et shell public | Disponible | OAuth, profil public, états d'erreur, responsive, SEO et accessibilité | Assets de marque finaux à valider |

Les anciennes surfaces et API de démonstration du template Nuxt UI ont été
supprimées.

## Dépendances et exécution

### État actuel

- Nuxt `4.5.1` et Nuxt UI `4.10.0`.
- Pinia `4.0.2`, Directus SDK `23.0.0`, Zod `4.4.3`.
- ESLint `10.8.0`, TypeScript `6.0.3`, vue-tsc `3.3.8`.
- Vitest `4.1.10` et Playwright `1.62.0`.
- Bun `1.3.5` déclaré comme gestionnaire de paquets.
- `bun.lock` est le seul lockfile.
- `nuxt-graphql-client`, GraphQL Codegen et les fichiers `app/queries` ont été
  retirés.
- Des overrides bornent plusieurs dépendances transitives ; ils doivent être
  réévalués lors des montées de version.

Le dernier audit effectué sur cette branche ne signalait aucune vulnérabilité
connue. `bun audit` doit néanmoins être rejoué dans la CI et avant chaque
livraison, car le registre évolue.

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
  d'avertissements historiques. Ils doivent être réduits par lots relus, sans
  `eslint --fix` global aveugle.

## Architecture AniList

Le navigateur appelle uniquement :

- `/api/anilist/profile`
- `/api/anilist/anime-list`
- `/api/anilist/statistics`
- `/api/anilist/activities`
- `/api/anilist/recommendations`
- `/api/anilist/studio-media`
- `/api/anilist/media`
- `/api/search`
- `/api/calendar`
- les routes de session et d'authentification

Les opérations GraphQL sont des constantes côté serveur dans
`server/utils/anilist-client.ts`. Les variables de requête et les réponses amont
sont validées, les tailles de page et plages sont bornées, des délais sont
appliqués et les réponses `429` sont propagées proprement.

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

Les cookies d'authentification utilisent `no-store`. AniList fournit des jetons
longue durée sans refresh token ; le produit doit accepter une reconnexion à
l'expiration ou après révocation.

## Sécurité

### Mesures présentes

- Validation Zod des entrées et réponses AniList sensibles.
- Rate limits applicatifs sur Calendar, Search et chaque endpoint AniList.
- Plage Calendar limitée à 42 jours, caches bornés, délais et tentatives bornées.
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
- navigation, registre de fonctionnalités et SEO.

Playwright vérifie le shell public, le login, Calendar, Tierlist et l'absence
d'appel GraphQL AniList direct depuis le navigateur. La CI GitHub exécute
installation figée, lint, typecheck, couverture unitaire, audit, build et E2E.

La couverture ne remplace pas une recette avec un vrai compte AniList, un profil
public conséquent, Directus en panne et plusieurs tailles d'écran.

## Roadmap initiale : réalisé et limites

### Calendar

- [x] Jour, semaine et mois
- [x] Épisodes à venir
- [x] Simuldubs
- [x] Recherche et filtres
- [x] Types, validation, rate limiting et tests de fusion

### Explore

- [x] Recommandations à partir des animes aimés
- [x] Titres bien notés par studio
- [x] Page, navigation, pagination et états complets
- [x] Pile swipe tactile/souris/clavier et exclusion exhaustive de la liste

Réserve : AniList fournit des recommandations communautaires. Les graines et
studios reposent sur les 50 entrées de liste détaillées, tandis que les exclusions
parcourent toute la collection AniList. La sélection « Interested » reste locale
à la session Explore et ne modifie pas la liste AniList.

### Timeline

- [x] Flux mensuel des mises à jour anime
- [x] Vue Gantt horizontale
- [x] Source AniList, pagination progressive et cache client de cinq minutes

Réserve : garde-fou à 5 000 activités et aucun cache serveur partagé.

### Dashboard

- [x] Statistiques actuelles
- [x] Épisodes à venir
- [x] Mises à jour récentes
- [x] Animes en cours
- [x] Responsive et gestion des cartes

Réserve : la timeline semaines/mois est une page dédiée, pas une carte. « Animes
du moment » est interprété comme les titres en cours de l'utilisateur, pas comme
les tendances mondiales.

### Statistics

- [x] Vue d'ensemble
- [x] Genres, Tags, Voice Actors, Studios et Staff
- [x] Métriques, filtres et comparaisons annuelles pour les dimensions
- [x] Tests d'agrégation

Réserve : Voice Actors et Staff sont le top 100 toutes périodes ordonné par
nombre de titres côté AniList. Les tris alternatifs ne portent que sur cet
échantillon. Les périodes annuelles ne s'appliquent actuellement qu'aux genres,
tags et studios et utilisent la date de complétion enregistrée sur la liste.

### Rewind

- [x] Année, top genres, top/flop, saisons, sélection et plus longue durée
- [x] Suppression des valeurs factices et aléatoires
- [x] Exclusion des simples ajouts « planning »

Réserve : les épisodes et minutes sont reconstruits à partir du journal
d'activité et de la durée moyenne AniList. La collecte s'arrête après 20 pages et
signale la troncature.

### Tierlist

- [x] Tiers, import, filtres, classement et persistance
- [x] Mode franchise
- [x] Import/export JSON
- [x] PNG, JPEG et WebP
- [x] Alternatives clavier et tactile

### Create

- [x] Story, carré, thumbnail AniList 1200 × 630 et bannière
- [x] Dimensions et formats d'export
- [x] Contraintes d'import, confidentialité et responsabilité de licence

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
- [ ] Réduire les avertissements ESLint par lots.

### P2 — améliorations produit

- [ ] Rendre les graines et studios Explore exhaustifs si l'API et le quota le permettent.
- [ ] Proposer des périodes People si une source fiable est définie.
- [ ] Ajouter éventuellement une carte Timeline au Dashboard.
- [ ] Ajouter sauvegarde de projets et calques à Create si le besoin est validé.
- [ ] Mettre en place l'i18n avant toute traduction globale.
